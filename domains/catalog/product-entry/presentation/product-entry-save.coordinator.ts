import type { SubmitProductEntryCommand } from "../application/product-entry-command";
import type {
  ProductEntryMediaClient,
  ProductEntryMediaStatusView,
  ProductEntryProductSaveReceipt,
  ProductEntrySelectedMediaSource,
  ProductEntrySubmissionClient,
} from "./product-entry-presentation.types";

export type ProductEntryTwoPhaseSaveResult =
  | { readonly type: "Completed"; readonly receipt: ProductEntryProductSaveReceipt; readonly mediaStatus: ProductEntryMediaStatusView | null }
  | { readonly type: "RevisionConflict"; readonly productId: string; readonly expectedRevision: number; readonly actualRevision: number }
  | { readonly type: "ProductRejected"; readonly code: string; readonly field: string | null }
  | { readonly type: "ProductRetryableFailure"; readonly code: string }
  | { readonly type: "ProductFatalFailure"; readonly code: string }
  | { readonly type: "MediaRequiresSources"; readonly receipt: ProductEntryProductSaveReceipt; readonly operationIds: readonly string[]; readonly status: ProductEntryMediaStatusView }
  | { readonly type: "MediaPartiallyCompleted"; readonly receipt: ProductEntryProductSaveReceipt; readonly status: ProductEntryMediaStatusView | null; readonly code: string }
  | { readonly type: "MediaRetryableFailure"; readonly receipt: ProductEntryProductSaveReceipt; readonly code: string }
  | { readonly type: "MediaFatalFailure"; readonly receipt: ProductEntryProductSaveReceipt; readonly code: string };

export type ProductEntryRequiredSourceProvider = (
  operationIds: readonly string[],
  replacementOperationIds?: readonly string[],
) =>
  | { readonly type: "Ready"; readonly sources: readonly ProductEntrySelectedMediaSource[] }
  | { readonly type: "Missing"; readonly operationIds: readonly string[] };

export class ProductEntryTwoPhaseSaveCoordinator {
  private receipt: ProductEntryProductSaveReceipt | null = null;
  private active: AbortController | null = null;
  private generation = 0;

  constructor(
    private readonly submission: ProductEntrySubmissionClient,
    private readonly media: ProductEntryMediaClient,
  ) {}

  get productReceipt(): ProductEntryProductSaveReceipt | null {
    return this.receipt;
  }

  async save(
    command: SubmitProductEntryCommand,
    sources: ProductEntryRequiredSourceProvider,
    onProductSaved?: (receipt: ProductEntryProductSaveReceipt) => void,
  ): Promise<ProductEntryTwoPhaseSaveResult> {
    const request = this.begin();
    const product = await this.submission.submit(command, request.signal);
    if (!this.isCurrent(request)) return { type: "ProductRetryableFailure", code: "REQUEST_CANCELLED" };
    if (product.type === "ProductRevisionConflict") return {
      type: "RevisionConflict",
      productId: product.productId,
      expectedRevision: product.expectedRevision,
      actualRevision: product.actualRevision,
    };
    if (product.type === "Rejected") return { type: "ProductRejected", code: product.code, field: product.field };
    if (product.type === "RetryableFailure") return { type: "ProductRetryableFailure", code: product.code };
    if (product.type === "FatalFailure") return { type: "ProductFatalFailure", code: product.code };
    this.receipt = product.receipt;
    onProductSaved?.(product.receipt);
    if (!command.mediaOperations || command.mediaOperations.length === 0) {
      return { type: "Completed", receipt: product.receipt, mediaStatus: null };
    }
    return this.resumeMedia(product.receipt, sources, request);
  }

  async retryMedia(sources: ProductEntryRequiredSourceProvider): Promise<ProductEntryTwoPhaseSaveResult> {
    if (!this.receipt) return { type: "ProductFatalFailure", code: "PRODUCT_NOT_SAVED" };
    return this.resumeMedia(this.receipt, sources, this.begin());
  }

  dispose(): void {
    this.generation += 1;
    this.active?.abort();
    this.active = null;
  }

  reset(): void {
    this.dispose();
    this.receipt = null;
  }

  private async resumeMedia(
    receipt: ProductEntryProductSaveReceipt,
    sources: ProductEntryRequiredSourceProvider,
    request: AbortController,
  ): Promise<ProductEntryTwoPhaseSaveResult> {
    const statusResult = await this.media.getStatus(receipt.submissionId, request.signal);
    if (!this.isCurrent(request)) return { type: "MediaRetryableFailure", receipt, code: "REQUEST_CANCELLED" };
    if (statusResult.type === "RetryableFailure") return { type: "MediaRetryableFailure", receipt, code: statusResult.code };
    if (statusResult.type === "FatalFailure") return { type: "MediaFatalFailure", receipt, code: statusResult.code };
    const status = statusResult.status;
    if (status.submissionStatus === "Completed" || status.workflowStatus === "Completed") {
      return { type: "Completed", receipt, mediaStatus: status };
    }
    const selected = sources(status.requiredSourceOperationIds, status.requiresNewSourceOperationIds);
    if (selected.type === "Missing") return {
      type: "MediaRequiresSources",
      receipt,
      operationIds: selected.operationIds,
      status,
    };
    const upload = await this.media.upload(receipt.submissionId, selected.sources, request.signal);
    if (!this.isCurrent(request)) return { type: "MediaRetryableFailure", receipt, code: "REQUEST_CANCELLED" };
    if (upload.type === "Completed") return { type: "Completed", receipt, mediaStatus: upload.status };
    if (upload.type === "PartiallyCompleted") return { type: "MediaPartiallyCompleted", receipt, status: upload.status, code: "MEDIA_PARTIALLY_COMPLETED" };
    if (upload.type === "Rejected") return { type: "MediaPartiallyCompleted", receipt, status, code: upload.code };
    if (upload.type === "RetryableFailure") return { type: "MediaRetryableFailure", receipt, code: upload.code };
    return { type: "MediaFatalFailure", receipt, code: "code" in upload ? upload.code : "INVALID_MEDIA_RESPONSE" };
  }

  private begin(): AbortController {
    this.active?.abort();
    this.generation += 1;
    const controller = new AbortController();
    Object.defineProperty(controller, "qscGeneration", { value: this.generation });
    this.active = controller;
    return controller;
  }

  private isCurrent(controller: AbortController): boolean {
    return this.active === controller && !controller.signal.aborted &&
      (controller as AbortController & { readonly qscGeneration: number }).qscGeneration === this.generation;
  }
}
