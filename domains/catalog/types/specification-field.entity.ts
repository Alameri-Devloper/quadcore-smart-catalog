export type SpecificationFieldType = "text" | "number" | "select" | "boolean";

export interface SpecificationFieldEntity {
  id: string;

  code: string;

  companyId: string;

  workspaceId: string;

  name: string;

  label: string;

  fieldType: SpecificationFieldType;

  specificationOptionSetId?: string;

  isRequired: boolean;

  isFilterable: boolean;

  sortOrder: number;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}
