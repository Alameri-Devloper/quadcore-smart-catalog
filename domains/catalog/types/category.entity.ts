export interface CategoryEntity {
  id: string;
  code: string;

  companyId: string;
  workspaceId: string;
  departmentId: string;

  name: string;
  description?: string;

  icon?: string;
  imageUrl?: string;

  sortOrder: number;
  isActive: boolean;

  createdAt: string;
  updatedAt: string;
}
