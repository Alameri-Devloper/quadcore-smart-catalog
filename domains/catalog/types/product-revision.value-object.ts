export class ProductRevision {
  private readonly internalValue: number;

  private constructor(value: number) {
    this.internalValue = value;
    Object.freeze(this);
  }

  static initial(): ProductRevision {
    return new ProductRevision(0);
  }

  static rehydrate(value: number): ProductRevision {
    if (!Number.isSafeInteger(value) || value < 0) {
      throw new Error("Product Revision must be a non-negative safe integer.");
    }

    return new ProductRevision(value);
  }

  next(): ProductRevision {
    if (this.internalValue === Number.MAX_SAFE_INTEGER) {
      throw new Error("Product Revision cannot exceed the safe integer limit.");
    }

    return new ProductRevision(this.internalValue + 1);
  }

  equals(other: ProductRevision): boolean {
    return this.internalValue === other.internalValue;
  }

  get value(): number {
    return this.internalValue;
  }
}
