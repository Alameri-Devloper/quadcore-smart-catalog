export interface ProductClassificationInput {
  categoryId?: string;
  productTypeId?: ProductTypeId;
  deviceClassId?: string;
  conditionId?: string;
  availabilityStatusId?: string;
}

export class ProductTypeId {
  readonly value: string;

  private constructor(value: string) {
    this.value = value;
    Object.freeze(this);
  }

  static create(value: string): ProductTypeId {
    if (value.trim().length === 0) {
      throw new Error("ProductTypeId cannot be empty.");
    }

    return new ProductTypeId(value);
  }

  equals(other: ProductTypeId | undefined): boolean {
    return other !== undefined && this.value === other.value;
  }
}

const validateOptionalReference = (
  name: string,
  value: string | undefined,
): void => {
  if (value !== undefined && value.trim().length === 0) {
    throw new Error(`${name} cannot be empty when provided.`);
  }
};

export class ProductClassification {
  readonly categoryId?: string;
  readonly productTypeId?: ProductTypeId;
  readonly deviceClassId?: string;
  readonly conditionId?: string;
  readonly availabilityStatusId?: string;

  private constructor(input: ProductClassificationInput) {
    this.categoryId = input.categoryId;
    this.productTypeId = input.productTypeId;
    this.deviceClassId = input.deviceClassId;
    this.conditionId = input.conditionId;
    this.availabilityStatusId = input.availabilityStatusId;
    Object.freeze(this);
  }

  static create(input: ProductClassificationInput): ProductClassification {
    validateOptionalReference("CategoryId", input.categoryId);
    if (
      input.productTypeId !== undefined &&
      !(input.productTypeId instanceof ProductTypeId)
    ) {
      throw new Error("ProductTypeId must be a valid typed identifier.");
    }
    validateOptionalReference("DeviceClassId", input.deviceClassId);
    validateOptionalReference("ConditionId", input.conditionId);
    validateOptionalReference(
      "CatalogAvailabilityStatusId",
      input.availabilityStatusId,
    );

    return new ProductClassification(input);
  }

  equals(other: ProductClassification | undefined): boolean {
    return (
      other !== undefined &&
      this.categoryId === other.categoryId &&
      optionalProductTypeIdEquals(this.productTypeId, other.productTypeId) &&
      this.deviceClassId === other.deviceClassId &&
      this.conditionId === other.conditionId &&
      this.availabilityStatusId === other.availabilityStatusId
    );
  }
}

const optionalProductTypeIdEquals = (
  left: ProductTypeId | undefined,
  right: ProductTypeId | undefined,
): boolean =>
  left === undefined ? right === undefined : left.equals(right);
