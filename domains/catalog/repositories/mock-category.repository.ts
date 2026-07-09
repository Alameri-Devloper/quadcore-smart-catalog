import { categories } from "@/domains/catalog/mock/categories";
import { CategoryEntity } from "@/domains/catalog/types/category.entity";
import { ICategoryRepository } from "./category.repository.interface";

export const MockCategoryRepository: ICategoryRepository = {
  getAll() {
    return categories;
  },

  getActive() {
    return categories.filter((category) => category.isActive);
  },

  getByDepartmentId(departmentId: string) {
    return categories.filter(
      (category) => category.departmentId === departmentId && category.isActive,
    );
  },

  getByWorkspaceId(workspaceId: string) {
    return categories.filter(
      (category) => category.workspaceId === workspaceId && category.isActive,
    );
  },

  getById(id: string): CategoryEntity | undefined {
    return categories.find((category) => category.id === id);
  },
};
