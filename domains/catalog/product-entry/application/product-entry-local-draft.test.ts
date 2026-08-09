import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductEntryLocalDraftAutosaveCoordinator } from "../drafts/product-entry-local-draft.autosave";
import { ProductEntryLocalDraftController } from "../drafts/product-entry-local-draft.controller";
import { decodeProductEntryLocalDraft } from "../drafts/product-entry-local-draft.schema";
import { productEntryLocalDraftStorageKey } from "../drafts/product-entry-local-draft.store";
import {
  AcceptProductEntryLocalDraftUseCase,
  ApplyProductEntryLocalDraftLifecycleEventUseCase,
  CleanupExpiredProductEntryLocalDraftsUseCase,
  DeleteProductEntryLocalDraftUseCase,
  GetRecoverableProductEntryLocalDraftUseCase,
  PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS,
  ProductEntryLocalDraftSessionService,
  SaveProductEntryLocalDraftUseCase,
  type ProductEntrySubmissionIdAllocator,
} from "../drafts/product-entry-local-draft.use-cases";
import {
  PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS,
  PRODUCT_ENTRY_EDIT_DRAFT_RETENTION_MS,
  PRODUCT_ENTRY_LOCAL_DRAFT_CODES,
  PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS,
  PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY,
  type CreateProductEntryLocalDraftIdentity,
  type EditProductEntryLocalDraftIdentity,
  type ProductEntryLocalDraftFormState,
  type ProductEntryLocalDraftSaveInput,
  type SaveProductEntryLocalDraftResult,
} from "../drafts/product-entry-local-draft.types";
import { InMemoryProductEntryLocalDraftStore } from "../drafts/infrastructure/in-memory-product-entry-local-draft.store";

const BASE_TIME = Date.UTC(2026, 7, 4, 8);
const SHA = "a".repeat(64);

class MutableClock {
  constructor(public epoch = BASE_TIME) {}
  now(): Date { return new Date(this.epoch); }
}

class ObservedLocalDraftStore extends InMemoryProductEntryLocalDraftStore {
  deleteCalls = 0;
  failDelete = false;

  override async deleteByIdentity(
    identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity,
  ): Promise<void> {
    this.deleteCalls += 1;
    if (this.failDelete) throw new Error("storage unavailable");
    await super.deleteByIdentity(identity);
  }
}

const createIdentity = (
  overrides: Partial<CreateProductEntryLocalDraftIdentity> = {},
): CreateProductEntryLocalDraftIdentity => ({
  mode: "Create",
  workspaceId: "workspace-1",
  actorId: "actor-1",
  submissionId: "submission-1",
  ...overrides,
});

const editIdentity = (
  overrides: Partial<EditProductEntryLocalDraftIdentity> = {},
): EditProductEntryLocalDraftIdentity => ({
  mode: "Edit",
  workspaceId: "workspace-1",
  actorId: "actor-1",
  submissionId: "edit-submission-1",
  productId: "product-1",
  baseProductRevision: 4,
  ...overrides,
});

const formState = (
  overrides: Partial<ProductEntryLocalDraftFormState> = {},
): ProductEntryLocalDraftFormState => ({
  catalogId: "catalog-1",
  departmentId: "department-1",
  categoryId: "category-1",
  productTypeId: "product-type-1",
  deviceClassId: "device-class-1",
  brandId: "brand-1",
  productModelId: "model-1",
  conditionId: "new",
  availabilityStatusId: "available",
  productName: "Phone",
  productCode: "PHONE-1",
  wholesalePrice: { amountMinor: 80_00, currency: "USD" },
  retailPrice: { amountMinor: 100_00, currency: "USD" },
  isHighlighted: false,
  publicationIntent: "PublishWhenReady",
  specificationValues: [{ specificationFieldId: "ram", value: 8 }],
  ...overrides,
});

const mediaDescriptors = () => [{
  operationId: "operation-1",
  operationType: "Add" as const,
  sequence: 0,
  mediaId: null,
  requestedDisplayOrder: 0,
  selectedAsCover: true,
  expectedSourceSha256: SHA,
  expectedSourceByteLength: 123,
  finalOrder: 0,
  fileName: "phone.jpg",
  mimeType: "image/jpeg",
  sourceAvailability: PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.availableInCurrentSession,
}];

