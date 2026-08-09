import type { ProductEntryImageReference } from "../product-entry.types";
import type { ProductEntryLocalDraftMediaDescriptor } from "../drafts/product-entry-local-draft.types";
import { PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY } from "../drafts/product-entry-local-draft.types";

const active = (image: ProductEntryImageReference): boolean => image.operationType !== "Remove";

const normalize = (
  images: readonly ProductEntryImageReference[],
): ProductEntryImageReference[] => {
  const visible = [...images]
    .filter(active)
    .sort((left, right) => left.sortOrder - right.sortOrder);
  const removed = images.filter((image) => !active(image));
  const primaryId = visible.find((image) => image.isPrimary)?.id ?? visible[0]?.id;
  return [
    ...visible.map((image, index) => ({
      ...image,
      sortOrder: index + 1,
      isPrimary: image.id === primaryId,
    })),
    ...removed.map((image, index) => ({
      ...image,
      sortOrder: visible.length + index + 1,
      isPrimary: false,
    })),
  ];
};

export interface ProductEntryMediaFileMetadata {
  readonly fileName: string;
  readonly mimeType: string;
  readonly byteLength: number;
}

export interface ProductEntryImageSelectionIssue {
  readonly fileName: string;
  readonly code: "MEDIA_TYPE_UNSUPPORTED" | "MEDIA_FILE_EMPTY" | "MEDIA_FILE_TOO_LARGE";
}

export class ProductEntryImagesService {
  constructor(private readonly operationIdFactory: () => string = () => globalThis.crypto.randomUUID()) {}

  createExisting(
    images: readonly {
      readonly mediaId: string;
      readonly displayOrder: number;
      readonly isMain: boolean;
    }[],
  ): ProductEntryImageReference[] {
    return normalize(images.map((image) => ({
      id: `media:${image.mediaId}`,
      operationId: null,
      operationType: null,
      mediaId: image.mediaId,
      originalIsPrimary: image.isMain,
      originalSortOrder: image.displayOrder + 1,
      reorderOperationId: null,
      setCoverOperationId: null,
      isPrimary: image.isMain,
      sortOrder: image.displayOrder + 1,
      fileName: null,
      mimeType: null,
      sizeBytes: null,
      expectedSourceSha256: null,
      expectedSourceByteLength: null,
      sourceAvailability: "NotRequired",
      hashStatus: "NotRequired",
      sourceErrorCode: null,
    })));
  }

  add(
    images: readonly ProductEntryImageReference[],
    files: readonly ProductEntryMediaFileMetadata[],
  ): ProductEntryImageReference[] {
    const additions: ProductEntryImageReference[] = [];
    for (const [index, file] of files.entries()) {
      const operationId = this.uniqueOperationId([...images, ...additions]);
      additions.push({
        id: `operation:${operationId}`,
        operationId,
        operationType: "Add",
        mediaId: null,
        originalIsPrimary: null,
        originalSortOrder: null,
        reorderOperationId: null,
        setCoverOperationId: null,
        isPrimary: images.filter(active).length === 0 && index === 0,
        sortOrder: images.filter(active).length + index + 1,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.byteLength,
        expectedSourceSha256: null,
        expectedSourceByteLength: null,
        sourceAvailability: "AvailableInCurrentSession",
        hashStatus: "Pending",
        sourceErrorCode: null,
      });
    }
    return this.normalizeWithMetadata([...images, ...additions]);
  }

