import { MockCategoryRepository } from "@/domains/catalog/repositories/mock-category.repository";

export const CategoryService = {
  getCategories() {
    return MockCategoryRepository.getActive();
  },

  getCategoriesByDepartment(departmentId: string) {
    return MockCategoryRepository.getByDepartmentId(departmentId);
  },

  getCategoriesByWorkspace(workspaceId: string) {
    return MockCategoryRepository.getByWorkspaceId(workspaceId);
  },

  getCategory(id: string) {
    return MockCategoryRepository.getById(id);
  },
};