const input = (
  identity: CreateProductEntryLocalDraftIdentity | EditProductEntryLocalDraftIdentity = createIdentity(),
  name = "Phone",
): ProductEntryLocalDraftSaveInput => ({
  identity,
  formState: formState({ productName: name }),
  mediaDescriptors: mediaDescriptors(),
});

const assertSaved = <T extends SaveProductEntryLocalDraftResult>(result: T) => {
  assert.equal(result.type, "Saved");
  if (result.type !== "Saved") throw new Error("Expected Saved.");
  return result.draft;
};

const wait = (milliseconds: number) => new Promise((resolve) => setTimeout(resolve, milliseconds));

describe("Product Entry local draft application", () => {
  it("uses exact Create and Edit retention and preserves createdAt while updating updatedAt", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    const save = new SaveProductEntryLocalDraftUseCase(store, clock);
    const created = assertSaved(await save.execute(input(createIdentity())));
    assert.equal(created.expiresAt - created.updatedAt, PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS);

    clock.epoch += 12_345;
    const updated = assertSaved(await save.execute(input(createIdentity(), "Updated")));
    assert.equal(updated.createdAt, created.createdAt);
    assert.equal(updated.updatedAt, clock.epoch);
    assert.equal(updated.expiresAt - updated.updatedAt, PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS);

    const edited = assertSaved(await save.execute(input(editIdentity())));
    assert.equal(edited.expiresAt - edited.updatedAt, PRODUCT_ENTRY_EDIT_DRAFT_RETENTION_MS);
  });

  it("preserves incomplete user text for later revalidation", async () => {
    const result = await new SaveProductEntryLocalDraftUseCase(
      new InMemoryProductEntryLocalDraftStore(),
      new MutableClock(),
    ).execute({
      ...input(),
      formState: formState({ productName: "", productCode: "" }),
    });
    const saved = assertSaved(result);
    assert.equal(saved.formState.productName, "");
    assert.equal(saved.formState.productCode, "");
  });

  it("builds collision-safe exact keys from every required identity component", () => {
    const create = productEntryLocalDraftStorageKey(createIdentity());
    assert.notEqual(create, productEntryLocalDraftStorageKey(createIdentity({ workspaceId: "workspace-2" })));
    assert.notEqual(create, productEntryLocalDraftStorageKey(createIdentity({ actorId: "actor-2" })));
    assert.notEqual(create, productEntryLocalDraftStorageKey(createIdentity({ submissionId: "submission-2" })));
    const edit = productEntryLocalDraftStorageKey(editIdentity());
    assert.notEqual(edit, productEntryLocalDraftStorageKey(editIdentity({ productId: "product-2" })));
    assert.notEqual(edit, productEntryLocalDraftStorageKey(editIdentity({ baseProductRevision: 5 })));
    assert.notEqual(create, edit);
  });

  it("isolates identical submissions by Workspace and identical Products by actor", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const save = new SaveProductEntryLocalDraftUseCase(store, new MutableClock());
    await save.execute(input(createIdentity(), "Workspace One"));
    await save.execute(input(createIdentity({ workspaceId: "workspace-2" }), "Workspace Two"));
    await save.execute(input(editIdentity(), "Actor One"));
    await save.execute(input(editIdentity({ actorId: "actor-2", submissionId: "edit-2" }), "Actor Two"));
    assert.equal(store.size, 4);
  });

  it("returns expired drafts without restoring them and cleanup deletes only the scoped expired record", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    const save = new SaveProductEntryLocalDraftUseCase(store, clock);
    await save.execute(input(createIdentity()));
    await save.execute(input(createIdentity({ actorId: "actor-2", submissionId: "other" })));
    clock.epoch += PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS;
    const get = new GetRecoverableProductEntryLocalDraftUseCase(store, clock);
    assert.equal((await get.execute(createIdentity())).type, "ExpiredDraft");
    const cleanup = await new CleanupExpiredProductEntryLocalDraftsUseCase(store, clock)
      .execute({ workspaceId: "workspace-1", actorId: "actor-1" });
    assert.deepEqual(cleanup, { type: "Completed", deletedCount: 1 });
    assert.equal(store.size, 1);
  });

  it("returns Recoverable for unchanged Edit and a preserving no-merge conflict for changed revision", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    await new SaveProductEntryLocalDraftUseCase(store, clock).execute(input(editIdentity()));
    const get = new GetRecoverableProductEntryLocalDraftUseCase(store, clock);
    const recoverable = await get.execute(editIdentity(), 4);
    assert.equal(recoverable.type, "RecoverableEditDraft");
    const conflict = await get.execute(editIdentity(), 5);
    assert.deepEqual(conflict, {
      type: "RevisionConflict",
      code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.revisionConflict,
      productId: "product-1",
      baseProductRevision: 4,
      currentProductRevision: 5,
      localUpdatedAt: BASE_TIME,
    });
    assert.equal((await store.findEditByIdentity(editIdentity())).type, "Found");
  });

  it("deletes only the exact scoped draft on explicit discard", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const save = new SaveProductEntryLocalDraftUseCase(store, new MutableClock());
    const target = createIdentity();
    const foreign = createIdentity({ workspaceId: "workspace-2" });
    await save.execute(input(target));
    await save.execute(input(foreign));
    const result = await new DeleteProductEntryLocalDraftUseCase(store).execute(
      target,
      PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS.userDiscarded,
    );
    assert.deepEqual(result, { type: "Completed" });
    assert.equal((await store.findCreateByIdentity(target)).type, "NotFound");
    assert.equal((await store.findCreateByIdentity(foreign)).type, "Found");
  });

  it("preserves the exact Create draft and submissionId after completion and completed replay", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const save = new SaveProductEntryLocalDraftUseCase(store, new MutableClock());
    const target = createIdentity();
    const foreignWorkspace = createIdentity({ workspaceId: "workspace-2" });
    const foreignActor = createIdentity({ actorId: "actor-2" });
    await save.execute(input(target, "Target"));
    await save.execute(input(foreignWorkspace, "Foreign Workspace"));
    await save.execute(input(foreignActor, "Foreign Actor"));
    const before = await store.findCreateByIdentity(target);
    assert.equal(before.type, "Found");

    const lifecycle = new ApplyProductEntryLocalDraftLifecycleEventUseCase(
      new DeleteProductEntryLocalDraftUseCase(store),
    );
    assert.deepEqual(
      await lifecycle.execute(
        target,
        PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.submissionCompleted,
      ),
      { type: "Preserved" },
    );
    assert.deepEqual(
      await lifecycle.execute(
        target,
        PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.submissionCompleted,
      ),
      { type: "Preserved" },
    );

    const after = await store.findCreateByIdentity(target);
    assert.deepEqual(after, before);
    if (after.type === "Found") assert.equal(after.draft.submissionId, target.submissionId);
    assert.equal((await store.findCreateByIdentity(foreignWorkspace)).type, "Found");
    assert.equal((await store.findCreateByIdentity(foreignActor)).type, "Found");
  });

  it("preserves drafts for validation, network, Phase 1/2 retry, Phase 1 success, and revision conflict", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const identity = createIdentity();
    await new SaveProductEntryLocalDraftUseCase(store, new MutableClock()).execute(input(identity));
    const lifecycle = new ApplyProductEntryLocalDraftLifecycleEventUseCase(
      new DeleteProductEntryLocalDraftUseCase(store),
    );
    for (const event of [
      PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.validationFailed,
      PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.networkFailed,
      PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.phaseOneRetryRequired,
      PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.phaseTwoRetryRequired,
      PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.phaseOneSucceeded,
      PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.revisionConflict,
    ]) {
      assert.deepEqual(await lifecycle.execute(identity, event), { type: "Preserved" });
      assert.equal((await store.findCreateByIdentity(identity)).type, "Found");
    }
  });

  it("deletes only the exact Create draft and changes submissionId for explicit Add New Product", async () => {
    const ids = ["submission-a", "submission-b", "submission-c", "submission-d"];
    const allocator: ProductEntrySubmissionIdAllocator = { allocate: () => ids.shift()! };
    const store = new InMemoryProductEntryLocalDraftStore();
    const sessions = new ProductEntryLocalDraftSessionService(
      allocator,
      store,
    );
    const create = sessions.startCreate({ workspaceId: "workspace-1", actorId: "actor-1" })!;
    const foreignWorkspace = createIdentity({
      workspaceId: "workspace-2",
      submissionId: create.submissionId,
    });
    const foreignActor = createIdentity({
      actorId: "actor-2",
      submissionId: create.submissionId,
    });
    await new SaveProductEntryLocalDraftUseCase(store, new MutableClock()).execute(input(create));
    await new SaveProductEntryLocalDraftUseCase(store, new MutableClock())
      .execute(input(foreignWorkspace));
    await new SaveProductEntryLocalDraftUseCase(store, new MutableClock())
      .execute(input(foreignActor));
    const next = await sessions.startNewProduct(create);
    assert.deepEqual(next, { type: "Started", identity: { ...create, submissionId: "submission-b" } });
    if (next.type !== "Started") throw new Error("Expected new Product session.");
    assert.notEqual(next.identity.submissionId, create.submissionId);
    assert.equal((await store.findCreateByIdentity(create)).type, "NotFound");
    assert.equal((await store.findCreateByIdentity(foreignWorkspace)).type, "Found");
    assert.equal((await store.findCreateByIdentity(foreignActor)).type, "Found");
    const edit = sessions.startEdit(
      { workspaceId: "workspace-1", actorId: "actor-1" },
      "product-1",
      4,
    )!;
    assert.equal(edit.submissionId, "submission-c");
    const nextEdit = sessions.startEditSessionAfterCompletion(edit)!;
    assert.equal(nextEdit.submissionId, "submission-d");
    assert.notEqual(nextEdit.submissionId, edit.submissionId);
  });

  it("allocates and validates before delete so allocation failure preserves the persisted draft", async () => {
    const store = new ObservedLocalDraftStore();
    const identity = createIdentity();
    await new SaveProductEntryLocalDraftUseCase(store, new MutableClock()).execute(input(identity));
    const result = await new ProductEntryLocalDraftSessionService({ allocate: () => { throw new Error("allocation failed"); } }, store)
      .startNewProduct(identity);
    assert.deepEqual(result, { type: "Rejected", code: "SubmissionIdAllocationFailed" });
    assert.equal(store.deleteCalls, 0);
    assert.equal((await store.findCreateByIdentity(identity)).type, "Found");
  });

  it("preserves the persisted draft for invalid and unchanged candidate IDs", async () => {
    for (const scenario of [
      { candidate: "", code: "SubmissionIdInvalid" },
      { candidate: "submission-1", code: "SubmissionIdUnchanged" },
    ] as const) {
      const store = new ObservedLocalDraftStore();
      const identity = createIdentity();
      await new SaveProductEntryLocalDraftUseCase(store, new MutableClock()).execute(input(identity));
      const result = await new ProductEntryLocalDraftSessionService({ allocate: () => scenario.candidate }, store)
        .startNewProduct(identity);
      assert.deepEqual(result, { type: "Rejected", code: scenario.code });
      assert.equal(store.deleteCalls, 0);
      assert.equal((await store.findCreateByIdentity(identity)).type, "Found");
    }
  });

  it("returns StorageUnavailable and preserves the persisted draft when exact deletion fails", async () => {
    const store = new ObservedLocalDraftStore();
    const identity = createIdentity();
    await new SaveProductEntryLocalDraftUseCase(store, new MutableClock()).execute(input(identity));
    store.failDelete = true;
    const result = await new ProductEntryLocalDraftSessionService({ allocate: () => "submission-2" }, store)
      .startNewProduct(identity);
    assert.deepEqual(result, { type: "Rejected", code: "StorageUnavailable" });
    assert.equal(store.deleteCalls, 1);
    assert.equal((await store.findCreateByIdentity(identity)).type, "Found");
  });

  it("exact-deletes an Edit draft only for terminal Edit completion", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const save = new SaveProductEntryLocalDraftUseCase(store, new MutableClock());
    const target = editIdentity();
    const foreignWorkspace = editIdentity({ workspaceId: "workspace-2" });
    const foreignActor = editIdentity({ actorId: "actor-2" });
    const create = createIdentity();
    await save.execute(input(target));
    await save.execute(input(foreignWorkspace));
    await save.execute(input(foreignActor));
    await save.execute(input(create));
    const deleteDraft = new DeleteProductEntryLocalDraftUseCase(store);
    const lifecycle = new ApplyProductEntryLocalDraftLifecycleEventUseCase(deleteDraft);

    assert.deepEqual(
      await lifecycle.execute(
        target,
        PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.submissionCompleted,
      ),
      { type: "Completed" },
    );
    assert.equal((await store.findEditByIdentity(target)).type, "NotFound");
    assert.equal((await store.findEditByIdentity(foreignWorkspace)).type, "Found");
    assert.equal((await store.findEditByIdentity(foreignActor)).type, "Found");
    assert.deepEqual(
      await deleteDraft.execute(
        create,
        PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS.editSessionCompleted,
      ),
      { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.identityInvalid },
    );
    assert.equal((await store.findCreateByIdentity(create)).type, "Found");
  });

  it("autosave reuses the supplied submissionId rather than allocating identity", async () => {
    const identities: string[] = [];
    const coordinator = new ProductEntryLocalDraftAutosaveCoordinator(async (draftInput) => {
      identities.push(draftInput.identity.submissionId);
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }, { debounceMs: 0 });
    coordinator.schedule(input(createIdentity()));
    coordinator.schedule(input(createIdentity(), "Latest"));
    await coordinator.flush(createIdentity());
    assert.deepEqual(identities, ["submission-1"]);
    coordinator.dispose();
  });

  it("preserves the original Edit submissionId on every save and retry", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    const save = new SaveProductEntryLocalDraftUseCase(store, clock);
    const original = assertSaved(await save.execute(input(editIdentity())));
    clock.epoch += 1;
    const retried = assertSaved(await save.execute(input(editIdentity({
      submissionId: "must-not-replace-the-edit-session",
    }))));
    assert.equal(original.submissionId, "edit-submission-1");
    assert.equal(retried.submissionId, original.submissionId);
  });

  it("rejects binary sources, object URLs, Reference Purchase Cost, and authentication tokens", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const save = new SaveProductEntryLocalDraftUseCase(store, new MutableClock());
    for (const binary of [
      new File(["bytes"], "phone.jpg", { type: "image/jpeg" }),
      new Blob(["bytes"]),
      new ArrayBuffer(2),
      new Uint8Array([1]),
    ]) {
      const result = await save.execute({
        ...input(),
        mediaDescriptors: [{ ...mediaDescriptors()[0], source: binary }] as never,
      });
      assert.deepEqual(result, {
        type: "Rejected",
        code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.mediaSourceNotStorable,
      });
    }
    assert.equal((await save.execute({
      ...input(),
      mediaDescriptors: [{ ...mediaDescriptors()[0], previewUrl: "blob:qsc-preview" }] as never,
    })).type, "Rejected");
    const sessionMaterial = Object.fromEntries([
      [["session", "Token"].join(""), "not-storable"],
    ]);
    for (const forbidden of [
      { referencePurchaseCost: { amountMinor: 1, currency: "USD" } },
      sessionMaterial,
    ]) {
      const result = await save.execute({ ...input(), formState: { ...formState(), ...forbidden } });
      assert.deepEqual(result, {
        type: "Rejected",
        code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.forbiddenField,
      });
    }
  });

  it("restores source descriptors as RequiresReselection and ignores stale server completion fields", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    const saveResult = await new SaveProductEntryLocalDraftUseCase(store, clock).execute({
      ...input(),
      mediaDescriptors: [{ ...mediaDescriptors()[0], serverStatus: "Completed" }] as never,
    });
    const saved = assertSaved(saveResult);
    assert.equal("serverStatus" in saved.mediaDescriptors[0], false);
    const restored = await new GetRecoverableProductEntryLocalDraftUseCase(store, clock)
      .execute(createIdentity());
    assert.equal(restored.type, "RecoverableCreateDraft");
    if (restored.type === "RecoverableCreateDraft") {
      assert.equal(
        restored.draft.mediaDescriptors[0].sourceAvailability,
        PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.requiresReselection,
      );
      assert.equal(restored.revalidationRequired, true);
      assert.equal(restored.requiresExplicitAcceptance, true);
    }
  });

  it("restores Reorder and SetCover descriptors without source reselection", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    const saved = assertSaved(await new SaveProductEntryLocalDraftUseCase(store, clock).execute({
      ...input(),
      mediaDescriptors: [
        { operationId: "reorder-a", operationType: "Reorder", sequence: 0, mediaId: "media-a", requestedDisplayOrder: 0, selectedAsCover: false, expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: 0, fileName: null, mimeType: null, sourceAvailability: "NotRequired" },
        { operationId: "cover-b", operationType: "SetCover", sequence: 1, mediaId: "media-b", requestedDisplayOrder: null, selectedAsCover: true, expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: null, fileName: null, mimeType: null, sourceAvailability: "NotRequired" },
      ],
    }));
    assert.deepEqual(saved.mediaDescriptors.map((descriptor) => descriptor.operationType), ["Reorder", "SetCover"]);
    const restored = await new GetRecoverableProductEntryLocalDraftUseCase(store, clock).execute(createIdentity());
    assert.equal(restored.type, "RecoverableCreateDraft");
    if (restored.type === "RecoverableCreateDraft") {
      assert.equal(restored.draft.mediaDescriptors.every((descriptor) =>
        descriptor.sourceAvailability === PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired), true);
    }
  });

  it("maps future schema, corrupt payload, invalid identity, and cross-scope lookups safely", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const identity = createIdentity();
    store.seedUnknown(identity, { schemaVersion: 999 });
    const get = new GetRecoverableProductEntryLocalDraftUseCase(store, new MutableClock());
    assert.equal((await get.execute(identity)).type, "IncompatibleDraft");
    store.seedUnknown(identity, { schemaVersion: 1, broken: true });
    assert.equal((await get.execute(identity)).type, "CorruptDraft");
    const save = new SaveProductEntryLocalDraftUseCase(store, new MutableClock());
    assert.deepEqual(await save.execute(input(createIdentity({ actorId: "" }))), {
      type: "Rejected",
      code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.identityInvalid,
    });
    assert.deepEqual(await get.execute(createIdentity({ actorId: "" })), {
      type: "IdentityInvalid",
      code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.identityInvalid,
    });

    const cleanStore = new InMemoryProductEntryLocalDraftStore();
    await new SaveProductEntryLocalDraftUseCase(cleanStore, new MutableClock()).execute(input());
    const cleanGet = new GetRecoverableProductEntryLocalDraftUseCase(cleanStore, new MutableClock());
    assert.equal((await cleanGet.execute(createIdentity({ workspaceId: "workspace-2" }))).type, "NoDraft");
    assert.equal((await cleanGet.execute(createIdentity({ actorId: "actor-2" }))).type, "NoDraft");
  });

  it("supports deterministic version-zero migration and rejects malformed records without coercion", () => {
    const current = assertSaved({
      type: "Saved",
      draft: {
        schemaVersion: 1,
        mode: "Create",
        workspaceId: "workspace-1",
        actorId: "actor-1",
        submissionId: "submission-1",
        productId: null,
        baseProductRevision: null,
        createdAt: BASE_TIME,
        updatedAt: BASE_TIME,
        expiresAt: BASE_TIME + PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS,
        formState: formState(),
        mediaDescriptors: mediaDescriptors(),
      },
    });
    const migrated = decodeProductEntryLocalDraft({ ...current, schemaVersion: 0 });
    assert.equal(migrated.type, "Found");
    if (migrated.type === "Found") {
      assert.equal(
        migrated.draft.mediaDescriptors[0].sourceAvailability,
        PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.requiresReselection,
      );
    }
    assert.deepEqual(decodeProductEntryLocalDraft({ ...current, updatedAt: "not-a-number" }), {
      type: "Corrupt",
    });
  });

  it("requires explicit acceptance and always marks accepted state for revalidation", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    await new SaveProductEntryLocalDraftUseCase(store, clock).execute(input());
    const decision = await new GetRecoverableProductEntryLocalDraftUseCase(store, clock)
      .execute(createIdentity());
    const accept = new AcceptProductEntryLocalDraftUseCase();
    assert.deepEqual(accept.execute(decision, false), { type: "NotAccepted" });
    const accepted = accept.execute(decision, true);
    assert.equal(accepted.type, "Accepted");
    if (accepted.type === "Accepted") assert.equal(accepted.revalidationRequired, true);
  });

  it("exposes a headless Presentation contract without direct browser storage access", async () => {
    const store = new InMemoryProductEntryLocalDraftStore();
    const clock = new MutableClock();
    const deleteDraft = new DeleteProductEntryLocalDraftUseCase(store);
    const controller = new ProductEntryLocalDraftController(
      new SaveProductEntryLocalDraftUseCase(store, clock),
      new GetRecoverableProductEntryLocalDraftUseCase(store, clock),
      new AcceptProductEntryLocalDraftUseCase(),
      deleteDraft,
      new ProductEntryLocalDraftSessionService(
        { allocate: () => "next-submission" },
        store,
      ),
      0,
    );
    controller.saveDraft(input());
    assert.equal(controller.draftState, "Saving");
    await controller.flushBeforePhaseOne();
    assert.equal(controller.draftState, "Saved");
    assert.equal((await controller.checkForRecovery(createIdentity())).type, "RecoverableCreateDraft");
    assert.equal(controller.resolveRestoreDecision(true).type, "Accepted");
    const lifecycle = new ApplyProductEntryLocalDraftLifecycleEventUseCase(deleteDraft);
    assert.deepEqual(
      await lifecycle.execute(
        createIdentity(),
        PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.submissionCompleted,
      ),
      { type: "Preserved" },
    );
    assert.deepEqual(
      await lifecycle.execute(
        createIdentity(),
        PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.submissionCompleted,
      ),
      { type: "Preserved" },
    );
    assert.equal((await store.findCreateByIdentity(createIdentity())).type, "Found");
    const next = await controller.startNewProduct(createIdentity());
    assert.deepEqual(next, { type: "Started", identity: { ...createIdentity(), submissionId: "next-submission" } });
    if (next.type !== "Started") throw new Error("Expected new Product session.");
    assert.notEqual(next.identity.submissionId, createIdentity().submissionId);
    assert.equal((await store.findCreateByIdentity(createIdentity())).type, "NotFound");
    controller.dispose();
  });
});

