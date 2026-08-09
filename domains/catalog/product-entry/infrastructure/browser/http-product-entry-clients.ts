import type { SubmitProductEntryCommand } from "../../application/product-entry-command";
import type {
  ProductEntryMediaClient,
  ProductEntryMediaClientResult,
  ProductEntryMediaStatusView,
  ProductEntryProductReadClient,
  ProductEntryProductView,
  ProductEntrySubmissionClient,
  ProductEntrySubmissionClientResult,
  ProductEntryTrustedClientContext,
  ProductEntryTrustedClientContextPort,
} from "../../presentation/product-entry-presentation.types";

const record = (value: unknown): Readonly<Record<string, unknown>> | null =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? value as Readonly<Record<string, unknown>>
    : null;
const text = (value: unknown): string | null => typeof value === "string" ? value : null;
const number = (value: unknown): number | null => Number.isSafeInteger(value) ? value as number : null;
const strings = (value: unknown): readonly string[] => Array.isArray(value) && value.every((item) => typeof item === "string") ? value : [];
const transportCode = (error: unknown): string => error instanceof DOMException && error.name === "AbortError"
  ? "REQUEST_CANCELLED"
  : "NETWORK_UNAVAILABLE";

const readJson = async (response: Response): Promise<Readonly<Record<string, unknown>> | null> => {
  try { return record(await response.json()); }
  catch { return null; }
};

export class HttpProductEntrySubmissionClient implements ProductEntrySubmissionClient {
  constructor(private readonly fetcher: typeof fetch = globalThis.fetch) {}

  async submit(command: SubmitProductEntryCommand, signal?: AbortSignal): Promise<ProductEntrySubmissionClientResult> {
    try {
      const response = await this.fetcher("/api/catalog/product-entry-submissions", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(command),
        signal,
      });
      const body = await readJson(response);
      if (!body) return { type: "RetryableFailure", code: "INVALID_SERVER_RESPONSE" };
      if (body.type === "Accepted") {
        const save = record(body.productSaveResult);
        const submissionId = text(body.submissionId);
        const productId = text(body.productId);
        const productRevision = number(body.productRevision);
        if (!save || !submissionId || !productId || productRevision === null) return { type: "RetryableFailure", code: "INVALID_SERVER_RESPONSE" };
        return { type: "Accepted", receipt: {
          submissionId,
          productId,
          productRevision,
          idempotentReplay: body.idempotentReplay === true,
          outcome: text(save.outcome) ?? "Saved",
          lifecycleState: text(save.lifecycleState) ?? "Draft",
        } };
      }
      if (body.type === "ProductRevisionConflict") {
        const productId = text(body.productId);
        const expectedRevision = number(body.expectedRevision);
        const actualRevision = number(body.actualRevision);
        if (productId && expectedRevision !== null && actualRevision !== null) return { type: "ProductRevisionConflict", productId, expectedRevision, actualRevision };
      }
      if (body.type === "InvalidRequest") {
        const first = Array.isArray(body.reasons) ? record(body.reasons[0]) : null;
        return { type: "Rejected", code: text(first?.code) ?? "INVALID_REQUEST", field: text(first?.field) };
      }
      const code = text(body.code) ?? text(body.type) ?? `HTTP_${response.status}`;
      return response.status >= 500
        ? { type: "RetryableFailure", code }
        : { type: "FatalFailure", code };
    } catch (error) {
      return { type: "RetryableFailure", code: transportCode(error) };
    }
  }
}

const mediaStatus = (body: Readonly<Record<string, unknown>>): ProductEntryMediaStatusView | null => {
  const status = body.type === "Found" ? record(body.status) : body;
  if (!status) return null;
  const workflow = record(status.workflow);
  const operations = Array.isArray(workflow?.operations) ? workflow.operations.flatMap((item) => {
    const operation = record(item);
    const operationId = text(operation?.operationId);
    if (!operation || !operationId) return [];
    return [{
      operationId,
      status: text(operation.status) ?? "Unknown",
      retryAllowed: operation.retryAllowed === true,
      requiresNewSource: operation.requiresNewSource === true,
      errorCode: text(operation.errorCode),
    }];
  }) : [];
  const submissionId = text(status.submissionId);
  if (!submissionId) return null;
  return {
    submissionId,
    submissionStatus: text(status.submissionStatus) ?? "Unknown",
    productId: text(status.productId),
    workflowStatus: text(workflow?.status),
    plannedOperationIds: strings(status.plannedOperationIds),
    requiredSourceOperationIds: strings(status.requiredSourceOperationIds),
    retryableOperationIds: strings(status.retryableOperationIds),
    requiresNewSourceOperationIds: strings(status.requiresNewSourceOperationIds),
    operations,
  };
};

export class HttpProductEntryMediaClient implements ProductEntryMediaClient {
  constructor(private readonly fetcher: typeof fetch = globalThis.fetch) {}

