"use client";

import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ProductEntryMediaFileRegistry } from "../infrastructure/browser/product-entry-media-file.registry";
import { WorkerProductEntryMediaHashingAdapter } from "../infrastructure/browser/worker-product-entry-media-hashing.adapter";
import type { ProductEntryMediaHashResult } from "../presentation/product-entry-media-hashing.port";
import type { ProductEntrySelectedMediaSource } from "../presentation/product-entry-presentation.types";

interface ProductEntryBrowserMediaValue {
  select(operationId: string, file: File): Promise<ProductEntryMediaHashResult>;
  previewUrl(operationId: string): string | null;
  remove(operationId: string): void;
  clear(): void;
  requiredSources(operationIds: readonly string[]):
    | { readonly type: "Ready"; readonly sources: readonly ProductEntrySelectedMediaSource[] }
    | { readonly type: "Missing"; readonly operationIds: readonly string[] };
}

const ProductEntryBrowserMediaContext = createContext<ProductEntryBrowserMediaValue | null>(null);

export function ProductEntryBrowserMediaProvider({ children }: { readonly children: ReactNode }) {
  const [registry] = useState(() => new ProductEntryMediaFileRegistry());
  const [hasher] = useState(() => new WorkerProductEntryMediaHashingAdapter());
  const [, render] = useState(0);

  useEffect(() => () => {
    hasher.dispose();
    registry.clear();
  }, [hasher, registry]);

  const value = useMemo<ProductEntryBrowserMediaValue>(() => ({
    async select(operationId, file) {
      const selected = registry.select(operationId, file);
      render((current) => current + 1);
      if (selected.type === "Rejected") {
        return { type: "Rejected", operationId, code: "MEDIA_HASH_FAILED" };
      }
      const result = await hasher.hash(operationId, file);
      if (result.type === "Hashed" && !registry.setHash(
        operationId,
        result.sha256,
        result.byteLength,
        file,
      )) {
        return { type: "Rejected", operationId, code: "MEDIA_HASH_CANCELLED" };
      }
      render((current) => current + 1);
      return result;
    },
    previewUrl: (operationId) => registry.getPreviewUrl(operationId),
    remove(operationId) {
      hasher.cancel(operationId);
      registry.remove(operationId);
      render((current) => current + 1);
    },
    clear() {
      registry.clear();
      render((current) => current + 1);
    },
    requiredSources: (operationIds) => registry.requiredSources(operationIds),
  }), [hasher, registry]);

  return (
    <ProductEntryBrowserMediaContext.Provider value={value}>
      {children}
    </ProductEntryBrowserMediaContext.Provider>
  );
}

export function useProductEntryBrowserMedia(): ProductEntryBrowserMediaValue {
  const value = useContext(ProductEntryBrowserMediaContext);
  if (!value) throw new Error("Product Entry browser media must be used within its provider.");
  return value;
}
