/// <reference lib="webworker" />

import type {
  ProductEntryMediaHashWorkerRequest,
  ProductEntryMediaHashWorkerResponse,
} from "./product-entry-media-hash-worker.messages";
import { computeProductEntryMediaHash } from "./product-entry-media-hash";

const workerScope = self as DedicatedWorkerGlobalScope;

workerScope.addEventListener("message", (event: MessageEvent<ProductEntryMediaHashWorkerRequest>) => {
  const { requestId, operationId, file } = event.data;
  void (async () => {
    try {
      const hash = await computeProductEntryMediaHash(file, workerScope.crypto);
      const response: ProductEntryMediaHashWorkerResponse = {
        type: "Hashed",
        requestId,
        operationId,
        sha256: hash.sha256,
        byteLength: hash.byteLength,
      };
      workerScope.postMessage(response);
    } catch {
      const response: ProductEntryMediaHashWorkerResponse = {
        type: "Failed",
        requestId,
        operationId,
      };
      workerScope.postMessage(response);
    }
  })();
});

export {};
