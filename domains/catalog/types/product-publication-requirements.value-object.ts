export const PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS = {
  category: "Category",
  productType: "ProductType",
  deviceClass: "DeviceClass",
  condition: "Condition",
  availabilityStatus: "AvailabilityStatus",
} as const;

export type ProductPublicationClassificationRequirement =
  (typeof PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS)[keyof typeof PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS];

export const PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS = {
  productName: "ProductName",
  productCode: "ProductCode",
  productModel: "ProductModel",
  brand: "Brand",
  retailPrice: "RetailPrice",
  wholesalePrice: "WholesalePrice",
} as const;

export type ProductPublicationCommercialRequirement =
  (typeof PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS)[keyof typeof PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS];

export const PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS = {
  none: "None",
  mainImageRequired: "MainImageRequired",
} as const;

export type ProductPublicationImageRequirement =
  (typeof PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS)[keyof typeof PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS];

export interface ProductPublicationRequirementsInput {
  classification?: readonly ProductPublicationClassificationRequirement[];
  commercial?: readonly ProductPublicationCommercialRequirement[];
  requiredSpecificationFieldIds?: readonly string[];
  image?: ProductPublicationImageRequirement;
}

const CLASSIFICATION_ORDER = Object.values(
  PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS,
);
const COMMERCIAL_ORDER = Object.values(
  PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS,
);
const IMAGE_REQUIREMENTS = Object.values(PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS);

const validateAndOrderRequirements = <T extends string>(
  name: string,
  supplied: readonly T[],
  canonicalOrder: readonly T[],
): T[] => {
  const supported = new Set<T>(canonicalOrder);
  const values = new Set<T>();

  for (const requirement of supplied) {
    if (!supported.has(requirement)) {
      throw new Error(`Unsupported ${name}: "${requirement}".`);
    }

    if (values.has(requirement)) {
      throw new Error(`Duplicate ${name}: "${requirement}".`);
    }

    values.add(requirement);
  }

  return canonicalOrder.filter((requirement) => values.has(requirement));
};

export class ProductPublicationRequirements {
  private readonly internalClassification: readonly ProductPublicationClassificationRequirement[];
  private readonly internalCommercial: readonly ProductPublicationCommercialRequirement[];
  private readonly internalRequiredSpecificationFieldIds: readonly string[];
  readonly image: ProductPublicationImageRequirement;

  private constructor(input: ProductPublicationRequirementsInput) {
    this.internalClassification = Object.freeze(
      validateAndOrderRequirements(
        "publication classification requirement",
        input.classification ?? [],
        CLASSIFICATION_ORDER,
      ),
    );
    this.internalCommercial = Object.freeze(
      validateAndOrderRequirements(
        "publication commercial requirement",
        input.commercial ?? [],
        COMMERCIAL_ORDER,
      ),
    );
    this.internalRequiredSpecificationFieldIds = Object.freeze(
      validateSpecificationFieldIds(
        input.requiredSpecificationFieldIds ?? [],
      ),
    );
    this.image = input.image ?? PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS.none;

    if (!IMAGE_REQUIREMENTS.includes(this.image)) {
      throw new Error(`Unsupported publication image requirement: "${this.image}".`);
    }

    Object.freeze(this);
  }

  static create(
    input: ProductPublicationRequirementsInput = {},
  ): ProductPublicationRequirements {
    return new ProductPublicationRequirements(input);
  }

  get classification(): readonly ProductPublicationClassificationRequirement[] {
    return [...this.internalClassification];
  }

  get commercial(): readonly ProductPublicationCommercialRequirement[] {
    return [...this.internalCommercial];
  }

  get requiredSpecificationFieldIds(): readonly string[] {
    return [...this.internalRequiredSpecificationFieldIds];
  }
}

const validateSpecificationFieldIds = (
  supplied: readonly string[],
): string[] => {
  const values = new Set<string>();

  for (const fieldId of supplied) {
    if (typeof fieldId !== "string" || fieldId.trim().length === 0) {
      throw new Error("Required SpecificationFieldId cannot be empty.");
    }

    if (values.has(fieldId)) {
      throw new Error(`Duplicate required SpecificationFieldId: "${fieldId}".`);
    }

    values.add(fieldId);
  }

  return [...values].sort((left, right) => left.localeCompare(right));
};
