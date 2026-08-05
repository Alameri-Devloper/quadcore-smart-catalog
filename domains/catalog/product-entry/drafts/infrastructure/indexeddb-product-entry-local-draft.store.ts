import { decodeProductEntryLocalDraft } from "../product-entry-local-draft.schema";
import {
  ProductEntryLocalDraftStorageFailure,
  productEntryLocalDraftIdentityFromDraft,
  productEntryLocalDraftStorageKey,
  type ProductEntryLocalDraftStore,
} from "../product-entry-local-draft.store";
import type {
  CreateProductEntryLocalDraftIdentity,
  EditProductEntryLocalDraftIdentity,
  ProductEntryLocalDraft,
  ProductEntryLocalDraftContext,
  ProductEntryLocalDraftStoredLookup,
} from "../product-entry-local-draft.types";

export const PRODUCT_ENTRY_LOCAL_DRAFT_DATABASE_NAME = "qsc-product-entry";
export const PRODUCT_ENTRY_LOCAL_DRAFT_DATABASE_VERSION = 1;
export const PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE = "product-entry-local-drafts";

export const PRODUCT_ENTRY_LOCAL_DRAFT_INDEXES = Object.freeze({
  workspaceActor: Object.freeze({
    name: "by-workspace-actor",
    keyPath: Object.freeze(["workspaceId", "actorId"]),
  }),
  workspaceActorMode: Object.freeze({
    name: "by-workspace-actor-mode",
    keyPath: Object.freeze(["workspaceId", "actorId", "mode"]),
  }),
  createIdentity: Object.freeze({
    name: "by-create-identity",
    keyPath: Object.freeze(["workspaceId", "actorId", "mode", "submissionId"]),
  }),
  editIdentity: Object.freeze({
    name: "by-edit-identity",
    keyPath: Object.freeze([
      "workspaceId",
      "actorId",
      "mode",
      "productId",
      "baseProductRevision",
    ]),
  }),
  expiresAt: Object.freeze({ name: "by-expires-at", keyPath: "expiresAt" }),
});

export const upgradeProductEntryLocalDraftDatabase = (
  database: IDBDatabase,
  oldVersion: number,
): void => {
  if (oldVersion >= 1) return;
  const store = database.createObjectStore(PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE, {
    keyPath: "storageKey",
  });
  for (const definition of Object.values(PRODUCT_ENTRY_LOCAL_DRAFT_INDEXES)) {
    store.createIndex(definition.name, definition.keyPath, { unique: false });
  }
};

interface IndexedDbProductEntryLocalDraftStoreOptions {
  readonly indexedDB?: IDBFactory;
  readonly keyRange?: typeof IDBKeyRange;
  readonly databaseName?: string;
}

interface StoredProductEntryLocalDraft extends ProductEntryLocalDraft {
  readonly storageKey: string;
}

const sanitizedFailure = (): ProductEntryLocalDraftStorageFailure =>
  new ProductEntryLocalDraftStorageFailure();

export class IndexedDbProductEntryLocalDraftStore implements ProductEntryLocalDraftStore {
  private readonly factory: IDBFactory | undefined;
  private readonly keyRange: typeof IDBKeyRange | undefined;
  private readonly databaseName: string;
  private databasePromise: Promise<IDBDatabase> | null = null;

  constructor(options: IndexedDbProductEntryLocalDraftStoreOptions = {}) {
    this.factory = options.indexedDB ?? globalThis.indexedDB;
    this.keyRange = options.keyRange ?? globalThis.IDBKeyRange;
    this.databaseName = options.databaseName ?? PRODUCT_ENTRY_LOCAL_DRAFT_DATABASE_NAME;
  }

  async save(draft: ProductEntryLocalDraft): Promise<void> {
    const storageKey = productEntryLocalDraftStorageKey(
      productEntryLocalDraftIdentityFromDraft(draft),
    );
    await this.write((store) => {
      store.put({ ...draft, storageKey } satisfies StoredProductEntryLocalDraft);
    });
  }