  replace(
    images: readonly ProductEntryImageReference[],
    imageId: string,
    file: ProductEntryMediaFileMetadata,
  ): ProductEntryImageReference[] {
    return this.normalizeWithMetadata(images.map((image) => {
      if (image.id !== imageId || image.operationType === "Remove") return image;
      if (image.operationType === "Add") {
        return {
          ...image,
          fileName: file.fileName,
          mimeType: file.mimeType,
          sizeBytes: file.byteLength,
          expectedSourceSha256: null,
          expectedSourceByteLength: null,
          sourceAvailability: "AvailableInCurrentSession",
          hashStatus: "Pending",
          sourceErrorCode: null,
        };
      }
      const operationId = image.operationId ?? this.uniqueOperationId(images);
      return {
        ...image,
        id: `operation:${operationId}`,
        operationId,
        operationType: "Replace" as const,
        reorderOperationId: null,
        setCoverOperationId: null,
        fileName: file.fileName,
        mimeType: file.mimeType,
        sizeBytes: file.byteLength,
        expectedSourceSha256: null,
        expectedSourceByteLength: null,
        sourceAvailability: "AvailableInCurrentSession" as const,
        hashStatus: "Pending" as const,
        sourceErrorCode: null,
      };
    }));
  }

  applyHash(
    images: readonly ProductEntryImageReference[],
    operationId: string,
    sha256: string,
    byteLength: number,
  ): { readonly images: ProductEntryImageReference[]; readonly matchedPersistedSource: boolean } {
    let matchedPersistedSource = true;
    const next = images.map((image) => {
      if (image.operationId !== operationId || image.operationType === "Remove") return image;
      if (
        image.expectedSourceSha256 !== null &&
        (image.expectedSourceSha256 !== sha256 || image.expectedSourceByteLength !== byteLength)
      ) {
        matchedPersistedSource = false;
        return {
          ...image,
          sourceAvailability: "RequiresReselection" as const,
          hashStatus: "Failed" as const,
          sourceErrorCode: "MEDIA_RESELECTED_SOURCE_MISMATCH",
        };
      }
      return {
        ...image,
        expectedSourceSha256: sha256,
        expectedSourceByteLength: byteLength,
        sourceAvailability: "AvailableInCurrentSession" as const,
        hashStatus: "Ready" as const,
        sourceErrorCode: null,
      };
    });
    return { images: this.normalizeWithMetadata(next), matchedPersistedSource };
  }

  markHashing(
    images: readonly ProductEntryImageReference[],
    operationId: string,
  ): ProductEntryImageReference[] {
    return images.map((image) => image.operationId === operationId
      ? { ...image, hashStatus: "Hashing" }
      : image);
  }

  markHashFailed(
    images: readonly ProductEntryImageReference[],
    operationId: string,
    code: string,
  ): ProductEntryImageReference[] {
    return images.map((image) => image.operationId === operationId
      ? {
          ...image,
          sourceAvailability: "RequiresReselection",
          hashStatus: "Failed",
          sourceErrorCode: code,
        }
      : image);
  }

  remove(images: readonly ProductEntryImageReference[], imageId: string): ProductEntryImageReference[] {
    const target = images.find((image) => image.id === imageId);
    if (!target) return this.normalizeWithMetadata(images);
    if (target.operationType === "Add") return this.normalizeWithMetadata(images.filter((image) => image.id !== imageId));
    if (!target.mediaId) return this.normalizeWithMetadata(images.filter((image) => image.id !== imageId));
    const operationId = target.operationId ?? this.uniqueOperationId(images);
    return this.normalizeWithMetadata(images.map((image) => image.id === imageId
      ? {
          ...image,
          id: `operation:${operationId}`,
          operationId,
          operationType: "Remove" as const,
          reorderOperationId: null,
          setCoverOperationId: null,
          isPrimary: false,
          fileName: null,
          mimeType: null,
          sizeBytes: null,
          expectedSourceSha256: null,
          expectedSourceByteLength: null,
          sourceAvailability: "NotRequired" as const,
          hashStatus: "NotRequired" as const,
          sourceErrorCode: null,
        }
      : image));
  }

  setPrimary(images: readonly ProductEntryImageReference[], imageId: string): ProductEntryImageReference[] {
    return this.normalizeWithMetadata(images.map((image) => ({
      ...image,
      isPrimary: active(image) && image.id === imageId ||
        (image.id.startsWith("operation:") && imageId.startsWith("media:") && image.mediaId === imageId.slice(6)),
    })));
  }

