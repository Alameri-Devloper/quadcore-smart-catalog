import { BrandService } from "@/domains/catalog/services/brand.service";
import { ProductModelService } from "@/domains/catalog/services/product-model.service";

type CatalogSelectionQuery = {
  workspaceId: string;
  departmentId: string;
  categoryId: string;
};

type ProductModelSelectionQuery = CatalogSelectionQuery & {
  brandId: string;
};

export const CatalogSelectionService = {
  getBrandsBySelection({
    workspaceId,
    departmentId,
    categoryId,
  }: CatalogSelectionQuery) {
    const productModels = ProductModelService.getProductModelsByWorkspace(
      workspaceId,
    ).filter(
      (productModel) =>
        productModel.departmentId === departmentId &&
        productModel.categoryId === categoryId,
    );

    const brandIds = new Set(
      productModels.map((productModel) => productModel.brandId),
    );

    return BrandService.getBrandsByWorkspace(workspaceId).filter((brand) =>
      brandIds.has(brand.id),
    );
  },

  getProductModelsBySelection({
    workspaceId,
    departmentId,
    categoryId,
    brandId,
  }: ProductModelSelectionQuery) {
    return ProductModelService.getProductModelsByWorkspaceAndBrand(
      workspaceId,
      brandId,
    ).filter(
      (productModel) =>
        productModel.departmentId === departmentId &&
        productModel.categoryId === categoryId,
    );
  },
};
