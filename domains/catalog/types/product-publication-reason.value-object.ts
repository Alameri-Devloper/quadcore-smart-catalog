export const PRODUCT_PUBLICATION_REASON_CODES = {
  missingCategory: "MissingCategory",
  missingProductType: "MissingProductType",
  missingDeviceClass: "MissingDeviceClass",
  missingCondition: "MissingCondition",
  missingAvailabilityStatus: "MissingAvailabilityStatus",
  missingProductName: "MissingProductName",
  missingProductCode: "MissingProductCode",
  missingProductModel: "MissingProductModel",
  missingBrand: "MissingBrand",
  missingRetailPrice: "MissingRetailPrice",
  missingWholesalePrice: "MissingWholesalePrice",
  missingMainImage: "MissingMainImage",
  missingRequiredSpecification: "MissingRequiredSpecification",
} as const;

export type ProductPublicationReasonCode =
  (typeof PRODUCT_PUBLICATION_REASON_CODES)[keyof typeof PRODUCT_PUBLICATION_REASON_CODES];

export class ProductPublicationReason {
  readonly code: ProductPublicationReasonCode;
  readonly specificationFieldId?: string;

  private constructor(
    code: ProductPublicationReasonCode,
    specificationFieldId?: string,
  ) {
    this.code = code;
    this.specificationFieldId = specificationFieldId;
    Object.freeze(this);
  }

  static missing(code: Exclude<ProductPublicationReasonCode, "MissingRequiredSpecification">): ProductPublicationReason {
    return new ProductPublicationReason(code);
  }

  static missingRequiredSpecification(
    specificationFieldId: string,
  ): ProductPublicationReason {
    if (specificationFieldId.trim().length === 0) {
      throw new Error("SpecificationFieldId cannot be empty.");
    }

    return new ProductPublicationReason(
      PRODUCT_PUBLICATION_REASON_CODES.missingRequiredSpecification,
      specificationFieldId,
    );
  }
}