  move(
    images: readonly ProductEntryImageReference[],
    imageId: string,
    direction: -1 | 1,
  ): ProductEntryImageReference[] {
    const visible = images.filter(active).sort((left, right) => left.sortOrder - right.sortOrder);
    const index = visible.findIndex((image) => image.id === imageId ||
      (image.id.startsWith("operation:") && imageId.startsWith("media:") && image.mediaId === imageId.slice(6)));
    const target = index + direction;
    if (index < 0 || target < 0 || target >= visible.length) return this.normalizeWithMetadata(images);
    [visible[index], visible[target]] = [visible[target], visible[index]];
    const moved = visible.map((image, sortIndex) => ({ ...image, sortOrder: sortIndex + 1 }));
    return this.normalizeWithMetadata([...moved, ...images.filter((image) => !active(image))]);
  }

  restore(
    serverImages: readonly ProductEntryImageReference[],
    descriptors: readonly ProductEntryLocalDraftMediaDescriptor[],
  ): ProductEntryImageReference[] {
    let restored = [...serverImages];
    for (const descriptor of descriptors.filter((candidate) =>
      candidate.operationType === "Add" || candidate.operationType === "Replace" || candidate.operationType === "Remove")) {
      const targetIndex = descriptor.mediaId
        ? restored.findIndex((image) => image.mediaId === descriptor.mediaId)
        : -1;
      const target = targetIndex >= 0 ? restored[targetIndex] : null;
      const operation: ProductEntryImageReference = {
        ...(target ?? {}),
        id: `operation:${descriptor.operationId}`,
        operationId: descriptor.operationId,
        operationType: descriptor.operationType,
        mediaId: descriptor.mediaId,
        originalIsPrimary: target?.originalIsPrimary ?? null,
        originalSortOrder: target?.originalSortOrder ?? null,
        reorderOperationId: null,
        setCoverOperationId: null,
        isPrimary: descriptor.operationType !== "Remove" && descriptor.selectedAsCover,
        sortOrder: (descriptor.finalOrder ?? descriptor.requestedDisplayOrder ?? descriptor.sequence) + 1,
        fileName: descriptor.fileName,
        mimeType: descriptor.mimeType,
        sizeBytes: descriptor.expectedSourceByteLength,
        expectedSourceSha256: descriptor.expectedSourceSha256,
        expectedSourceByteLength: descriptor.expectedSourceByteLength,
        sourceAvailability: descriptor.sourceAvailability,
        hashStatus: descriptor.operationType === "Remove" ? "NotRequired" : "Pending",
        sourceErrorCode: null,
      };
      if (targetIndex >= 0) restored.splice(targetIndex, 1, operation);
      else restored.push(operation);
    }
    for (const descriptor of descriptors.filter((candidate) => candidate.operationType === "Reorder")) {
      restored = restored.map((image) => image.mediaId === descriptor.mediaId && image.operationType === null
        ? {
            ...image,
            sortOrder: descriptor.finalOrder! + 1,
            reorderOperationId: descriptor.operationId,
          }
        : image);
    }
    const setCover = descriptors.find((candidate) => candidate.operationType === "SetCover");
    if (setCover) {
      restored = restored.map((image) => ({
        ...image,
        isPrimary: active(image) && image.mediaId === setCover.mediaId,
        setCoverOperationId: image.mediaId === setCover.mediaId && image.operationType === null
          ? setCover.operationId
          : null,
      }));
    }
    return normalize(restored);
  }