describe("Product Entry local draft autosave", () => {
  it("debounces rapid changes and flush saves the latest immediately", async () => {
    const names: (string | null)[] = [];
    const coordinator = new ProductEntryLocalDraftAutosaveCoordinator(async (draftInput) => {
      names.push(draftInput.formState.productName);
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }, { debounceMs: 50 });
    coordinator.schedule(input(createIdentity(), "One"));
    coordinator.schedule(input(createIdentity(), "Two"));
    await coordinator.flush(createIdentity());
    assert.deepEqual(names, ["Two"]);
    coordinator.dispose();
  });

  it("serializes same-identity saves so a stale async write cannot finish after the newer save", async () => {
    let releaseFirst!: () => void;
    const firstGate = new Promise<void>((resolve) => { releaseFirst = resolve; });
    const calls: string[] = [];
    let active = 0;
    let maxActive = 0;
    const coordinator = new ProductEntryLocalDraftAutosaveCoordinator(async (draftInput) => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      const name = draftInput.formState.productName!;
      calls.push(`start:${name}`);
      if (name === "Old") await firstGate;
      calls.push(`end:${name}`);
      active -= 1;
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }, { debounceMs: 0 });
    coordinator.schedule(input(createIdentity(), "Old"));
    await wait(5);
    coordinator.schedule(input(createIdentity(), "New"));
    await wait(5);
    releaseFirst();
    await coordinator.flush(createIdentity());
    assert.equal(maxActive, 1);
    assert.deepEqual(calls, ["start:Old", "end:Old", "start:New", "end:New"]);
    coordinator.dispose();
  });

  it("allows different identities to save independently", async () => {
    let active = 0;
    let maxActive = 0;
    const coordinator = new ProductEntryLocalDraftAutosaveCoordinator(async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await wait(15);
      active -= 1;
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }, { debounceMs: 0 });
    const first = createIdentity();
    const second = createIdentity({ submissionId: "submission-2" });
    coordinator.schedule(input(first));
    coordinator.schedule(input(second));
    await Promise.all([coordinator.flush(first), coordinator.flush(second)]);
    assert.equal(maxActive, 2);
    coordinator.dispose();
  });

  it("disposal cancels pending work and no save occurs afterward", async () => {
    let calls = 0;
    const coordinator = new ProductEntryLocalDraftAutosaveCoordinator(async () => {
      calls += 1;
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }, { debounceMs: 10 });
    coordinator.schedule(input());
    coordinator.dispose();
    coordinator.schedule(input(createIdentity({ submissionId: "later" })));
    await wait(25);
    assert.equal(calls, 0);
  });

  it("visibility-hidden flush is detachable", async () => {
    const listeners = new Set<() => void>();
    const source = {
      visibilityState: "hidden",
      addEventListener: (_type: "visibilitychange", listener: () => void) => listeners.add(listener),
      removeEventListener: (_type: "visibilitychange", listener: () => void) => listeners.delete(listener),
    };
    let calls = 0;
    const coordinator = new ProductEntryLocalDraftAutosaveCoordinator(async () => {
      calls += 1;
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }, { debounceMs: 1_000 });
    coordinator.schedule(input());
    const detach = coordinator.attachVisibilityFlush(source);
    listeners.forEach((listener) => listener());
    await wait(5);
    assert.equal(calls, 1);
    detach();
    assert.equal(listeners.size, 0);
    coordinator.dispose();
  });
});
