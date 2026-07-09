import { CategoryEntity } from "@/domains/catalog/types/category.entity";

export interface ICategoryRepository {
  getAll(): CategoryEntity[];

  getActive(): CategoryEntity[];

  getByDepartmentId(departmentId: string): CategoryEntity[];

  getByWorkspaceId(workspaceId: string): CategoryEntity[];

  getById(id: string): CategoryEntity | undefined;
}
