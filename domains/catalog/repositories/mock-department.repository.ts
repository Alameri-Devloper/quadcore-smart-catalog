import { departments } from "@/domains/catalog/mock/departments";
import { DepartmentEntity } from "@/domains/catalog/types/department.entity";
import { IDepartmentRepository } from "@/domains/catalog/repositories/department.repository.interface";

export const MockDepartmentRepository: IDepartmentRepository = {
  getAll(): DepartmentEntity[] {
    return departments;
  },

  getActive(): DepartmentEntity[] {
    return departments.filter((department) => department.isActive);
  },

  getById(id: string): DepartmentEntity | undefined {
    return departments.find((department) => department.id === id);
  },

  getByWorkspaceId(workspaceId: string): DepartmentEntity[] {
    return departments.filter(
      (department) =>
        department.workspaceId === workspaceId && department.isActive,
    );
  },
};