  async getStatus(submissionId: string, signal?: AbortSignal) {
    try {
      const response = await this.fetcher(`/api/catalog/product-entry-submissions/${encodeURIComponent(submissionId)}/media`, { signal });
      const body = await readJson(response);
      const status = body ? mediaStatus(body) : null;
      if (response.ok && status) return { type: "Found" as const, status };
      const code = text(body?.code) ?? text(body?.type) ?? `HTTP_${response.status}`;
      return response.status >= 500
        ? { type: "RetryableFailure" as const, code }
        : { type: "FatalFailure" as const, code };
    } catch (error) {
      return { type: "RetryableFailure" as const, code: transportCode(error) };
    }
  }

  async upload(submissionId: string, sources: Parameters<ProductEntryMediaClient["upload"]>[1], signal?: AbortSignal): Promise<ProductEntryMediaClientResult> {
    try {
      const multipart = new FormData();
      for (const source of sources) multipart.append(`source:${source.operationId}`, source.file, source.file.name);
      const response = await this.fetcher(`/api/catalog/product-entry-submissions/${encodeURIComponent(submissionId)}/media`, {
        method: "POST",
        body: multipart,
        signal,
      });
      const body = await readJson(response);
      if (!body) return { type: "RetryableFailure", code: "INVALID_SERVER_RESPONSE" };
      if (body.type === "Completed" || body.type === "Accepted") {
        const status = mediaStatus(body) ?? {
          submissionId,
          submissionStatus: text(body.submissionStatus) ?? "Unknown",
          productId: null,
          workflowStatus: text(record(body.workflow)?.status),
          plannedOperationIds: [], requiredSourceOperationIds: [], retryableOperationIds: [], requiresNewSourceOperationIds: [], operations: [],
        };
        return {
          type: body.type === "Completed" ? "Completed" : "PartiallyCompleted",
          status,
          idempotentReplay: body.idempotentReplay === true,
          resumed: body.resumed === true,
        };
      }
      if (body.type === "NewSourceFlowNotImplemented") return {
        type: "NewSourceFlowNotImplemented",
        code: "MEDIA_NEW_SOURCE_FLOW_NOT_IMPLEMENTED",
        operationIds: strings(body.operationIds),
      };
      if (body.type === "InvalidRequest" || body.type === "PlanMismatch") return {
        type: "Rejected",
        code: text(body.code) ?? "MEDIA_REQUEST_REJECTED",
        operationId: text(body.operationId),
      };
      const code = text(body.code) ?? text(body.type) ?? `HTTP_${response.status}`;
      return response.status >= 500 ? { type: "RetryableFailure", code } : { type: "FatalFailure", code };
    } catch (error) {
      return { type: "RetryableFailure", code: transportCode(error) };
    }
  }
}

export class HttpProductEntryProductReadClient implements ProductEntryProductReadClient {
  constructor(private readonly fetcher: typeof fetch = globalThis.fetch) {}
  async get(productId: string, signal?: AbortSignal) {
    try {
      const response = await this.fetcher(`/api/catalog/products/${encodeURIComponent(productId)}/product-entry`, { signal });
      const body = await readJson(response);
      if (response.ok && body?.type === "Found" && record(body.product)) {
        return { type: "Found" as const, product: body.product as unknown as ProductEntryProductView };
      }
      if (response.status === 404) return { type: "NotFound" as const };
      const code = text(body?.code) ?? text(body?.type) ?? `HTTP_${response.status}`;
      return response.status >= 500 ? { type: "RetryableFailure" as const, code } : { type: "FatalFailure" as const, code };
    } catch (error) { return { type: "RetryableFailure" as const, code: transportCode(error) }; }
  }
}

export class HttpProductEntryTrustedClientContextAdapter implements ProductEntryTrustedClientContextPort {
  constructor(private readonly fetcher: typeof fetch = globalThis.fetch) {}
  async resolve(signal?: AbortSignal) {
    try {
      const response = await this.fetcher("/api/catalog/product-entry-client-context", { signal });
      const body = await readJson(response);
      const context = record(body?.context);
      if (response.ok && body?.type === "Available" && context) {
        const companyId = text(context.companyId); const workspaceId = text(context.workspaceId);
        const actorId = text(context.actorId); const catalogId = text(context.catalogId);
        const locale = context.locale === "ar" ? "ar" : context.locale === "en" ? "en" : null;
        if (companyId && workspaceId && actorId && catalogId && locale) return { type: "Available" as const, context: { companyId, workspaceId, actorId, catalogId, locale } satisfies ProductEntryTrustedClientContext };
      }
      return { type: "Unavailable" as const, code: text(body?.code) ?? "TRUSTED_CONTEXT_UNAVAILABLE" };
    } catch { return { type: "Unavailable" as const, code: "TRUSTED_CONTEXT_UNAVAILABLE" }; }
  }
}