  findCreateByIdentity(
    identity: CreateProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftStoredLookup> {
    return this.find(identity);
  }

  findEditByIdentity(
    identity: EditProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftStoredLookup> {
    return this.find(identity);
  }

  async deleteByIdentity(
    identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
  ): Promise<void> {
    await this.write((store) => {
      store.delete(productEntryLocalDraftStorageKey(identity));
    });
  }

  async deleteExpiredForActor(
    context: ProductEntryLocalDraftContext,
    expiredAtOrBefore: number,
  ): Promise<number> {
    if (!this.keyRange) throw sanitizedFailure();
    const database = await this.open();
    return new Promise<number>((resolve, reject) => {
      let deletedCount = 0;
      let settled = false;
      const transaction = database.transaction(PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE, "readwrite");
      const store = transaction.objectStore(PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE);
      const index = store.index(PRODUCT_ENTRY_LOCAL_DRAFT_INDEXES.workspaceActor.name);
      const request = index.openCursor(this.keyRange!.only([context.workspaceId, context.actorId]));
      request.onsuccess = () => {
        const cursor = request.result;
        if (!cursor) return;
        const decoded = decodeProductEntryLocalDraft(cursor.value);
        if (decoded.type === "Found" && decoded.draft.expiresAt <= expiredAtOrBefore) {
          cursor.delete();
          deletedCount += 1;
        }
        cursor.continue();
      };
      request.onerror = () => {
        if (!settled) {
          settled = true;
          reject(sanitizedFailure());
        }
      };
      transaction.oncomplete = () => {
        if (!settled) {
          settled = true;
          resolve(deletedCount);
        }
      };
      transaction.onerror = transaction.onabort = () => {
        if (!settled) {
          settled = true;
          reject(sanitizedFailure());
        }
      };
    });
  }

  close(): void {
    if (!this.databasePromise) return;
    void this.databasePromise.then((database) => database.close()).catch(() => undefined);
    this.databasePromise = null;
  }

  private async find(
    identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
  ): Promise<ProductEntryLocalDraftStoredLookup> {
    const value = await this.read(productEntryLocalDraftStorageKey(identity));
    return value === undefined ? { type: "NotFound" } : decodeProductEntryLocalDraft(value);
  }

  private async read(storageKey: string): Promise<unknown> {
    const database = await this.open();
    return new Promise<unknown>((resolve, reject) => {
      let settled = false;
      const transaction = database.transaction(PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE, "readonly");
      const request = transaction.objectStore(PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE).get(storageKey);
      request.onsuccess = () => {
        if (!settled) {
          settled = true;
          resolve(request.result);
        }
      };
      request.onerror = transaction.onerror = transaction.onabort = () => {
        if (!settled) {
          settled = true;
          reject(sanitizedFailure());
        }
      };
    });
  }

  private async write(action: (store: IDBObjectStore) => void): Promise<void> {
    const database = await this.open();
    return new Promise<void>((resolve, reject) => {
      let settled = false;
      const transaction = database.transaction(PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE, "readwrite");
      try {
        action(transaction.objectStore(PRODUCT_ENTRY_LOCAL_DRAFT_OBJECT_STORE));
      } catch {
        transaction.abort();
      }
      transaction.oncomplete = () => {
        if (!settled) {
          settled = true;
          resolve();
        }
      };
      transaction.onerror = transaction.onabort = () => {
        if (!settled) {
          settled = true;
          reject(sanitizedFailure());
        }
      };
    });
  }

  private open(): Promise<IDBDatabase> {
    if (!this.factory) return Promise.reject(sanitizedFailure());
    if (this.databasePromise) return this.databasePromise;
    this.databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
      let settled = false;
      let request: IDBOpenDBRequest;
      try {
        request = this.factory!.open(
          this.databaseName,
          PRODUCT_ENTRY_LOCAL_DRAFT_DATABASE_VERSION,
        );
      } catch {
        reject(sanitizedFailure());
        return;
      }
      request.onupgradeneeded = (event) => {
        try {
          upgradeProductEntryLocalDraftDatabase(
            request.result,
            (event as IDBVersionChangeEvent).oldVersion,
          );
        } catch {
          request.transaction?.abort();
        }
      };
      request.onsuccess = () => {
        if (settled) {
          request.result.close();
          return;
        }
        settled = true;
        request.result.onversionchange = () => request.result.close();
        resolve(request.result);
      };
      request.onerror = request.onblocked = () => {
        if (!settled) {
          settled = true;
          this.databasePromise = null;
          reject(sanitizedFailure());
        }
      };
    });
    return this.databasePromise;
  }
}
