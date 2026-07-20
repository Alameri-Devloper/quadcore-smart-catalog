import type { ProductCode } from "../types/product-code.value-object";
import type {
  ProductId,
  WorkspaceId,
} from "../types/product-identity.value-object";
import type { ProductRevision } from "../types/product-revision.value-object";

export const PRODUCT_CREATE_OUTCOMES = {
  created: "Created",
  productIdConflict: "ProductIdConflict",
  productCodeConflict: "ProductCodeConflict",
} as const;

export interface ProductCreatedResult {
  readonly outcome: typeof PRODUCT_CREATE_OUTCOMES.created;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly persistedRevision: ProductRevision;
}

export interface ProductCreateProductIdConflictResult {
  readonly outcome: typeof PRODUCT_CREATE_OUTCOMES.productIdConflict;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
}

export interface ProductCreateProductCodeConflictResult {
  readonly outcome: typeof PRODUCT_CREATE_OUTCOMES.productCodeConflict;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly productCode: ProductCode;
}

export type ProductCreateResult =
  | ProductCreatedResult
  | ProductCreateProductIdConflictResult
  | ProductCreateProductCodeConflictResult;

export const ProductCreateResult = Object.freeze({
  created(
    workspaceId: WorkspaceId,
    productId: ProductId,
    persistedRevision: ProductRevision,
  ): ProductCreatedResult {
    return Object.freeze({
      outcome: PRODUCT_CREATE_OUTCOMES.created,
      workspaceId,
      productId,
      persistedRevision,
    });
  },

  productIdConflict(
    workspaceId: WorkspaceId,
    productId: ProductId,
  ): ProductCreateProductIdConflictResult {
    return Object.freeze({
      outcome: PRODUCT_CREATE_OUTCOMES.productIdConflict,
      workspaceId,
      productId,
    });
  },

  productCodeConflict(
    workspaceId: WorkspaceId,
    productId: ProductId,
    productCode: ProductCode,
  ): ProductCreateProductCodeConflictResult {
    return Object.freeze({
      outcome: PRODUCT_CREATE_OUTCOMES.productCodeConflict,
      workspaceId,
      productId,
      productCode,
    });
  },
});

export const PRODUCT_UPDATE_OUTCOMES = {
  updated: "Updated",
  productNotFound: "ProductNotFound",
  revisionConflict: "RevisionConflict",
  productCodeConflict: "ProductCodeConflict",
} as const;

export interface ProductUpdatedResult {
  readonly outcome: typeof PRODUCT_UPDATE_OUTCOMES.updated;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly persistedRevision: ProductRevision;
}

export interface ProductUpdateNotFoundResult {
  readonly outcome: typeof PRODUCT_UPDATE_OUTCOMES.productNotFound;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
}

export interface ProductRevisionConflictResult {
  readonly outcome: typeof PRODUCT_UPDATE_OUTCOMES.revisionConflict;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly expectedRevision: ProductRevision;
  readonly actualPersistedRevision: ProductRevision;
}

export interface ProductUpdateProductCodeConflictResult {
  readonly outcome: typeof PRODUCT_UPDATE_OUTCOMES.productCodeConflict;
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly productCode: ProductCode;
}

export type ProductUpdateResult =
  | ProductUpdatedResult
  | ProductUpdateNotFoundResult
  | ProductRevisionConflictResult
  | ProductUpdateProductCodeConflictResult;

export const ProductUpdateResult = Object.freeze({
  updated(
    workspaceId: WorkspaceId,
    productId: ProductId,
    persistedRevision: ProductRevision,
  ): ProductUpdatedResult {
    return Object.freeze({
      outcome: PRODUCT_UPDATE_OUTCOMES.updated,
      workspaceId,
      productId,
      persistedRevision,
    });
  },

  productNotFound(
    workspaceId: WorkspaceId,
    productId: ProductId,
  ): ProductUpdateNotFoundResult {
    return Object.freeze({
      outcome: PRODUCT_UPDATE_OUTCOMES.productNotFound,
      workspaceId,
      productId,
    });
  },

  revisionConflict(
    workspaceId: WorkspaceId,
    productId: ProductId,
    expectedRevision: ProductRevision,
    actualPersistedRevision: ProductRevision,
  ): ProductRevisionConflictResult {
    return Object.freeze({
      outcome: PRODUCT_UPDATE_OUTCOMES.revisionConflict,
      workspaceId,
      productId,
      expectedRevision,
      actualPersistedRevision,
    });
  },

  productCodeConflict(
    workspaceId: WorkspaceId,
    productId: ProductId,
    productCode: ProductCode,
  ): ProductUpdateProductCodeConflictResult {
    return Object.freeze({
      outcome: PRODUCT_UPDATE_OUTCOMES.productCodeConflict,
      workspaceId,
      productId,
      productCode,
    });
  },
});
