import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { DepartmentStorageSegment, ProductMediaStorageRootKey } from "./product-media-keys";
import { ProductMediaPathPolicy } from "../services/product-media-path-policy";

export interface NewProductMediaRootInput {
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly departmentSegment: DepartmentStorageSegment;
  readonly productCode?: string | null;
  readonly productName?: string | null;
  readonly createdAt: Date;
}

export interface RehydrateProductMediaRootInput {
  readonly workspaceId: WorkspaceId;
  readonly productId: ProductId;
  readonly storageRootKey: ProductMediaStorageRootKey;
  readonly createdAt: Date;
}

const assertCreatedAt = (createdAt: Date): void => {
  if (!(createdAt instanceof Date) || Number.isNaN(createdAt.getTime())) {
    throw new Error("ProductMediaRoot createdAt must be valid.");
  }
};

const assertIdentityBinding = async (input: Pick<RehydrateProductMediaRootInput, "workspaceId" | "productId" | "storageRootKey">): Promise<void> => {
  const segments = input.storageRootKey.value.split("/");
  if (segments[1] !== await ProductMediaPathPolicy.workspaceSegment(input.workspaceId)) {
    throw new Error("ProductMediaRoot Workspace identity does not match its storage root.");
  }
  const suffix = segments[3]?.slice(-16);
  if (suffix !== await ProductMediaPathPolicy.productIdSuffix(input.productId)) {
    throw new Error("ProductMediaRoot Product identity does not match its storage root.");
  }
};

export class ProductMediaRoot {
  private readonly internalCreatedAt: Date;

  private constructor(
    readonly workspaceId: WorkspaceId,
    readonly productId: ProductId,
    readonly storageRootKey: ProductMediaStorageRootKey,
    createdAt: Date,
  ) {
    this.internalCreatedAt = new Date(createdAt.getTime());
    Object.freeze(this);
  }

  static async createNew(input: NewProductMediaRootInput): Promise<ProductMediaRoot> {
    assertCreatedAt(input.createdAt);
    const storageRootKey = await ProductMediaPathPolicy.storageRoot(input);
    await assertIdentityBinding({ ...input, storageRootKey });
    return new ProductMediaRoot(input.workspaceId, input.productId, storageRootKey, input.createdAt);
  }

  static async rehydrate(input: RehydrateProductMediaRootInput): Promise<ProductMediaRoot> {
    assertCreatedAt(input.createdAt);
    await assertIdentityBinding(input);
    return new ProductMediaRoot(input.workspaceId, input.productId, input.storageRootKey, input.createdAt);
  }

  get createdAt(): Date {
    return new Date(this.internalCreatedAt.getTime());
  }
}
