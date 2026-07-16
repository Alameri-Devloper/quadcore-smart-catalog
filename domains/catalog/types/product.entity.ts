export type ProductStatus =
  | "available"
  | "arrived-at-port"
  | "on-the-way"
  | "reserved"
  | "sold"
  | "hidden";

export type ProductCondition = "new" | "used";

export interface ProductEntity {
  id: string;

  code: string;

  companyId: string;

  workspaceId: string;

  productModelId: string;

  brandId: string;

  name: string;

  slug: string;

  description: string;

  price: number;

  currency: string;

  status: ProductStatus;

  isFeatured: boolean;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}
