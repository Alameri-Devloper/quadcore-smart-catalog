import type { ProductId } from "./product-identity.value-object";
import {
  PRODUCT_PUBLICATION_REASON_CODES,
  ProductPublicationReason,
} from "./product-publication-reason.value-object";
import {
  PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS,
  PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS,
  PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS,
  type ProductPublicationRequirements,
} from "./product-publication-requirements.value-object";
import type { ProductRevision } from "./product-revision.value-object";
import type { Product } from "./product.aggregate";

export interface ProductPublicationDecision {
  readonly allowed: boolean;
  readonly productId: ProductId;
  readonly evaluatedRevision: ProductRevision;
  readonly reasons: readonly ProductPublicationReason[];
}

const issuedDecisions = new WeakSet<object>();

class IssuedProductPublicationDecision implements ProductPublicationDecision {
  readonly allowed: boolean;
  readonly productId: ProductId;
  readonly evaluatedRevision: ProductRevision;
  private readonly internalReasons: readonly ProductPublicationReason[];

  constructor(
    productId: ProductId,
    evaluatedRevision: ProductRevision,
    reasons: readonly ProductPublicationReason[],
  ) {
    this.allowed = reasons.length === 0;
    this.productId = productId;
    this.evaluatedRevision = evaluatedRevision;
    this.internalReasons = Object.freeze([...reasons]);
    issuedDecisions.add(this);
    Object.freeze(this);
  }

  get reasons(): readonly ProductPublicationReason[] {
    return [...this.internalReasons];
  }
}

export class ProductPublicationPolicy {
  static evaluate(
    product: Product,
    requirements: ProductPublicationRequirements,
  ): ProductPublicationDecision {
    const reasons: ProductPublicationReason[] = [];
    const classification = product.classification;
    const commercialDetails = product.commercialDetails;

    for (const requirement of requirements.classification) {
      switch (requirement) {
        case PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.category:
          if (classification?.categoryId === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingCategory,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.productType:
          if (classification?.productTypeId === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingProductType,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.deviceClass:
          if (classification?.deviceClassId === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingDeviceClass,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.condition:
          if (classification?.conditionId === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingCondition,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.availabilityStatus:
          if (classification?.availabilityStatusId === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingAvailabilityStatus,
              ),
            );
          }
          break;
      }
    }

    for (const requirement of requirements.commercial) {
      switch (requirement) {
        case PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.productName:
          if (commercialDetails?.productName === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingProductName,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.productCode:
          if (commercialDetails?.productCode === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingProductCode,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.productModel:
          if (commercialDetails?.productModelId === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingProductModel,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.brand:
          if (commercialDetails?.brandId === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingBrand,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.retailPrice:
          if (commercialDetails?.pricing?.retailPrice === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingRetailPrice,
              ),
            );
          }
          break;
        case PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.wholesalePrice:
          if (commercialDetails?.pricing?.wholesalePrice === undefined) {
            reasons.push(
              ProductPublicationReason.missing(
                PRODUCT_PUBLICATION_REASON_CODES.missingWholesalePrice,
              ),
            );
          }
          break;
      }
    }

    const suppliedSpecificationFieldIds = new Set(
      product.specificationValues.map((value) => value.specificationFieldId),
    );
    for (const fieldId of requirements.requiredSpecificationFieldIds) {
      if (!suppliedSpecificationFieldIds.has(fieldId)) {
        reasons.push(
          ProductPublicationReason.missingRequiredSpecification(fieldId),
        );
      }
    }

    if (
      requirements.image ===
        PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS.mainImageRequired &&
      !product.images.some((image) => image.isMain)
    ) {
      reasons.push(
        ProductPublicationReason.missing(
          PRODUCT_PUBLICATION_REASON_CODES.missingMainImage,
        ),
      );
    }

    return new IssuedProductPublicationDecision(
      product.identity.productId,
      product.revision,
      reasons,
    );
  }
}

export const assertCurrentApprovedPublicationDecision = (
  decision: ProductPublicationDecision,
  productId: ProductId,
  revision: ProductRevision,
): void => {
  if (
    typeof decision !== "object" ||
    decision === null ||
    !issuedDecisions.has(decision)
  ) {
    throw new Error(
      "Publication decision was not issued by ProductPublicationPolicy.",
    );
  }

  if (!decision.allowed) {
    throw new Error("Publication decision is denied.");
  }

  if (decision.productId.value !== productId.value) {
    throw new Error("Publication decision belongs to another Product.");
  }

  if (!decision.evaluatedRevision.equals(revision)) {
    throw new Error("Publication decision is stale.");
  }
};
