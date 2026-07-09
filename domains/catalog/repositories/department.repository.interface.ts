import { DepartmentEntity } from "@/domains/catalog/types/department.entity";

export interface IDepartmentRepository {
  getAll(): DepartmentEntity[];

  getActive(): DepartmentEntity[];

  getById(id: string): DepartmentEntity | undefined;

  getByWorkspaceId(workspaceId: string): DepartmentEntity[];
}
