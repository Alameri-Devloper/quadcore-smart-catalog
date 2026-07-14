export interface SpecificationTemplateEntity {
  id: string;

  code: string;

  companyId: string;

  workspaceId: string;

  categoryId: string;

  deviceClassId?: string;

  name: string;

  description: string;

  isActive: boolean;

  createdAt: string;

  updatedAt: string;
}
