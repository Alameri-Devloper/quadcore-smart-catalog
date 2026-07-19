export interface ProductClassificationInput {
  categoryId?: string;
  deviceClassId?: string;
  conditionId?: string;
  availabilityStatusId?: string;
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
  readonly deviceClassId?: string;
  readonly conditionId?: string;
  readonly availabilityStatusId?: string;

  private constructor(input: ProductClassificationInput) {
    this.categoryId = input.categoryId;
    this.deviceClassId = input.deviceClassId;
    this.conditionId = input.conditionId;
    this.availabilityStatusId = input.availabilityStatusId;
    Object.freeze(this);
  }

  static create(input: ProductClassificationInput): ProductClassification {
    validateOptionalReference("CategoryId", input.categoryId);
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
      this.deviceClassId === other.deviceClassId &&
      this.conditionId === other.conditionId &&
      this.availabilityStatusId === other.availabilityStatusId
    );
  }
}
