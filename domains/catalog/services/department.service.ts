import { MockDepartmentRepository } from "@/domains/catalog/repositories/mock-department.repository";

export const DepartmentService = {
  getDepartments() {
    return MockDepartmentRepository.getActive();
  },

  getDepartmentsByWorkspace(workspaceId: string) {
    return MockDepartmentRepository.getByWorkspaceId(workspaceId);
  },

  getDepartmentById(id: string) {
    return MockDepartmentRepository.getById(id);
  },
};
