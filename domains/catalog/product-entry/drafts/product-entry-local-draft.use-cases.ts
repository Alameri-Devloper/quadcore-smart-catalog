import type { ProductEntryClock } from "../ports/product-entry-clock.port";
import {
  ProductEntryLocalDraftInputFailure,
  prepareRestoredProductEntryLocalDraft,
  sanitizeProductEntryLocalDraftFormState,
  sanitizeProductEntryLocalDraftMediaDescriptors,
} from "./product-entry-local-draft.schema";
import {
  productEntryLocalDraftMatchesIdentity,
  type ProductEntryLocalDraftStore,
} from "./product-entry-local-draft.store";
import {
  PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS,
  PRODUCT_ENTRY_EDIT_DRAFT_RETENTION_MS,
  PRODUCT_ENTRY_LOCAL_DRAFT_CODES,
  PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS,
  PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION,
  type AcceptProductEntryLocalDraftResult,
  type CreateProductEntryLocalDraftIdentity,
  type EditProductEntryLocalDraftIdentity,
  type ProductEntryLocalDraft,
  type ProductEntryLocalDraftCleanupResult,
  type ProductEntryLocalDraftContext,
  type ProductEntryLocalDraftDeleteReason,
  type ProductEntryLocalDraftIdentity,
  type ProductEntryLocalDraftMutationResult,
  type ProductEntryLocalDraftRestoreDecision,
  type ProductEntryLocalDraftSaveInput,
  type SaveProductEntryLocalDraftResult,
} from "./product-entry-local-draft.types";

export interface ProductEntrySubmissionIdAllocator {
  allocate(): string;
}

export const browserProductEntrySubmissionIdAllocator: ProductEntrySubmissionIdAllocator = Object.freeze({
  allocate: () => globalThis.crypto.randomUUID(),
});

const validIdentifier = (value: unknown): value is string =>
  typeof value === "string" && value.length > 0 && value === value.trim();

export const isValidProductEntryLocalDraftContext = (
  context: ProductEntryLocalDraftContext,
): boolean => validIdentifier(context.workspaceId) && validIdentifier(context.actorId);

export const isValidProductEntryLocalDraftIdentity = (
  identity: ProductEntryLocalDraftIdentity,
): boolean => {
  if (!isValidProductEntryLocalDraftContext(identity) || !validIdentifier(identity.submissionId)) {
    return false;
  }
  if (identity.mode === "Create") return true;
  return validIdentifier(identity.productId) &&
    Number.isSafeInteger(identity.baseProductRevision) &&
    identity.baseProductRevision >= 0;
};

const storageUnavailable = (): ProductEntryLocalDraftRestoreDecision => ({
  type: "StorageUnavailable",
  code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable,
});

export class SaveProductEntryLocalDraftUseCase {
  constructor(
    private readonly store: ProductEntryLocalDraftStore,
    private readonly clock: ProductEntryClock,
  ) {}

  async execute(input: ProductEntryLocalDraftSaveInput): Promise<SaveProductEntryLocalDraftResult> {
    if (!isValidProductEntryLocalDraftIdentity(input.identity)) {
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.identityInvalid };
    }
    try {
      const formState = sanitizeProductEntryLocalDraftFormState(input.formState);
      const mediaDescriptors = sanitizeProductEntryLocalDraftMediaDescriptors(input.mediaDescriptors);
      const existing = input.identity.mode === "Create"
        ? await this.store.findCreateByIdentity(input.identity)
        : await this.store.findEditByIdentity(input.identity);
      if (existing.type === "Incompatible") {
        return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.incompatible };
      }
      if (existing.type === "Corrupt") {
        return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.corrupt };
      }
      if (existing.type === "Found" && !productEntryLocalDraftMatchesIdentity(existing.draft, input.identity)) {
        return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.corrupt };
      }
      const now = this.clock.now().getTime();
      if (!Number.isSafeInteger(now) || now < 0) {
        return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
      }
      const retention = input.identity.mode === "Create"
        ? PRODUCT_ENTRY_CREATE_DRAFT_RETENTION_MS
        : PRODUCT_ENTRY_EDIT_DRAFT_RETENTION_MS;
      const draft: ProductEntryLocalDraft = Object.freeze({
        schemaVersion: PRODUCT_ENTRY_LOCAL_DRAFT_SCHEMA_VERSION,
        mode: input.identity.mode,
        workspaceId: input.identity.workspaceId,
        actorId: input.identity.actorId,
        submissionId: input.identity.mode === "Edit" && existing.type === "Found"
          ? existing.draft.submissionId
          : input.identity.submissionId,
        productId: input.identity.mode === "Edit" ? input.identity.productId : null,
        baseProductRevision: input.identity.mode === "Edit"
          ? input.identity.baseProductRevision
          : null,
        createdAt: existing.type === "Found" ? existing.draft.createdAt : now,
        updatedAt: now,
        expiresAt: now + retention,
        formState,
        mediaDescriptors,
      });
      await this.store.save(draft);
      return { type: "Saved", draft };
    } catch (error) {
      if (error instanceof ProductEntryLocalDraftInputFailure) {
        return { type: "Rejected", code: error.code };
      }
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }
  }
}

