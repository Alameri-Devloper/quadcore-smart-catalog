import type { ImageBackgroundProcessingPort } from "../ports/image-background-processing.port";
import type { ProductEntryImageReference } from "../product-entry.types";

const ACCEPTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const unavailableProcessor: ImageBackgroundProcessingPort = {
  available: false,
  async process() {
    throw new Error("White-background processing is available in a Future Version.");
  },
};

const normalize = (images: readonly ProductEntryImageReference[]) => {
  const ordered = [...images].sort((left, right) => left.sortOrder - right.sortOrder);
  const mainId = ordered.find((image) => image.isPrimary)?.id ?? ordered[0]?.id;
  return ordered.map((image, index) => ({
    ...image,
    isPrimary: image.id === mainId,
    sortOrder: index + 1,
  }));
};

const fileMatches = (image: ProductEntryImageReference, file: File) =>
  image.fileName === file.name &&
  image.mimeType === file.type &&
  image.sizeBytes === file.size &&
  image.lastModified === file.lastModified;

export interface ProductEntryImageSelectionIssue {
  fileName: string;
  message: string;
}

export class ProductEntryImagesService {
  constructor(private readonly processor: ImageBackgroundProcessingPort) {}

  isProcessingAvailable() {
    return this.processor.available;
  }

  createReferences(
    files: readonly File[],
    existing: readonly ProductEntryImageReference[],
  ): { images: ProductEntryImageReference[]; issues: ProductEntryImageSelectionIssue[] } {
    const images: ProductEntryImageReference[] = [];
    const issues: ProductEntryImageSelectionIssue[] = [];
    const now = new Date().toISOString();

    for (const file of files) {
      if (!ACCEPTED_IMAGE_TYPES.has(file.type)) {
        issues.push({ fileName: file.name, message: "Choose a JPG, PNG, or WebP image." });
        continue;
      }
      if (file.size === 0) {
        issues.push({ fileName: file.name, message: "This image file is empty." });
        continue;
      }
      const restoredImage = existing.find(
        (image) => image.previewAvailability === "reselection-required" && fileMatches(image, file),
      );
      if (restoredImage) {
        images.push({
          ...restoredImage,
          originalPreviewUrl: URL.createObjectURL(file),
          selectedDisplayVersion: "original",
          processingStatus: "pending",
          processingError: undefined,
          previewAvailability: "available",
          updatedAt: now,
        });
        continue;
      }
      if ([...existing, ...images].some((image) => fileMatches(image, file))) {
        issues.push({ fileName: file.name, message: "This image has already been added." });
        continue;
      }

      let id = crypto.randomUUID();
      while ([...existing, ...images].some((image) => image.id === id)) id = crypto.randomUUID();
      images.push({
        id,
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        lastModified: file.lastModified,
        originalPreviewUrl: URL.createObjectURL(file),
        selectedDisplayVersion: "original",
        processingStatus: "pending",
        isPrimary: existing.length === 0 && images.length === 0,
        sortOrder: existing.length + images.length + 1,
        imagePurpose: "catalog-product",
        previewAvailability: "available",
        createdAt: now,
        updatedAt: now,
      });
    }
    return { images, issues };
  }

  prepareForDraft(images: readonly ProductEntryImageReference[]) {
    return images.map((image) => {
      const originalIsTemporary = image.originalPreviewUrl.startsWith("blob:");
      const processedIsTemporary = image.processedPreviewUrl?.startsWith("blob:") ?? false;
      const processedPreviewUrl = processedIsTemporary ? undefined : image.processedPreviewUrl;
      const processingStatus = image.processingStatus === "processing" ? "pending" as const : image.processingStatus;
      const canKeepProcessedSelection =
        image.selectedDisplayVersion === "processed" &&
        processingStatus === "ready" &&
        Boolean(processedPreviewUrl);
      return {
        ...image,
        originalPreviewUrl: originalIsTemporary ? "" : image.originalPreviewUrl,
        processedPreviewUrl,
        selectedDisplayVersion: canKeepProcessedSelection ? "processed" as const : "original" as const,
        processingStatus,
        processingError: processingStatus === "failed" ? image.processingError : undefined,
        previewAvailability: originalIsTemporary ? "reselection-required" as const : image.previewAvailability,
      };
    });
  }

  remove(images: readonly ProductEntryImageReference[], imageId: string) {
    const removed = images.find((image) => image.id === imageId);
    if (removed?.originalPreviewUrl.startsWith("blob:")) URL.revokeObjectURL(removed.originalPreviewUrl);
    if (removed?.processedPreviewUrl?.startsWith("blob:")) URL.revokeObjectURL(removed.processedPreviewUrl);
    return normalize(images.filter((image) => image.id !== imageId));
  }

  setPrimary(images: readonly ProductEntryImageReference[], imageId: string) {
    return normalize(images.map((image) => ({ ...image, isPrimary: image.id === imageId })));
  }

  move(images: readonly ProductEntryImageReference[], imageId: string, direction: -1 | 1) {
    const ordered = normalize(images);
    const index = ordered.findIndex((image) => image.id === imageId);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= ordered.length) return ordered;
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    return ordered.map((image, sortIndex) => ({ ...image, sortOrder: sortIndex + 1 }));
  }

  useOriginal(image: ProductEntryImageReference): ProductEntryImageReference {
    return { ...image, selectedDisplayVersion: "original", updatedAt: new Date().toISOString() };
  }

  useProcessed(image: ProductEntryImageReference): ProductEntryImageReference {
    return image.processingStatus === "ready" && Boolean(image.processedPreviewUrl)
      ? { ...image, selectedDisplayVersion: "processed", updatedAt: new Date().toISOString() }
      : image;
  }

  skip(image: ProductEntryImageReference): ProductEntryImageReference {
    return {
      ...image,
      selectedDisplayVersion: "original",
      processingStatus: "skipped",
      processingError: undefined,
      updatedAt: new Date().toISOString(),
    };
  }
}

export const productEntryImagesService = new ProductEntryImagesService(unavailableProcessor);
