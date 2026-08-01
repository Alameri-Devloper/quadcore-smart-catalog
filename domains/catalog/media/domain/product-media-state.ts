import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";

export interface ProductMediaItem {
  readonly mediaId: string;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly storageArtifactKey: string;
  readonly checksumSha256?: string;
  readonly mimeType?: "image/webp";
  readonly displayOrder: number;
  readonly createdAt: Date;
  readonly createdBy: string;
}

export interface ProductMediaState {
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  revision: number;
  coverMediaId?: string;
  updatedAt: Date;
  updatedBy: string;
  items: ProductMediaItem[];
}

export const resolveProductMediaCover = (
  items: readonly ProductMediaItem[],
  selectedMediaId?: string,
  previousCoverMediaId?: string,
): string | undefined => {
  const ids = new Set(items.map((item) => item.mediaId));
  if (selectedMediaId && ids.has(selectedMediaId)) return selectedMediaId;
  if (previousCoverMediaId && ids.has(previousCoverMediaId)) return previousCoverMediaId;
  return [...items].sort((left, right) =>
    left.displayOrder - right.displayOrder ||
    left.createdAt.getTime() - right.createdAt.getTime() ||
    left.mediaId.localeCompare(right.mediaId),
  )[0]?.mediaId;
};

export const reorderProductMedia = (items: readonly ProductMediaItem[], orderedMediaIds: readonly string[]): ProductMediaItem[] => {
  if (new Set(orderedMediaIds).size !== orderedMediaIds.length || orderedMediaIds.some((id) => !items.some((item) => item.mediaId === id))) {
    throw new Error("Product media reorder contains invalid Media identity.");
  }
  const requested = new Map(orderedMediaIds.map((id, index) => [id, index]));
  return items.map((item) => Object.freeze({ ...item, displayOrder: requested.get(item.mediaId) ?? orderedMediaIds.length + item.displayOrder }));
};
