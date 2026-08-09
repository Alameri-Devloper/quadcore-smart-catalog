import type { ProductEntrySelectedMediaSource } from "../../presentation/product-entry-presentation.types";

export const PRODUCT_ENTRY_BROWSER_MEDIA_LIMITS = Object.freeze({
  maximumFileBytes: 10 * 1024 * 1024,
  acceptedTypes: Object.freeze(["image/jpeg", "image/png", "image/webp"]),
});

export type ProductEntryMediaFileSelectionResult =
  | { readonly type: "Selected"; readonly previewUrl: string }
  | {
      readonly type: "Rejected";
      readonly code: "MEDIA_TYPE_UNSUPPORTED" | "MEDIA_FILE_EMPTY" | "MEDIA_FILE_TOO_LARGE";
    };

interface RegisteredFile {
  readonly file: File;
  readonly previewUrl: string;
  readonly sha256: string | null;
  readonly byteLength: number | null;
}

export interface ProductEntryObjectUrlPort {
  createObjectURL(file: Blob): string;
  revokeObjectURL(url: string): void;
}

const browserObjectUrls: ProductEntryObjectUrlPort = {
  createObjectURL: (file) => URL.createObjectURL(file),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
};

export class ProductEntryMediaFileRegistry {
  private readonly files = new Map<string, RegisteredFile>();

  constructor(private readonly objectUrls: ProductEntryObjectUrlPort = browserObjectUrls) {}

  select(operationId: string, file: File): ProductEntryMediaFileSelectionResult {
    if (!PRODUCT_ENTRY_BROWSER_MEDIA_LIMITS.acceptedTypes.includes(file.type)) {
      return { type: "Rejected", code: "MEDIA_TYPE_UNSUPPORTED" };
    }
    if (file.size <= 0) return { type: "Rejected", code: "MEDIA_FILE_EMPTY" };
    if (file.size > PRODUCT_ENTRY_BROWSER_MEDIA_LIMITS.maximumFileBytes) {
      return { type: "Rejected", code: "MEDIA_FILE_TOO_LARGE" };
    }
    this.remove(operationId);
    const previewUrl = this.objectUrls.createObjectURL(file);
    this.files.set(operationId, { file, previewUrl, sha256: null, byteLength: null });
    return { type: "Selected", previewUrl };
  }

  setHash(operationId: string, sha256: string, byteLength: number, file: File): boolean {
    const selected = this.files.get(operationId);
    if (!selected || selected.file !== file) return false;
    this.files.set(operationId, { ...selected, sha256, byteLength });
    return true;
  }

  getFile(operationId: string): File | null {
    return this.files.get(operationId)?.file ?? null;
  }

  getPreviewUrl(operationId: string): string | null {
    return this.files.get(operationId)?.previewUrl ?? null;
  }

  getSource(operationId: string): ProductEntrySelectedMediaSource | null {
    const selected = this.files.get(operationId);
    return selected?.sha256 && selected.byteLength !== null
      ? { operationId, file: selected.file, sha256: selected.sha256, byteLength: selected.byteLength }
      : null;
  }

  requiredSources(operationIds: readonly string[]):
    | { readonly type: "Ready"; readonly sources: readonly ProductEntrySelectedMediaSource[] }
    | { readonly type: "Missing"; readonly operationIds: readonly string[] } {
    const sources: ProductEntrySelectedMediaSource[] = [];
    const missing: string[] = [];
    for (const operationId of operationIds) {
      const source = this.getSource(operationId);
      if (source) sources.push(source);
      else missing.push(operationId);
    }
    return missing.length > 0 ? { type: "Missing", operationIds: missing } : { type: "Ready", sources };
  }

  remove(operationId: string): void {
    const selected = this.files.get(operationId);
    if (!selected) return;
    this.objectUrls.revokeObjectURL(selected.previewUrl);
    this.files.delete(operationId);
  }

  clear(): void {
    for (const selected of this.files.values()) this.objectUrls.revokeObjectURL(selected.previewUrl);
    this.files.clear();
  }
}
