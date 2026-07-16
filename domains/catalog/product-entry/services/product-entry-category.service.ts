import { CategoryService } from "@/domains/catalog/services/category.service";
import { DepartmentService } from "@/domains/catalog/services/department.service";
import { ProductModelService } from "@/domains/catalog/services/product-model.service";
import { SpecificationTemplateService } from "@/domains/catalog/services/specification-template.service";
import { DeviceClassService } from "@/domains/catalog/services/device-class.service";
import { BrandService } from "@/domains/catalog/services/brand.service";

export interface ProductEntryCategoryOption {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  departmentName: string;
}

export interface ProductEntryCategoryQueryResult {
  categories: ProductEntryCategoryOption[];
  categoryRequiresDeviceClassByCategory: Record<string, boolean>;
  deviceClassIdsByCategory: Record<string, string[]>;
  brandIdByProductModel: Record<string, string>;
  productModelIdsByCategory: Record<string, string[]>;
  productModelIdsByCategoryAndDeviceClass: Record<string, Record<string, string[]>>;
  specificationFieldIdsByCategory: Record<string, string[]>;
  specificationFieldIdsByCategoryAndDeviceClass: Record<string, Record<string, string[]>>;
}

export type ProductEntryCategoryValidationCode =
  | "required"
  | "category-unavailable"
  | "category-workspace"
  | "department-unavailable"
  | "department-workspace"
  | "department-mismatch";

export const ProductEntryCategoryService = {
  async getAvailableCategories(
    companyId: string,
    workspaceId: string,
  ): Promise<ProductEntryCategoryQueryResult> {
    const departments = DepartmentService.getDepartmentsByWorkspace(workspaceId)
      .filter((department) => department.companyId === companyId);
    const departmentsById = new Map(
      departments.map((department) => [department.id, department]),
    );
    const categories = CategoryService.getCategoriesByWorkspace(workspaceId)
      .filter((category) => category.companyId === companyId)
      .flatMap((category) => {
        const department = departmentsById.get(category.departmentId);
        return department
          ? [{
              id: category.id,
              code: category.code,
              name: category.name,
              departmentId: department.id,
              departmentName: department.name,
            }]
          : [];
      })
      .sort((left, right) => left.name.localeCompare(right.name));
    const productModels = ProductModelService.getProductModelsByWorkspace(workspaceId);
    const deviceClasses = DeviceClassService.getDeviceClassesByWorkspace(workspaceId)
      .filter((deviceClass) => deviceClass.companyId === companyId);
    const brandsById = new Map(
      BrandService.getBrandsByWorkspace(workspaceId)
        .filter((brand) => brand.companyId === companyId)
        .map((brand) => [brand.id, brand]),
    );

    const deviceClassIdsByCategory = Object.fromEntries(
      categories.map((category) => [
        category.id,
        deviceClasses
          .filter((deviceClass) =>
            SpecificationTemplateService.getTemplate(category.id, deviceClass.id),
          )
          .map((deviceClass) => deviceClass.id),
      ]),
    );

    return {
      categories,
      categoryRequiresDeviceClassByCategory: Object.fromEntries(
        categories.map((category) => [
          category.id,
          deviceClassIdsByCategory[category.id].length > 0,
        ]),
      ),
      deviceClassIdsByCategory,
      brandIdByProductModel: Object.fromEntries(
        productModels.flatMap((model) =>
          brandsById.has(model.brandId) ? [[model.id, model.brandId]] : [],
        ),
      ),
      productModelIdsByCategoryAndDeviceClass: Object.fromEntries(
        categories.map((category) => [
          category.id,
          Object.fromEntries(deviceClasses.map((deviceClass) => [
            deviceClass.id,
            productModels
              .filter((model) =>
                model.categoryId === category.id &&
                model.deviceClassId === deviceClass.id,
              )
              .map((model) => model.id),
          ])),
        ]),
      ),
      productModelIdsByCategory: Object.fromEntries(
        categories.map((category) => [
          category.id,
          productModels
            .filter((model) => model.categoryId === category.id)
            .map((model) => model.id),
        ]),
      ),
      specificationFieldIdsByCategoryAndDeviceClass: Object.fromEntries(
        categories.map((category) => [
          category.id,
          Object.fromEntries(deviceClasses.map((deviceClass) => [
            deviceClass.id,
            SpecificationTemplateService.getFields(category.id, deviceClass.id)
              .map((field) => field.id),
          ])),
        ]),
      ),
      specificationFieldIdsByCategory: Object.fromEntries(
        categories.map((category) => {
          const categoryModels = productModels.filter(
            (model) => model.categoryId === category.id,
          );
          const deviceClassIds = new Set(
            categoryModels.map((model) => model.deviceClassId),
          );
          const fieldIds = [...deviceClassIds].flatMap((deviceClassId) =>
            SpecificationTemplateService.getFields(category.id, deviceClassId)
              .map((field) => field.id),
          );
          return [category.id, [...new Set(fieldIds)]];
        }),
      ),
    };
  },

  async validateSelection(input: {
    categoryId: string | null;
    departmentId: string | null;
    companyId: string;
    workspaceId: string;
  }): Promise<ProductEntryCategoryValidationCode | null> {
    if (!input.categoryId) return "required";
    const category = CategoryService.getCategory(input.categoryId);
    if (!category || !category.isActive) return "category-unavailable";
    if (category.workspaceId !== input.workspaceId || category.companyId !== input.companyId) {
      return "category-workspace";
    }
    const department = DepartmentService.getDepartmentById(category.departmentId);
    if (!department || !department.isActive) return "department-unavailable";
    if (department.workspaceId !== input.workspaceId || department.companyId !== input.companyId) {
      return "department-workspace";
    }
    return input.departmentId === category.departmentId
      ? null
      : "department-mismatch";
  },
};
