import type { SpecificationValue } from "./specification-value.entity";

export interface ProductSpecificationValueInput {
  specificationFieldId: string;
  value: SpecificationValue;
}

export class ProductSpecificationValue {
  readonly specificationFieldId: string;
  readonly value: SpecificationValue;

  private constructor(input: ProductSpecificationValueInput) {
    this.specificationFieldId = input.specificationFieldId;
    this.value = input.value;
    Object.freeze(this);
  }

  static create(
    input: ProductSpecificationValueInput,
  ): ProductSpecificationValue {
    if (input.specificationFieldId.trim().length === 0) {
      throw new Error("SpecificationFieldId cannot be empty.");
    }

    return new ProductSpecificationValue(input);
  }

  equals(other: ProductSpecificationValue): boolean {
    return (
      this.specificationFieldId === other.specificationFieldId &&
      Object.is(this.value, other.value)
    );
  }
}

export const createProductSpecificationValues = (
  inputs: readonly ProductSpecificationValueInput[],
): ProductSpecificationValue[] => {
  const values = inputs.map(ProductSpecificationValue.create);
  const fieldIds = new Set<string>();

  for (const value of values) {
    if (fieldIds.has(value.specificationFieldId)) {
      throw new Error(
        `Duplicate SpecificationFieldId: "${value.specificationFieldId}".`,
      );
    }

    fieldIds.add(value.specificationFieldId);
  }

  return values;
};
