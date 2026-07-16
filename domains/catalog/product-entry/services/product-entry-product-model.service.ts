import { BrandService } from "@/domains/catalog/services/brand.service";
import { DeviceClassService } from "@/domains/catalog/services/device-class.service";
import { ProductModelService } from "@/domains/catalog/services/product-model.service";

export interface ProductEntryProductModelOption {
  productModelId: string;
  name: string;
  code: string;
  brandId: string;
  brandName: string;
  categoryId: string;
  deviceClassId: string | null;
  deviceClassName: string | null;
}

export interface ProductEntryProductModelContext {
  companyId: string;
  workspaceId: string;
  departmentId: string | null;
  categoryId: string | null;
  deviceClassId: string | null;
  categoryRequiresDeviceClass: boolean;
}

export type ProductEntryProductModelValidationCode =
  | "required"
  | "product-model-unavailable"
  | "product-model-workspace"
  | "product-model-category"
  | "product-model-device-class"
  | "brand-unavailable"
  | "brand-mismatch";

const matchesContext = (
  model: NonNullable<ReturnType<typeof ProductModelService.getProductModelById>>,
  context: ProductEntryProductModelContext,
) =>
  model.companyId === context.companyId &&
  model.workspaceId === context.workspaceId &&
  model.departmentId === context.departmentId &&
  model.categoryId === context.categoryId &&
  (context.categoryRequiresDeviceClass
    ? model.deviceClassId === context.deviceClassId
    : model.deviceClassId === undefined);

export const ProductEntryProductModelService = {
  async getAvailableProductModels(
    context: ProductEntryProductModelContext,
  ): Promise<ProductEntryProductModelOption[]> {
    if (
      !context.departmentId ||
      !context.categoryId ||
      (context.categoryRequiresDeviceClass && !context.deviceClassId)
    ) return [];

    return ProductModelService.getProductModelsByWorkspace(context.workspaceId)
      .filter((model) => matchesContext(model, context))
      .flatMap((model) => {
        const brand = BrandService.getBrandById(model.brandId);
        if (
          !brand ||
          !brand.isActive ||
          brand.companyId !== context.companyId ||
          brand.workspaceId !== context.workspaceId
        ) return [];
        const deviceClass = model.deviceClassId
          ? DeviceClassService.getDeviceClassById(model.deviceClassId)
          : undefined;
        return [{
          productModelId: model.id,
          name: model.name,
          code: model.code,
          brandId: brand.id,
          brandName: brand.name,
          categoryId: model.categoryId,
          deviceClassId: model.deviceClassId ?? null,
          deviceClassName: deviceClass?.name ?? null,
        }];
      })
      .sort((left, right) => left.name.localeCompare(right.name));
  },

  async validateProductModelContext(input: {
    context: ProductEntryProductModelContext;
    productModelId: string | null;
    brandId: string | null;
  }): Promise<ProductEntryProductModelValidationCode | null> {
    if (!input.productModelId) return "required";
    const model = ProductModelService.getProductModelById(input.productModelId);
    if (!model || !model.isActive) return "product-model-unavailable";
    if (
      model.companyId !== input.context.companyId ||
      model.workspaceId !== input.context.workspaceId
    ) return "product-model-workspace";
    if (
      model.departmentId !== input.context.departmentId ||
      model.categoryId !== input.context.categoryId
    ) return "product-model-category";
    if (
      input.context.categoryRequiresDeviceClass
        ? model.deviceClassId !== input.context.deviceClassId
        : model.deviceClassId !== undefined
    ) return "product-model-device-class";
    const brand = BrandService.getBrandById(model.brandId);
    if (
      !brand ||
      !brand.isActive ||
      brand.companyId !== input.context.companyId ||
      brand.workspaceId !== input.context.workspaceId
    ) return "brand-unavailable";
    return input.brandId === model.brandId ? null : "brand-mismatch";
  },

  resolveBrandForProductModel(productModelId: string) {
    const model = ProductModelService.getProductModelById(productModelId);
    if (!model || !model.isActive) return null;
    const brand = BrandService.getBrandById(model.brandId);
    return brand && brand.isActive
      ? { brandId: brand.id, brandName: brand.name }
      : null;
  },
};
