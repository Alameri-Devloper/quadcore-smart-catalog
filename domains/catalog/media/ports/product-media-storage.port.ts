import type {
  ProductMediaFinalKey,
  ProductMediaStagingKey,
  ProductMediaTrashKey,
} from "../domain/product-media-keys";
import type { NormalizedProductImage } from "./product-image-processor";

export class ProductMediaStorageInfrastructureError extends Error {
  constructor(readonly operation: string) {
    super(`Product media storage infrastructure failed during ${operation}.`);
    this.name = "ProductMediaStorageInfrastructureError";
  }
}

export class ProductMediaStoragePartialOperationError extends Error {
  readonly reconciliationRequired = true;

  constructor(readonly operation: "stage" | "move-to-trash" | "restore-from-trash" | "publish-new" | "publish-replacement") {
    super(`Product media storage partially failed during ${operation}; reconciliation is required.`);
    this.name = "ProductMediaStoragePartialOperationError";
  }
}

export interface ProductMediaIntegrity {
  readonly sha256: string;
  readonly byteLength: number;
  readonly mediaType: "image/webp";
  readonly width: number;
  readonly height: number;
}

export interface StagedProductMediaObject extends ProductMediaIntegrity {
  readonly key: ProductMediaStagingKey;
}

export interface ProductMediaStoredObject extends ProductMediaIntegrity {
  readonly key: ProductMediaFinalKey;
}

export type ProductMediaStorageFailureCode =
  | "UnsafeKey"
  | "TargetConflict"
  | "TemporaryObjectMissing"
  | "FinalObjectMissing"
  | "ChecksumMismatch"
  | "TrashConflict"
  | "ReplacementRestorationFailed";

type Failed = { readonly type: "Failed"; readonly code: ProductMediaStorageFailureCode };

export interface StageProductMediaInput {
  readonly stagingKey: ProductMediaStagingKey;
  readonly image: NormalizedProductImage;
}
export type StageProductMediaResult = { readonly type: "Staged"; readonly object: StagedProductMediaObject } | Failed;

export interface PublishNewProductMediaInput {
  readonly stagedObject: StagedProductMediaObject;
  readonly finalKey: ProductMediaFinalKey;
}
export type PublishNewProductMediaResult = { readonly type: "Published"; readonly object: ProductMediaStoredObject } | Failed;

export interface PublishReplacementProductMediaInput extends PublishNewProductMediaInput {
  readonly trashKey: ProductMediaTrashKey;
}
export type PublishReplacementProductMediaResult = { readonly type: "Replaced"; readonly object: ProductMediaStoredObject } | Failed;

export interface MoveProductMediaToTrashInput {
  readonly finalKey: ProductMediaFinalKey;
  readonly trashKey: ProductMediaTrashKey;
}
export type MoveProductMediaToTrashResult = { readonly type: "MovedToTrash" } | Failed;

export type RestoreProductMediaFromTrashInput = MoveProductMediaToTrashInput;
export type RestoreProductMediaFromTrashResult = { readonly type: "Restored" } | Failed;

export interface DiscardTemporaryProductMediaInput {
  readonly stagingKey: ProductMediaStagingKey;
}
export type DiscardTemporaryProductMediaResult = { readonly type: "Discarded" } | Failed;

export type ProductMediaStoredObjectInspectionResult = { readonly type: "Found"; readonly object: ProductMediaStoredObject } | Failed;
export type ProductMediaExistsResult = { readonly type: "Exists"; readonly exists: boolean } | { readonly type: "Failed"; readonly code: "UnsafeKey" };

export interface ProductMediaStoragePort {
  stage(input: StageProductMediaInput): Promise<StageProductMediaResult>;
  publishNew(input: PublishNewProductMediaInput): Promise<PublishNewProductMediaResult>;
  publishReplacement(input: PublishReplacementProductMediaInput): Promise<PublishReplacementProductMediaResult>;
  moveToTrash(input: MoveProductMediaToTrashInput): Promise<MoveProductMediaToTrashResult>;
  restoreFromTrash(input: RestoreProductMediaFromTrashInput): Promise<RestoreProductMediaFromTrashResult>;
  discardTemporary(input: DiscardTemporaryProductMediaInput): Promise<DiscardTemporaryProductMediaResult>;
  temporaryExists(key: ProductMediaStagingKey): Promise<ProductMediaExistsResult>;
  inspect(key: ProductMediaFinalKey): Promise<ProductMediaStoredObjectInspectionResult>;
  exists(key: ProductMediaFinalKey): Promise<ProductMediaExistsResult>;
}
