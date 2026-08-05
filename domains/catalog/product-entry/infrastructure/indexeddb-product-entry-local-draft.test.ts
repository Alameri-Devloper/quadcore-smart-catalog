import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  IndexedDbProductEntryLocalDraftStore,
  PRODUCT_ENTRY_LOCAL_DRAFT_DATABASE_VERSION,
  PRODUCT_ENTRY_LOCAL_DRAFT_INDEXES,
  PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE,
  upgradeProductEntryLocalDraftDatabase,
} from "../drafts/infrastructure/indexeddb-product-entry-local-draft.store";
import { ProductEntryLocalDraftStorageFailure } from "../drafts/product-entry-local-draft.store";

describe("IndexedDB Product Entry local draft adapter", () => {
  it("creates the stable object store and all scoped indexes during version-one upgrade", () => {
    const indexes: { name: string; keyPath: string | readonly string[]; unique: boolean }[] = [];
    let objectStoreName: string | null = null;
    let objectStoreKeyPath: string | null = null;
    const database = {
      createObjectStore: (name: string, options: IDBObjectStoreParameters) => {
        objectStoreName = name;
        objectStoreKeyPath = options.keyPath as string;
        return {
          createIndex: (
            indexName: string,
            keyPath: string | readonly string[],
            options?: IDBIndexParameters,
          ) => indexes.push({ name: indexName, keyPath, unique: options?.unique ?? false }),
        };
      },
    } as unknown as IDBDatabase;

    upgradeProductEntryLocalDraftDatabase(database, 0);

    assert.equal(PRODUCT_ENTRY_LOCAL_DRAFT_DATABASE_VERSION, 1);
    assert.equal(objectStoreName, PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE);
    assert.equal(objectStoreKeyPath, "storageKey");
    assert.deepEqual(
      indexes.map((index) => index.name),
      Object.values(PRODUCT_ENTRY_LOCAL_DRAFT_INDEXES).map((index) => index.name),
    );
    assert.ok(indexes.some((index) => index.name === "by-workspace-actor"));
    assert.ok(indexes.some((index) => index.name === "by-workspace-actor-mode"));
    assert.ok(indexes.some((index) => index.name === "by-create-identity"));
    assert.ok(indexes.some((index) => index.name === "by-edit-identity"));
  });

  it("does not recreate stores for an already-upgraded database", () => {
    const database = {
      createObjectStore: () => { throw new Error("must not run"); },
    } as unknown as IDBDatabase;
    assert.doesNotThrow(() => upgradeProductEntryLocalDraftDatabase(database, 1));
  });

  it("maps unavailable IndexedDB to one typed sanitized failure", async () => {
    const store = new IndexedDbProductEntryLocalDraftStore({
      indexedDB: {
        open: () => { throw new Error("provider-internal-sensitive-message"); },
      } as unknown as IDBFactory,
    });
    await assert.rejects(
      store.findCreateByIdentity({
        mode: "Create",
        workspaceId: "workspace-1",
        actorId: "actor-1",
        submissionId: "submission-1",
      }),
      (error: unknown) => {
        assert.ok(error instanceof ProductEntryLocalDraftStorageFailure);
        assert.equal(error.message, "Product Entry local draft storage is unavailable.");
        assert.equal(error.message.includes("provider-internal"), false);
        return true;
      },
    );
  });
});
