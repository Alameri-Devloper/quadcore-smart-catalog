import { and, eq, isNull, or } from "drizzle-orm";
import { SMART_SAVE_PRODUCT_OUTCOMES } from "../../../services/smart-save-product";
import { ProductId, WorkspaceId } from "../../../types/product-identity.value-object";
import {
  PRODUCT_PUBLICATION_REASON_CODES,
} from "../../../types/product-publication-reason.value-object";
import {
  PRODUCT_ENTRY_SUBMISSION_STATUSES,
  ProductEntrySubmission,
  ProductEntrySubmissionId,
  RequestFingerprint,
  type ProductEntrySubmissionMode,
  type ProductEntrySubmissionStatus,
} from "../../domain/product-entry-submission";
import type {
  ClaimProductEntrySubmission,
  MarkProductEntrySubmissionProductSaved,
  ProductEntrySaveReceipt,
  ProductEntrySubmissionClaimResult,
  ProductEntrySubmissionRepository,
} from "../../repositories/product-entry-submission.repository";
import type { CatalogDatabase } from "../../../infrastructure/persistence/database";
import { catalogProductEntrySubmissions } from "../../../infrastructure/persistence/schema";

const toDomain = (row: typeof catalogProductEntrySubmissions.$inferSelect): ProductEntrySubmission =>
  ProductEntrySubmission.rehydrate({
    workspaceId: WorkspaceId.create(row.workspaceId),
    submissionId: ProductEntrySubmissionId.create(row.submissionId),
    requestFingerprint: RequestFingerprint.create(row.requestFingerprint),
    mode: row.mode as ProductEntrySubmissionMode,
    productId: row.productId === null ? null : ProductId.create(row.productId),
    productRevision: row.productRevision,
    mediaWorkflowId: row.mediaWorkflowId,
    status: row.status as ProductEntrySubmissionStatus,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  });

const SUCCESS_OUTCOMES = new Set(Object.values(SMART_SAVE_PRODUCT_OUTCOMES).filter((outcome) =>
  !["ProductNotFound", "RevisionConflict", "ProductIdConflict", "ProductCodeConflict"].includes(outcome),
));
const LIFECYCLE_STATES = new Set(["Draft", "Published", "Archived"]);
const ARCHIVE_REASONS = new Set(["Manual", "PublicationRequirementsNotMet"]);
const PUBLICATION_REASONS = new Set(Object.values(PRODUCT_PUBLICATION_REASON_CODES));
const OUTCOME_LIFECYCLE = new Map<string, string>([
  [SMART_SAVE_PRODUCT_OUTCOMES.savedAsDraft, "Draft"],
  [SMART_SAVE_PRODUCT_OUTCOMES.savedAndPublished, "Published"],
  [SMART_SAVE_PRODUCT_OUTCOMES.savedPublishedUpdate, "Published"],
  [SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoArchived, "Archived"],
  [SMART_SAVE_PRODUCT_OUTCOMES.savedArchivedUpdate, "Archived"],
  [SMART_SAVE_PRODUCT_OUTCOMES.savedAndAutoRestored, "Published"],
]);

const validateReceipt = (value: unknown): ProductEntrySaveReceipt => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error("Product Entry save receipt persistence is invalid.");
  }
  const receipt = value as Record<string, unknown>;
  if (!SUCCESS_OUTCOMES.has(receipt.outcome as never) || !LIFECYCLE_STATES.has(receipt.lifecycleState as never) ||
    OUTCOME_LIFECYCLE.get(receipt.outcome as string) !== receipt.lifecycleState) {
    throw new Error("Product Entry save receipt persistence is invalid.");
  }
  if (receipt.archiveReason !== null && !ARCHIVE_REASONS.has(receipt.archiveReason as never) ||
    ((receipt.lifecycleState === "Archived") !== (receipt.archiveReason !== null))) {
    throw new Error("Product Entry save receipt persistence is invalid.");
  }
  if (!Array.isArray(receipt.missingPublicationReasons) || receipt.missingPublicationReasons.some((reason) => {
    if (typeof reason !== "object" || reason === null || Array.isArray(reason)) return true;
    const item = reason as Record<string, unknown>;
    const requiredSpecification = item.code === PRODUCT_PUBLICATION_REASON_CODES.missingRequiredSpecification;
    return !PUBLICATION_REASONS.has(item.code as never) ||
      (requiredSpecification
        ? typeof item.specificationFieldId !== "string" || item.specificationFieldId.trim().length === 0
        : item.specificationFieldId !== null);
  })) {
    throw new Error("Product Entry save receipt persistence is invalid.");
  }
  return receipt as unknown as ProductEntrySaveReceipt;
};

