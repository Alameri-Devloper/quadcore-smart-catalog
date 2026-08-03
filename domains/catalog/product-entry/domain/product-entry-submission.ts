import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";

const SHA_256_LOWERCASE_HEX = /^[a-f0-9]{64}$/;

const assertNonEmptyIdentifier = (name: string, value: string): void => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} cannot be empty.`);
  }
};

const dateEpoch = (name: string, value: Date): number => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid Date.`);
  }
  return value.getTime();
};

export class ProductEntrySubmissionId {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): ProductEntrySubmissionId {
    assertNonEmptyIdentifier("ProductEntrySubmissionId", value);
    return new ProductEntrySubmissionId(value);
  }
}

export class RequestFingerprint {
  private constructor(readonly value: string) {
    Object.freeze(this);
  }

  static create(value: string): RequestFingerprint {
    if (typeof value !== "string" || !SHA_256_LOWERCASE_HEX.test(value)) {
      throw new Error("RequestFingerprint must be canonical lowercase SHA-256 hexadecimal.");
    }
    return new RequestFingerprint(value);
  }

  equals(other: RequestFingerprint): boolean {
    return this.value === other.value;
  }
}

export const PRODUCT_ENTRY_SUBMISSION_MODES = {
  create: "Create",
  edit: "Edit",
} as const;

export type ProductEntrySubmissionMode =
  (typeof PRODUCT_ENTRY_SUBMISSION_MODES)[keyof typeof PRODUCT_ENTRY_SUBMISSION_MODES];

export const PRODUCT_ENTRY_SUBMISSION_STATUSES = {
  claimed: "Claimed",
  productSaved: "ProductSaved",
  completed: "Completed",
  partiallyCompleted: "PartiallyCompleted",
} as const;

export type ProductEntrySubmissionStatus =
  (typeof PRODUCT_ENTRY_SUBMISSION_STATUSES)[keyof typeof PRODUCT_ENTRY_SUBMISSION_STATUSES];

export interface ProductEntrySubmissionIdentity {
  readonly workspaceId: WorkspaceId;
  readonly submissionId: ProductEntrySubmissionId;
}

export interface ClaimProductEntrySubmissionInput extends ProductEntrySubmissionIdentity {
  readonly requestFingerprint: RequestFingerprint;
  readonly mode: ProductEntrySubmissionMode;
  readonly productId: ProductId | null;
  readonly claimedAt: Date;
}

export interface RehydrateProductEntrySubmissionInput extends ProductEntrySubmissionIdentity {
  readonly requestFingerprint: RequestFingerprint;
  readonly mode: ProductEntrySubmissionMode;
  readonly productId: ProductId | null;
  readonly productRevision: number | null;
  readonly mediaWorkflowId: string | null;
  readonly status: ProductEntrySubmissionStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

interface ProductEntrySubmissionState {
  readonly workspaceId: WorkspaceId;
  readonly submissionId: ProductEntrySubmissionId;
  readonly requestFingerprint: RequestFingerprint;
  readonly mode: ProductEntrySubmissionMode;
  productId: ProductId | null;
  productRevision: number | null;
  mediaWorkflowId: string | null;
  status: ProductEntrySubmissionStatus;
  readonly createdAtEpoch: number;
  updatedAtEpoch: number;
}

const validateState = (state: ProductEntrySubmissionState): void => {
  if (!Object.values(PRODUCT_ENTRY_SUBMISSION_MODES).includes(state.mode)) {
    throw new Error("Unsupported Product Entry Submission mode.");
  }
  if (!Object.values(PRODUCT_ENTRY_SUBMISSION_STATUSES).includes(state.status)) {
    throw new Error("Unsupported Product Entry Submission status.");
  }
  if (state.createdAtEpoch > state.updatedAtEpoch) {
    throw new Error("Submission CreatedAt cannot be later than UpdatedAt.");
  }
  if (state.mode === PRODUCT_ENTRY_SUBMISSION_MODES.edit && state.productId === null) {
    throw new Error("Edit Product Entry Submission requires ProductId.");
  }
  if (
    state.mode === PRODUCT_ENTRY_SUBMISSION_MODES.create &&
    state.status === PRODUCT_ENTRY_SUBMISSION_STATUSES.claimed &&
    state.productId !== null
  ) {
    throw new Error("Create Product Entry Submission cannot link ProductId before Product save.");
  }
  if (state.status === PRODUCT_ENTRY_SUBMISSION_STATUSES.claimed) {
    if (state.productRevision !== null || state.mediaWorkflowId !== null) {
      throw new Error("Claimed Product Entry Submission cannot contain saved-product or Media Workflow state.");
    }
    return;
  }
  if (state.productId === null || !Number.isSafeInteger(state.productRevision) || state.productRevision! < 0) {
    throw new Error("Saved Product Entry Submission requires ProductId and a non-negative safe Product Revision.");
  }
  if (state.mediaWorkflowId !== null) {
    assertNonEmptyIdentifier("ProductMediaWorkflowId", state.mediaWorkflowId);
  }
};

export class ProductEntrySubmission {
  private constructor(private readonly state: ProductEntrySubmissionState) {}