export class GetRecoverableProductEntryLocalDraftUseCase {
  constructor(
    private readonly store: ProductEntryLocalDraftStore,
    private readonly clock: ProductEntryClock,
  ) {}

  async execute(
    identity: ProductEntryLocalDraftIdentity,
    currentProductRevision?: number,
  ): Promise<ProductEntryLocalDraftRestoreDecision> {
    if (!isValidProductEntryLocalDraftIdentity(identity)) {
      return { type: "IdentityInvalid", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.identityInvalid };
    }
    if (
      identity.mode === "Edit" &&
      (!Number.isSafeInteger(currentProductRevision) || currentProductRevision! < 0)
    ) {
      return storageUnavailable();
    }
    try {
      const result = identity.mode === "Create"
        ? await this.store.findCreateByIdentity(identity)
        : await this.store.findEditByIdentity(identity);
      if (result.type === "NotFound") {
        return { type: "NoDraft", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.notFound };
      }
      if (result.type === "Incompatible") {
        return { type: "IncompatibleDraft", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.incompatible };
      }
      if (result.type === "Corrupt") {
        return { type: "CorruptDraft", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.corrupt };
      }
      if (!productEntryLocalDraftMatchesIdentity(result.draft, identity)) {
        return { type: "CorruptDraft", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.corrupt };
      }
      const now = this.clock.now().getTime();
      if (!Number.isSafeInteger(now) || now < 0) return storageUnavailable();
      if (result.draft.expiresAt <= now) {
        return {
          type: "ExpiredDraft",
          code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.expired,
          expiredAt: result.draft.expiresAt,
        };
      }
      if (
        identity.mode === "Edit" &&
        identity.baseProductRevision !== currentProductRevision
      ) {
        return {
          type: "RevisionConflict",
          code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.revisionConflict,
          productId: identity.productId,
          baseProductRevision: identity.baseProductRevision,
          currentProductRevision: currentProductRevision!,
          localUpdatedAt: result.draft.updatedAt,
        };
      }
      return {
        type: identity.mode === "Create"
          ? "RecoverableCreateDraft"
          : "RecoverableEditDraft",
        draft: prepareRestoredProductEntryLocalDraft(result.draft),
        requiresExplicitAcceptance: true,
        revalidationRequired: true,
      };
    } catch {
      return storageUnavailable();
    }
  }
}

export class AcceptProductEntryLocalDraftUseCase {
  execute(
    decision: ProductEntryLocalDraftRestoreDecision,
    accept: boolean,
  ): AcceptProductEntryLocalDraftResult {
    if (!accept || (decision.type !== "RecoverableCreateDraft" && decision.type !== "RecoverableEditDraft")) {
      return { type: "NotAccepted" };
    }
    return { type: "Accepted", draft: decision.draft, revalidationRequired: true };
  }
}

export class DeleteProductEntryLocalDraftUseCase {
  constructor(private readonly store: ProductEntryLocalDraftStore) {}

  async execute(
    identity: ProductEntryLocalDraftIdentity,
    reason: ProductEntryLocalDraftDeleteReason,
  ): Promise<ProductEntryLocalDraftMutationResult> {
    if (!isValidProductEntryLocalDraftIdentity(identity) ||
        !Object.values(PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS).includes(reason) ||
        (reason === PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS.editSessionCompleted &&
          identity.mode !== "Edit")) {
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.identityInvalid };
    }
    try {
      await this.store.deleteByIdentity(identity);
      return { type: "Completed" };
    } catch {
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }
  }
}

