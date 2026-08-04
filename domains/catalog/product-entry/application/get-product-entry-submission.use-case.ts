import type { Product } from "../../types/product.aggregate";
import { ProductEntrySubmissionId } from "../domain/product-entry-submission";
import { commitProductEntryTransaction, type ProductEntryUnitOfWork } from "../ports/product-entry-unit-of-work.port";
import { PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "./product-entry-execution-context";

export type GetProductEntrySubmissionResult =
  | { readonly type: "Found"; readonly submission: ProductEntrySubmissionView }
  | { readonly type: "NotFound"; readonly submissionId: string }
  | { readonly type: "Forbidden"; readonly permission: string }
  | { readonly type: "InvalidRequest" };

export interface ProductEntrySubmissionView {
  readonly submissionId: string;
  readonly mode: string;
  readonly status: string;
  readonly requestFingerprint: string;
  readonly productId: string | null;
  readonly productRevision: number | null;
  readonly mediaWorkflowId: string | null;
  readonly mediaUploadState: "PendingUpload" | "Completed" | "PartiallyCompleted";
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly product: ReturnType<typeof productSnapshot> | null;
  readonly mediaOperations: readonly {
    readonly operationId: string;
    readonly operationType: string;
    readonly sequence: number;
    readonly mediaId: string | null;
    readonly requestedDisplayOrder: number | null;
    readonly selectedAsCover: boolean;
    readonly expectedSourceSha256: string | null;
    readonly expectedSourceByteLength: number | null;
    readonly finalOrder: number | null;
  }[];
}

const productSnapshot = (product: Product) => ({
  productId: product.identity.productId.value,
  catalogId: product.identity.catalogId.value,
  lifecycleState: product.lifecycleState.value,
  archiveReason: product.archiveReason?.value ?? null,
  revision: product.revision.value,
  classification: product.classification ? {
    categoryId: product.classification.categoryId ?? null,
    productTypeId: product.classification.productTypeId?.value ?? null,
    deviceClassId: product.classification.deviceClassId ?? null,
    conditionId: product.classification.conditionId ?? null,
    availabilityStatusId: product.classification.availabilityStatusId ?? null,
  } : null,
  commercialDetails: product.commercialDetails ? {
    productName: product.commercialDetails.productName ?? null,
    productCode: product.commercialDetails.productCode?.value ?? null,
    productModelId: product.commercialDetails.productModelId ?? null,
    brandId: product.commercialDetails.brandId ?? null,
    isHighlighted: product.commercialDetails.isHighlighted,
    wholesalePrice: product.commercialDetails.pricing?.wholesalePrice
      ? {
          amountMinor: product.commercialDetails.pricing.wholesalePrice.amountMinor,
          currency: product.commercialDetails.pricing.wholesalePrice.currency,
        }
      : null,
    retailPrice: product.commercialDetails.pricing?.retailPrice
      ? {
          amountMinor: product.commercialDetails.pricing.retailPrice.amountMinor,
          currency: product.commercialDetails.pricing.retailPrice.currency,
        }
      : null,
  } : null,
  specificationValues: product.specificationValues.map((value) => ({
    specificationFieldId: value.specificationFieldId,
    value: value.value,
  })),
  images: product.images.map((image) => ({
    mediaId: image.productImageId,
    displayOrder: image.order,
    isMain: image.isMain,
    altText: image.altText ?? null,
  })),
});

export class GetProductEntrySubmissionUseCase {
  constructor(private readonly unitOfWork: ProductEntryUnitOfWork) {}

  async execute(context: ProductEntryExecutionContext, submissionIdValue: string): Promise<GetProductEntrySubmissionResult> {
    if (!context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.read)) {
      return { type: "Forbidden", permission: PRODUCT_ENTRY_PERMISSIONS.read };
    }
    let submissionId;
    try {
      submissionId = ProductEntrySubmissionId.create(submissionIdValue);
    } catch {
      return { type: "InvalidRequest" };
    }
    return this.unitOfWork.execute(async (transaction) => {
      const submission = await transaction.submissionRepository.findById(context.workspaceId, submissionId);
      if (!submission) {
        return commitProductEntryTransaction<GetProductEntrySubmissionResult>({ type: "NotFound", submissionId: submissionId.value });
      }
      const [product, mediaOperations] = await Promise.all([
        submission.productId
          ? transaction.productRepository.findById(context.workspaceId, submission.productId)
          : Promise.resolve(null),
        transaction.mediaPlanRepository.findBySubmission(context.workspaceId, submissionId),
      ]);
      return commitProductEntryTransaction<GetProductEntrySubmissionResult>({
        type: "Found",
        submission: {
          submissionId: submission.submissionId.value,
          mode: submission.mode,
          status: submission.status,
          requestFingerprint: submission.requestFingerprint.value,
          productId: submission.productId?.value ?? null,
          productRevision: submission.productRevision,
          mediaWorkflowId: submission.mediaWorkflowId,
          mediaUploadState: submission.status === "Completed"
            ? "Completed"
            : submission.status === "PartiallyCompleted"
              ? "PartiallyCompleted"
              : "PendingUpload",
          createdAt: submission.createdAt,
          updatedAt: submission.updatedAt,
          product: product
            ? productSnapshot(product)
            : null,
          mediaOperations: mediaOperations.map((operation) => ({
            operationId: operation.operationId,
            operationType: operation.operationType,
            sequence: operation.sequence,
            mediaId: operation.mediaId,
            requestedDisplayOrder: operation.requestedDisplayOrder,
            selectedAsCover: operation.selectedAsCover,
            expectedSourceSha256: operation.expectedSourceSha256,
            expectedSourceByteLength: operation.expectedSourceByteLength,
            finalOrder: operation.finalOrder,
          })),
        },
      });
    });
  }
}
