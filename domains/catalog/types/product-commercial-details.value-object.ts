import {
  ProductPricing,
  type ProductPricingInput,
} from "./money.value-object";

export interface ProductCommercialDetailsInput {
  productName?: string;
  productCode?: string;
  productModelId?: string;
  brandId?: string;
  isHighlighted?: boolean;
  pricing?: ProductPricingInput;
}

const validateOptionalText = (
  name: string,
  value: string | undefined,
): void => {
  if (value !== undefined && value.trim().length === 0) {
    throw new Error(`${name} cannot be empty when provided.`);
  }
};

export class ProductCommercialDetails {
  readonly productName?: string;
  readonly productCode?: string;
  readonly productModelId?: string;
  readonly brandId?: string;
  readonly isHighlighted: boolean;
  readonly pricing?: ProductPricing;

  private constructor(input: ProductCommercialDetailsInput) {
    this.productName = input.productName;
    this.productCode = input.productCode;
    this.productModelId = input.productModelId;
    this.brandId = input.brandId;
    this.isHighlighted = input.isHighlighted ?? false;
    this.pricing = input.pricing
      ? ProductPricing.create(input.pricing)
      : undefined;
    Object.freeze(this);
  }

  static create(
    input: ProductCommercialDetailsInput = {},
  ): ProductCommercialDetails {
    validateOptionalText("ProductName", input.productName);
    validateOptionalText("ProductCode", input.productCode);
    validateOptionalText("ProductModelId", input.productModelId);
    validateOptionalText("BrandId", input.brandId);

    return new ProductCommercialDetails(input);
  }

  equals(other: ProductCommercialDetails | undefined): boolean {
    return (
      other !== undefined &&
      this.productName === other.productName &&
      this.productCode === other.productCode &&
      this.productModelId === other.productModelId &&
      this.brandId === other.brandId &&
      this.isHighlighted === other.isHighlighted &&
      optionalPricingEquals(this.pricing, other.pricing)
    );
  }
}

const optionalPricingEquals = (
  left: ProductPricing | undefined,
  right: ProductPricing | undefined,
): boolean =>
  left === undefined ? right === undefined : left.equals(right);
