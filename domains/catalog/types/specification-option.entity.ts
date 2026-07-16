export type SpecificationOptionValue = string | number;

export interface SpecificationOptionEntity {
  id: string;
  specificationOptionSetId: string;
  code: string;
  companyId: string;
  workspaceId: string;
  value: SpecificationOptionValue;
  label: string;
  description?: string;
  sortOrder: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}
