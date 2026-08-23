import { ProductId } from "../../types/product-identity.value-object";
import { commitProductEntryTransaction, type ProductEntryUnitOfWork } from "../ports/product-entry-unit-of-work.port";
import type { ProductEntryProductView } from "../presentation/product-entry-presentation.types";
import { PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "./product-entry-execution-context";

export type GetProductEntryProductResult =
  | { readonly type: "Found"; readonly product: ProductEntryProductView }
  | { readonly type: "NotFound" }
  | { readonly type: "Forbidden"; readonly permission: string }
  | { readonly type: "InvalidRequest" };

export class GetProductEntryProductUseCase {
  constructor(private readonly unitOfWork: ProductEntryUnitOfWork) {}

  async execute(context: ProductEntryExecutionContext, productIdValue: string): Promise<GetProductEntryProductResult> {
    if (!context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.read)) {
      return { type: "Forbidden", permission: PRODUCT_ENTRY_PERMISSIONS.read };
    }
    let productId: ProductId;
    try { productId = ProductId.create(productIdValue); }
    catch { return { type: "InvalidRequest" }; }
    return this.unitOfWork.execute(async (transaction) => {
      const product = await transaction.productRepository.findById(context.workspaceId, productId);
      if (!product) return commitProductEntryTransaction<GetProductEntryProductResult>({ type: "NotFound" });
      return commitProductEntryTransaction<GetProductEntryProductResult>({
        type: "Found",
        product: {
          productId: product.identity.productId.value,
          catalogId: product.identity.catalogId.value,
          lifecycleState: product.lifecycleState.value,
          archiveReason: product.archiveReason?.value ?? null,
          revision: product.revision.value,
          classification: product.classification ? {
            categoryId: product.classification.categoryId ?? null,
            productTypeId: product.classification.productTypeId?.value ?? null,
            deviceClassId: product.classification.deviceClassId ?? null,
            conditionId: product.classification.conditionId ?? null,
            availabilityStatusId: product.classification.availabilityStatusId ?? null,
          } : null,
          commercialDetails: product.commercialDetails ? {
            productName: product.commercialDetails.productName ?? null,
            productCode: product.commercialDetails.productCode?.value ?? null,
            productModelId: product.commercialDetails.productModelId ?? null,
            brandId: product.commercialDetails.brandId ?? null,
            isHighlighted: product.commercialDetails.isHighlighted,
            wholesalePrice: context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.wholesaleView)
              ? product.commercialDetails.pricing?.wholesalePrice ?? null
              : null,
            retailPrice: context.permissions.has(PRODUCT_ENTRY_PERMISSIONS.pricingView)
              ? product.commercialDetails.pricing?.retailPrice ?? null
              : null,
          } : null,
          specificationValues: product.specificationValues.map((value) => ({
            specificationFieldId: value.specificationFieldId,
            value: value.value,
          })),
          images: product.images.map((image) => ({
            mediaId: image.productImageId,
            displayOrder: image.order,
            isMain: image.isMain,
            altText: image.altText ?? null,
          })),
        },
      });
    });
  }
}
