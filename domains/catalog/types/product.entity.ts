export type ProductStatus = "available" | "reserved" | "sold" | "hidden";

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
