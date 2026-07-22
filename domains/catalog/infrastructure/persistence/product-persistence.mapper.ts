import { ProductTypeId } from "../../types/product-classification.value-object";
import { CatalogId, ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductLifecycleState } from "../../types/product-lifecycle-state.value-object";
import { Product } from "../../types/product.aggregate";
import type { SpecificationValue } from "../../types/specification-value.entity";
import type {
  catalogProductImages,
  catalogProducts,
  catalogProductSpecificationValues,
} from "./schema";

type ProductRow = typeof catalogProducts.$inferSelect;
type ProductInsert = typeof catalogProducts.$inferInsert;
type SpecificationRow = typeof catalogProductSpecificationValues.$inferSelect;
type SpecificationInsert = typeof catalogProductSpecificationValues.$inferInsert;
type ImageRow = typeof catalogProductImages.$inferSelect;
type ImageInsert = typeof catalogProductImages.$inferInsert;

export interface ProductPersistenceRows {
  product: ProductInsert;
  specificationValues: SpecificationInsert[];
  images: ImageInsert[];
}

const assertSafeNonNegativeInteger = (name: string, value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new Error(`Corrupted persisted ${name}: expected a non-negative safe integer.`);
  }
  return value;
};

export const parsePersistedSpecificationNumber = (persisted: string): number => {
  const parsed = Number(persisted);
  if (String(parsed) !== persisted) {
    throw new Error("Corrupted persisted Product specification number: non-canonical representation.");
  }
  return parsed;
};

const persistedSpecificationValue = (row: SpecificationRow): SpecificationValue => {
  if (row.valueType === "string" && row.textValue !== null) return row.textValue;
  if (row.valueType === "boolean" && row.booleanValue !== null) return row.booleanValue;
  if (row.valueType === "number" && row.numberValue !== null) {
    return parsePersistedSpecificationNumber(row.numberValue);
  }
  throw new Error("Corrupted persisted Product specification value.");
};

export class ProductPersistenceMapper {
  static toRows(product: Product): ProductPersistenceRows {
    const { identity, classification, commercialDetails } = product;
    const pricing = commercialDetails?.pricing;
    const scope = { workspaceId: identity.workspaceId.value, productId: identity.productId.value };

    return {
      product: {
        ...scope,
        catalogId: identity.catalogId.value,
        lifecycleState: product.lifecycleState.value,
        revision: assertSafeNonNegativeInteger("Product Revision", product.revision.value),
        createdAt: product.createdAt,
        updatedAt: product.updatedAt,
        hasClassification: classification !== undefined,
        categoryId: classification?.categoryId,
        productTypeId: classification?.productTypeId?.value,
        deviceClassId: classification?.deviceClassId,
        conditionId: classification?.conditionId,
        availabilityStatusId: classification?.availabilityStatusId,
        hasCommercialDetails: commercialDetails !== undefined,
        productName: commercialDetails?.productName,
        productCode: commercialDetails?.productCode?.value,
        productModelId: commercialDetails?.productModelId,
        brandId: commercialDetails?.brandId,
        isHighlighted: commercialDetails?.isHighlighted ?? false,
        wholesalePriceMinor: pricing?.wholesalePrice?.amountMinor,
        wholesalePriceCurrency: pricing?.wholesalePrice?.currency,
        retailPriceMinor: pricing?.retailPrice?.amountMinor,
        retailPriceCurrency: pricing?.retailPrice?.currency,
      },
      specificationValues: product.specificationValues.map((item, position) => ({
        ...scope,
        specificationFieldId: item.specificationFieldId,
        position,
        valueType: typeof item.value,
        textValue: typeof item.value === "string" ? item.value : null,
        numberValue: typeof item.value === "number" ? String(item.value) : null,
        booleanValue: typeof item.value === "boolean" ? item.value : null,
      })),
      images: product.images.map((image) => ({
        ...scope,
        productImageId: image.productImageId,
        storageKey: image.storageReference,
        position: image.order,
        isMain: image.isMain,
        altText: image.altText,
      })),
    };
  }

  static toDomain(product: ProductRow, specifications: SpecificationRow[], images: ImageRow[]): Product {
    const classification = product.hasClassification
      ? {
          categoryId: product.categoryId ?? undefined,
          productTypeId: product.productTypeId ? ProductTypeId.create(product.productTypeId) : undefined,
          deviceClassId: product.deviceClassId ?? undefined,
          conditionId: product.conditionId ?? undefined,
          availabilityStatusId: product.availabilityStatusId ?? undefined,
        }
      : undefined;
    const hasPricing = product.wholesalePriceMinor !== null || product.retailPriceMinor !== null;
    const commercialDetails = product.hasCommercialDetails
      ? {
          productName: product.productName ?? undefined,
          productCode: product.productCode ?? undefined,
          productModelId: product.productModelId ?? undefined,
          brandId: product.brandId ?? undefined,
          isHighlighted: product.isHighlighted,
          pricing: hasPricing ? {
            wholesalePrice: product.wholesalePriceMinor === null ? undefined : {
              amountMinor: assertSafeNonNegativeInteger("wholesale price", product.wholesalePriceMinor),
              currency: product.wholesalePriceCurrency!,
            },
            retailPrice: product.retailPriceMinor === null ? undefined : {
              amountMinor: assertSafeNonNegativeInteger("retail price", product.retailPriceMinor),
              currency: product.retailPriceCurrency!,
            },
          } : undefined,
        }
      : undefined;

    return Product.rehydrate({
      workspaceId: WorkspaceId.create(product.workspaceId),
      productId: ProductId.create(product.productId),
      catalogId: CatalogId.create(product.catalogId),
      lifecycleState: ProductLifecycleState.rehydrate(product.lifecycleState).value,
      revision: assertSafeNonNegativeInteger("Product Revision", product.revision),
      createdAt: product.createdAt,
      updatedAt: product.updatedAt,
      classification,
      commercialDetails,
      specificationValues: [...specifications]
        .sort((left, right) => left.position - right.position)
        .map((row) => ({ specificationFieldId: row.specificationFieldId, value: persistedSpecificationValue(row) })),
      images: [...images]
        .sort((left, right) => left.position - right.position)
        .map((row) => ({
          productImageId: row.productImageId,
          storageReference: row.storageKey,
          order: row.position,
          isMain: row.isMain,
          altText: row.altText ?? undefined,
        })),
    });
  }
}