export class PostgreSqlProductEntrySubmissionRepository implements ProductEntrySubmissionRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async findById(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId): Promise<ProductEntrySubmission | null> {
    const [row] = await this.database.select().from(catalogProductEntrySubmissions).where(and(
      eq(catalogProductEntrySubmissions.workspaceId, workspaceId.value),
      eq(catalogProductEntrySubmissions.submissionId, submissionId.value),
    )).limit(1);
    return row ? toDomain(row) : null;
  }

  async findSaveReceipt(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId): Promise<ProductEntrySaveReceipt | null> {
    const [row] = await this.database.select({ receipt: catalogProductEntrySubmissions.productSaveReceipt })
      .from(catalogProductEntrySubmissions)
      .where(and(
        eq(catalogProductEntrySubmissions.workspaceId, workspaceId.value),
        eq(catalogProductEntrySubmissions.submissionId, submissionId.value),
      ))
      .limit(1);
    return row?.receipt ? validateReceipt(row.receipt) : null;
  }

  async claim(command: ClaimProductEntrySubmission): Promise<ProductEntrySubmissionClaimResult> {
    const submission = ProductEntrySubmission.claim({
      ...command,
      claimedAt: command.claimedAt,
    });
    const inserted = await this.database.insert(catalogProductEntrySubmissions).values({
      workspaceId: command.workspaceId.value,
      submissionId: command.submissionId.value,
      requestFingerprint: command.requestFingerprint.value,
      productId: command.productId?.value ?? null,
      mode: command.mode,
      status: PRODUCT_ENTRY_SUBMISSION_STATUSES.claimed,
      productRevision: null,
      mediaWorkflowId: null,
      productSaveReceipt: null,
      createdAt: command.claimedAt,
      updatedAt: command.claimedAt,
    }).onConflictDoNothing({
      target: [catalogProductEntrySubmissions.workspaceId, catalogProductEntrySubmissions.submissionId],
    }).returning({ submissionId: catalogProductEntrySubmissions.submissionId });
    if (inserted.length > 0) return { type: "Claimed", submission };
    const existing = await this.findById(command.workspaceId, command.submissionId);
    if (!existing) throw new Error("Product Entry Submission claim could not be resolved.");
    return existing.requestFingerprint.equals(command.requestFingerprint)
      ? { type: "Existing", submission: existing }
      : { type: "FingerprintConflict", submission: existing };
  }

  async markProductSaved(command: MarkProductEntrySubmissionProductSaved): Promise<void> {
    const updated = await this.database.update(catalogProductEntrySubmissions).set({
      productId: command.productId.value,
      productRevision: command.productRevision,
      status: PRODUCT_ENTRY_SUBMISSION_STATUSES.productSaved,
      productSaveReceipt: command.receipt,
      updatedAt: command.savedAt,
    }).where(and(
      eq(catalogProductEntrySubmissions.workspaceId, command.workspaceId.value),
      eq(catalogProductEntrySubmissions.submissionId, command.submissionId.value),
      eq(catalogProductEntrySubmissions.status, PRODUCT_ENTRY_SUBMISSION_STATUSES.claimed),
      or(
        isNull(catalogProductEntrySubmissions.productId),
        eq(catalogProductEntrySubmissions.productId, command.productId.value),
      ),
    )).returning({ submissionId: catalogProductEntrySubmissions.submissionId });
    if (updated.length !== 1) throw new Error("Product Entry Submission saved-product transition failed.");
  }
}
