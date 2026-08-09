import {
  PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES,
  type ProductEntryMediaHashResult,
  type ProductEntryMediaHashingPort,
} from "../../presentation/product-entry-media-hashing.port";
import type {
  ProductEntryMediaHashWorkerRequest,
  ProductEntryMediaHashWorkerResponse,
} from "./product-entry-media-hash-worker.messages";

export interface ProductEntryHashWorkerLike {
  postMessage(message: ProductEntryMediaHashWorkerRequest): void;
  addEventListener(
    type: "message",
    listener: (event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void,
  ): void;
  addEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  removeEventListener(
    type: "message",
    listener: (event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void,
  ): void;
  removeEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  terminate(): void;
}

interface ProductEntryMediaHashTask {
  readonly requestId: string;
  readonly operationId: string;
  readonly file: File;
  readonly resolve: (result: ProductEntryMediaHashResult) => void;
  active: boolean;
  settled: boolean;
}

export interface WorkerProductEntryMediaHashingAdapterOptions {
  readonly maximumConcurrency?: number;
  readonly workerFactory?: () => ProductEntryHashWorkerLike;
  readonly requestIdFactory?: () => string;
}

const PRODUCT_ENTRY_HASH_WORKER_SOURCE = `
self.addEventListener("message", function (event) {
  var input = event.data;
  Promise.resolve().then(async function () {
    try {
      if (!self.crypto || !self.crypto.subtle || !input.file || input.file.size <= 0) throw new Error("Hashing unavailable");
      var bytes = await input.file.arrayBuffer();
      var digest = await self.crypto.subtle.digest("SHA-256", bytes);
      var sha256 = Array.from(new Uint8Array(digest), function (byte) { return byte.toString(16).padStart(2, "0"); }).join("");
      self.postMessage({ type: "Hashed", requestId: input.requestId, operationId: input.operationId, sha256: sha256, byteLength: input.file.size });
    } catch (_error) {
      self.postMessage({ type: "Failed", requestId: input.requestId, operationId: input.operationId });
    }
  });
});`;

const defaultWorkerFactory = (): ProductEntryHashWorkerLike => {
  const workerUrl = URL.createObjectURL(new Blob([PRODUCT_ENTRY_HASH_WORKER_SOURCE], { type: "text/javascript" }));
  try {
    return new Worker(workerUrl, { name: "qsc-product-entry-media-hash" });
  } finally {
    URL.revokeObjectURL(workerUrl);
  }
};

export class WorkerProductEntryMediaHashingAdapter implements ProductEntryMediaHashingPort {
  private readonly maximumConcurrency: number;
  private readonly requestIdFactory: () => string;
  private worker: ProductEntryHashWorkerLike | null;
  private readonly queue: ProductEntryMediaHashTask[] = [];
  private readonly tasks = new Map<string, ProductEntryMediaHashTask>();
  private readonly latestRequestByOperation = new Map<string, string>();
  private activeCount = 0;
  private disposed = false;
  private runtimeFailed = false;

  constructor(options: WorkerProductEntryMediaHashingAdapterOptions = {}) {
    this.maximumConcurrency = Math.max(1, Math.min(2, options.maximumConcurrency ?? 2));
    this.requestIdFactory = options.requestIdFactory ?? (() => globalThis.crypto.randomUUID());
    try {
      this.worker = options.workerFactory
        ? options.workerFactory()
        : typeof Worker === "undefined" || !globalThis.crypto?.subtle
          ? null
          : defaultWorkerFactory();
    } catch {
      this.worker = null;
    }
    this.worker?.addEventListener("message", this.onMessage);
    this.worker?.addEventListener("error", this.onWorkerFailure);
    this.worker?.addEventListener("messageerror", this.onWorkerFailure);
  }

  hash(operationId: string, file: File): Promise<ProductEntryMediaHashResult> {
    if (this.disposed) {
      return Promise.resolve({
        type: "Rejected",
        operationId,
        code: PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.cancelled,
      });
    }
    if (this.runtimeFailed) {
      return Promise.resolve({
        type: "Rejected",
        operationId,
        code: PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.failed,
      });
    }
    if (!this.worker || !operationId.trim() || !(file instanceof File)) {
      return Promise.resolve({
        type: "Rejected",
        operationId,
        code: PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.unavailable,
      });
    }
    this.cancel(operationId);
    return new Promise((resolve) => {
      const requestId = this.requestIdFactory();
      const task: ProductEntryMediaHashTask = {
        requestId,
        operationId,
        file,
        resolve,
        active: false,
        settled: false,
      };
      this.latestRequestByOperation.set(operationId, requestId);
      this.tasks.set(requestId, task);
      this.queue.push(task);
      this.pump();
    });
  }

  cancel(operationId: string): void {
    const requestId = this.latestRequestByOperation.get(operationId);
    if (!requestId) return;
    const task = this.tasks.get(requestId);
    this.latestRequestByOperation.delete(operationId);
    if (task && !task.settled) {
      task.settled = true;
      task.resolve({
        type: "Rejected",
        operationId,
        code: PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.cancelled,
      });
      if (!task.active) this.tasks.delete(requestId);
    }
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const task of this.tasks.values()) {
      if (!task.settled) {
        task.settled = true;
        task.resolve({
          type: "Rejected",
          operationId: task.operationId,
          code: PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.cancelled,
        });
      }
    }
    this.tasks.clear();
    this.queue.length = 0;
    this.latestRequestByOperation.clear();
    this.activeCount = 0;
    this.teardownWorker();
  }

  private readonly onMessage = (
    event: MessageEvent<ProductEntryMediaHashWorkerResponse>,
  ): void => {
    const response = event.data;
    const task = this.tasks.get(response.requestId);
    if (!task) return;
    this.tasks.delete(response.requestId);
    if (task.active) this.activeCount = Math.max(0, this.activeCount - 1);
    const isLatest = this.latestRequestByOperation.get(task.operationId) === task.requestId;
    if (isLatest) this.latestRequestByOperation.delete(task.operationId);
    if (!task.settled) {
      task.settled = true;
      task.resolve(response.type === "Hashed" && isLatest
        ? {
            type: "Hashed",
            operationId: response.operationId,
            sha256: response.sha256,
            byteLength: response.byteLength,
          }
        : {
            type: "Rejected",
            operationId: task.operationId,
            code: isLatest
              ? PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.failed
              : PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.cancelled,
          });
    }
    this.pump();
  };

  private readonly onWorkerFailure = (): void => {
    this.failTerminally();
  };

  private failTerminally(): void {
    if (this.disposed || this.runtimeFailed) return;
    this.runtimeFailed = true;
    for (const task of this.tasks.values()) {
      if (task.settled) continue;
      task.settled = true;
      task.resolve({
        type: "Rejected",
        operationId: task.operationId,
        code: PRODUCT_ENTRY_MEDIA_HASH_FAILURE_CODES.failed,
      });
    }
    this.tasks.clear();
    this.queue.length = 0;
    this.latestRequestByOperation.clear();
    this.activeCount = 0;
    this.teardownWorker();
  }

  private teardownWorker(): void {
    const worker = this.worker;
    if (!worker) return;
    worker.removeEventListener("message", this.onMessage);
    worker.removeEventListener("error", this.onWorkerFailure);
    worker.removeEventListener("messageerror", this.onWorkerFailure);
    worker.terminate();
    this.worker = null;
  }

  private pump(): void {
    if (!this.worker || this.disposed) return;
    while (this.activeCount < this.maximumConcurrency) {
      const task = this.queue.shift();
      if (!task) return;
      if (task.settled) {
        this.tasks.delete(task.requestId);
        continue;
      }
      task.active = true;
      this.activeCount += 1;
      try {
        this.worker.postMessage({
          requestId: task.requestId,
          operationId: task.operationId,
          file: task.file,
        });
      } catch {
        this.failTerminally();
        return;
      }
    }
  }
}
