export interface SpecificationTemplateFieldEntity {
  id: string;

  code: string;

  companyId: string;

  workspaceId: string;

  specificationTemplateId: string;

  specificationFieldId: string;

  isRequired: boolean;

  isFilterable: boolean;

  sortOrder: number;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}
