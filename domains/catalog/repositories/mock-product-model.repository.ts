import { productModels } from "@/domains/catalog/mock/product-models";
import { ProductModelEntity } from "@/domains/catalog/types/product-model.entity";
import { IProductModelRepository } from "@/domains/catalog/repositories/product-model.repository.interface";

export const MockProductModelRepository: IProductModelRepository = {
  getAll(): ProductModelEntity[] {
    return productModels;
  },

  getActive(): ProductModelEntity[] {
    return productModels.filter((productModel) => productModel.isActive);
  },

  getByWorkspaceId(workspaceId: string): ProductModelEntity[] {
    return productModels.filter(
      (productModel) =>
        productModel.workspaceId === workspaceId && productModel.isActive,
    );
  },

  getByWorkspaceIdAndBrandId(
    workspaceId: string,
    brandId: string,
  ): ProductModelEntity[] {
    return productModels.filter(
      (productModel) =>
        productModel.workspaceId === workspaceId &&
        productModel.brandId === brandId &&
        productModel.isActive,
    );
  },

  getByDepartmentId(departmentId: string): ProductModelEntity[] {
    return productModels.filter(
      (productModel) =>
        productModel.departmentId === departmentId && productModel.isActive,
    );
  },

  getByCategoryId(categoryId: string): ProductModelEntity[] {
    return productModels.filter(
      (productModel) =>
        productModel.categoryId === categoryId && productModel.isActive,
    );
  },

  getByBrandId(brandId: string): ProductModelEntity[] {
    return productModels.filter(
      (productModel) =>
        productModel.brandId === brandId && productModel.isActive,
    );
  },

  getById(id: string): ProductModelEntity | undefined {
    return productModels.find((productModel) => productModel.id === id);
  },
};