export class CleanupExpiredProductEntryLocalDraftsUseCase {
  constructor(
    private readonly store: ProductEntryLocalDraftStore,
    private readonly clock: ProductEntryClock,
  ) {}

  async execute(context: ProductEntryLocalDraftContext): Promise<ProductEntryLocalDraftCleanupResult> {
    if (!isValidProductEntryLocalDraftContext(context)) {
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.identityInvalid };
    }
    try {
      const now = this.clock.now().getTime();
      if (!Number.isSafeInteger(now) || now < 0) throw new Error("Invalid clock.");
      const deletedCount = await this.store.deleteExpiredForActor(context, now);
      return { type: "Completed", deletedCount };
    } catch {
      return { type: "Rejected", code: PRODUCT_ENTRY_LOCAL_DRAFT_CODES.storageUnavailable };
    }
  }
}

export const PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS = {
  submissionCompleted: "SubmissionCompleted",
  validationFailed: "ValidationFailed",
  networkFailed: "NetworkFailed",
  phaseOneRetryRequired: "PhaseOneRetryRequired",
  phaseTwoRetryRequired: "PhaseTwoRetryRequired",
  phaseOneSucceeded: "PhaseOneSucceeded",
  revisionConflict: "RevisionConflict",
} as const;

export type ProductEntryLocalDraftLifecycleEvent =
  (typeof PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS)[keyof typeof PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS];

export type ApplyProductEntryLocalDraftLifecycleEventResult =
  | { readonly type: "Preserved" }
  | ProductEntryLocalDraftMutationResult;

export class ApplyProductEntryLocalDraftLifecycleEventUseCase {
  constructor(private readonly deleteDraft: DeleteProductEntryLocalDraftUseCase) {}

  execute(
    identity: ProductEntryLocalDraftIdentity,
    event: ProductEntryLocalDraftLifecycleEvent,
  ): Promise<ApplyProductEntryLocalDraftLifecycleEventResult> {
    if (event === PRODUCT_ENTRY_LOCAL_DRAFT_LIFECYCLE_EVENTS.submissionCompleted &&
        identity.mode === "Edit") {
      return this.deleteDraft.execute(
        identity,
        PRODUCT_ENTRY_LOCAL_DRAFT_DELETE_REASONS.editSessionCompleted,
      );
    }
    return Promise.resolve({ type: "Preserved" });
  }
}

export class ProductEntryLocalDraftSessionService {
  constructor(
    private readonly allocator: ProductEntrySubmissionIdAllocator,
    private readonly store: ProductEntryLocalDraftStore,
  ) {}

  startCreate(context: ProductEntryLocalDraftContext): CreateProductEntryLocalDraftIdentity | null {
    if (!isValidProductEntryLocalDraftContext(context)) return null;
    let submissionId: string;
    try {
      submissionId = this.allocator.allocate();
    } catch {
      return null;
    }
    if (!validIdentifier(submissionId)) return null;
    return { ...context, mode: "Create", submissionId };
  }

  startEdit(
    context: ProductEntryLocalDraftContext,
    productId: string,
    baseProductRevision: number,
  ): EditProductEntryLocalDraftIdentity | null {
    let submissionId: string;
    try {
      submissionId = this.allocator.allocate();
    } catch {
      return null;
    }
    const identity = {
      ...context,
      mode: "Edit" as const,
      submissionId,
      productId,
      baseProductRevision,
    };
    return isValidProductEntryLocalDraftIdentity(identity) ? identity : null;
  }

  async startNewProduct(
    current: CreateProductEntryLocalDraftIdentity,
  ): Promise<CreateProductEntryLocalDraftIdentity | null> {
    if (!isValidProductEntryLocalDraftIdentity(current) || current.mode !== "Create") return null;
    try {
      await this.store.deleteByIdentity(current);
    } catch {
      return null;
    }
    const next = this.startCreate(current);
    return next && next.submissionId !== current.submissionId ? next : null;
  }

  startEditSessionAfterCompletion(
    current: EditProductEntryLocalDraftIdentity,
  ): EditProductEntryLocalDraftIdentity | null {
    return this.startEdit(current, current.productId, current.baseProductRevision);
  }
}