  static claim(input: ClaimProductEntrySubmissionInput): ProductEntrySubmission {
    const claimedAtEpoch = dateEpoch("ClaimedAt", input.claimedAt);
    const state: ProductEntrySubmissionState = {
      workspaceId: input.workspaceId,
      submissionId: input.submissionId,
      requestFingerprint: input.requestFingerprint,
      mode: input.mode,
      productId: input.productId,
      productRevision: null,
      mediaWorkflowId: null,
      status: PRODUCT_ENTRY_SUBMISSION_STATUSES.claimed,
      createdAtEpoch: claimedAtEpoch,
      updatedAtEpoch: claimedAtEpoch,
    };
    validateState(state);
    return new ProductEntrySubmission(state);
  }

  static rehydrate(input: RehydrateProductEntrySubmissionInput): ProductEntrySubmission {
    const state: ProductEntrySubmissionState = {
      workspaceId: input.workspaceId,
      submissionId: input.submissionId,
      requestFingerprint: input.requestFingerprint,
      mode: input.mode,
      productId: input.productId,
      productRevision: input.productRevision,
      mediaWorkflowId: input.mediaWorkflowId,
      status: input.status,
      createdAtEpoch: dateEpoch("CreatedAt", input.createdAt),
      updatedAtEpoch: dateEpoch("UpdatedAt", input.updatedAt),
    };
    validateState(state);
    return new ProductEntrySubmission(state);
  }

  markProductSaved(productId: ProductId, productRevision: number, savedAt: Date): void {
    if (this.state.status !== PRODUCT_ENTRY_SUBMISSION_STATUSES.claimed) {
      throw new Error("Only a Claimed Product Entry Submission can mark Product saved.");
    }
    if (!Number.isSafeInteger(productRevision) || productRevision < 0) {
      throw new Error("Product Revision must be a non-negative safe integer.");
    }
    const updatedAtEpoch = this.validTransitionTime(savedAt);
    this.state.productId = productId;
    this.state.productRevision = productRevision;
    this.state.status = PRODUCT_ENTRY_SUBMISSION_STATUSES.productSaved;
    this.state.updatedAtEpoch = updatedAtEpoch;
  }

  markMediaOutcome(
    status: Extract<ProductEntrySubmissionStatus, "Completed" | "PartiallyCompleted">,
    mediaWorkflowId: string,
    updatedAt: Date,
  ): void {
    const current = this.state.status;
    const allowed =
      current === PRODUCT_ENTRY_SUBMISSION_STATUSES.productSaved ||
      (current === PRODUCT_ENTRY_SUBMISSION_STATUSES.partiallyCompleted &&
        status === PRODUCT_ENTRY_SUBMISSION_STATUSES.completed);
    if (!allowed) {
      throw new Error("Illegal Product Entry Submission media status transition.");
    }
    assertNonEmptyIdentifier("ProductMediaWorkflowId", mediaWorkflowId);
    this.state.mediaWorkflowId = mediaWorkflowId;
    this.state.status = status;
    this.state.updatedAtEpoch = this.validTransitionTime(updatedAt);
  }

  private validTransitionTime(value: Date): number {
    const epoch = dateEpoch("UpdatedAt", value);
    if (epoch < this.state.updatedAtEpoch) {
      throw new Error("Submission UpdatedAt cannot move backwards.");
    }
    return epoch;
  }

  get workspaceId(): WorkspaceId { return this.state.workspaceId; }
  get submissionId(): ProductEntrySubmissionId { return this.state.submissionId; }
  get requestFingerprint(): RequestFingerprint { return this.state.requestFingerprint; }
  get mode(): ProductEntrySubmissionMode { return this.state.mode; }
  get productId(): ProductId | null { return this.state.productId; }
  get productRevision(): number | null { return this.state.productRevision; }
  get mediaWorkflowId(): string | null { return this.state.mediaWorkflowId; }
  get status(): ProductEntrySubmissionStatus { return this.state.status; }
  get createdAt(): Date { return new Date(this.state.createdAtEpoch); }
  get updatedAt(): Date { return new Date(this.state.updatedAtEpoch); }
}
