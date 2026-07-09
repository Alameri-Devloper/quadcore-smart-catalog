export type SpecificationValue = string | number | boolean;

export interface SpecificationValueEntity {
  id: string;

  code: string;

  companyId: string;

  workspaceId: string;

  productId: string;

  specificationFieldId: string;

  value: SpecificationValue;

  createdAt: string;

  updatedAt: string;
}