  toLocalDraftDescriptors(
    images: readonly ProductEntryImageReference[],
  ): readonly ProductEntryLocalDraftMediaDescriptor[] {
    const descriptors: Omit<ProductEntryLocalDraftMediaDescriptor, "sequence">[] = [];
    for (const image of images) {
      if (image.operationId !== null && image.operationType !== null) {
        const sourceOperation = image.operationType === "Add" || image.operationType === "Replace";
        descriptors.push({
          operationId: image.operationId,
          operationType: image.operationType,
          mediaId: image.mediaId,
          requestedDisplayOrder: sourceOperation ? image.sortOrder - 1 : null,
          selectedAsCover: sourceOperation && image.isPrimary,
          expectedSourceSha256: sourceOperation ? image.expectedSourceSha256 : null,
          expectedSourceByteLength: sourceOperation ? image.expectedSourceByteLength : null,
          finalOrder: sourceOperation ? image.sortOrder - 1 : null,
          fileName: sourceOperation ? image.fileName : null,
          mimeType: sourceOperation ? image.mimeType : null,
          sourceAvailability: sourceOperation
            ? image.sourceAvailability
            : PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired,
        });
      }
    }
    for (const image of images.filter(active).sort((left, right) => left.sortOrder - right.sortOrder)) {
      if (image.reorderOperationId && image.mediaId && image.operationType === null) {
        descriptors.push({
          operationId: image.reorderOperationId,
          operationType: "Reorder",
          mediaId: image.mediaId,
          requestedDisplayOrder: image.sortOrder - 1,
          selectedAsCover: false,
          expectedSourceSha256: null,
          expectedSourceByteLength: null,
          finalOrder: image.sortOrder - 1,
          fileName: null,
          mimeType: null,
          sourceAvailability: PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired,
        });
      }
    }
    const cover = images.find((image) => active(image) && image.isPrimary
      && image.setCoverOperationId && image.mediaId && image.operationType === null);
    if (cover?.setCoverOperationId && cover.mediaId) {
      descriptors.push({
        operationId: cover.setCoverOperationId,
        operationType: "SetCover",
        mediaId: cover.mediaId,
        requestedDisplayOrder: null,
        selectedAsCover: true,
        expectedSourceSha256: null,
        expectedSourceByteLength: null,
        finalOrder: null,
        fileName: null,
        mimeType: null,
        sourceAvailability: PRODUCT_ENTRY_LOCAL_MEDIA_SOURCE_AVAILABILITY.notRequired,
      });
    }
    return descriptors.map((descriptor, sequence) => ({ ...descriptor, sequence }));
  }

  private normalizeWithMetadata(
    images: readonly ProductEntryImageReference[],
  ): ProductEntryImageReference[] {
    const normalized = normalize(images);
    const next: ProductEntryImageReference[] = [];
    const sourceCarriesCover = normalized.some((image) => active(image) && image.isPrimary
      && (image.operationType === "Add" || image.operationType === "Replace"));
    for (const image of normalized) {
      if (!active(image) || !image.mediaId || image.operationType !== null) {
        next.push({ ...image, reorderOperationId: null, setCoverOperationId: null });
        continue;
      }
      const needsReorder = image.originalSortOrder !== null && image.sortOrder !== image.originalSortOrder;
      const needsSetCover = !sourceCarriesCover && image.isPrimary && image.originalIsPrimary === false;
      const reorderOperationId = needsReorder
        ? image.reorderOperationId ?? this.uniqueOperationId([...normalized, ...next])
        : null;
      const provisional = { ...image, reorderOperationId };
      next.push({
        ...provisional,
        setCoverOperationId: needsSetCover
          ? image.setCoverOperationId ?? this.uniqueOperationId([...normalized, ...next, provisional])
          : null,
      });
    }
    return next;
  }

  private usedOperationIds(image: ProductEntryImageReference): readonly (string | null)[] {
    return [image.operationId, image.reorderOperationId, image.setCoverOperationId];
  }

  private uniqueOperationId(images: readonly ProductEntryImageReference[]): string {
    let id = this.operationIdFactory();
    while (!id.trim() || images.some((image) => this.usedOperationIds(image).includes(id))) id = this.operationIdFactory();
    return id;
  }
}

export const productEntryImagesService = new ProductEntryImagesService();
