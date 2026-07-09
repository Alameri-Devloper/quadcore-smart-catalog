import { ProductModelEntity } from "@/domains/catalog/types/product-model.entity";

export interface IProductModelRepository {
  getAll(): ProductModelEntity[];

  getActive(): ProductModelEntity[];

  getByWorkspaceId(workspaceId: string): ProductModelEntity[];

  getByDepartmentId(departmentId: string): ProductModelEntity[];

  getByCategoryId(categoryId: string): ProductModelEntity[];

  getByBrandId(brandId: string): ProductModelEntity[];

  getById(id: string): ProductModelEntity | undefined;
}
