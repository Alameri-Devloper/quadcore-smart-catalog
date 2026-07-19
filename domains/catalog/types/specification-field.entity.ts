export type SpecificationFieldType = "text" | "number" | "select" | "boolean";

export interface SpecificationFieldGuidance {
  readonly description?: string;
  readonly placeholder?: string;
  readonly exampleValue?: string;
  readonly unitLabel?: string;
  readonly inputHint?: string;
  readonly invalidExample?: string;
}

export interface SpecificationFieldEntity {
  id: string;

  code: string;

  companyId: string;

  workspaceId: string;

  name: string;

  label: string;

  fieldType: SpecificationFieldType;

  specificationOptionSetId?: string;

  guidance?: SpecificationFieldGuidance;

  isRequired: boolean;

  isFilterable: boolean;

  sortOrder: number;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}
