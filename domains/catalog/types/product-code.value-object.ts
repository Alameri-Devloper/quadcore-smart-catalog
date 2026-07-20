export class ProductCode {
  private readonly internalValue: string;

  private constructor(value: string) {
    this.internalValue = value;
    Object.freeze(this);
  }

  static create(value: string): ProductCode {
    if (typeof value !== "string" || value.trim().length === 0) {
      throw new Error("ProductCode cannot be empty.");
    }

    return new ProductCode(value.trim().toUpperCase());
  }

  get value(): string {
    return this.internalValue;
  }

  equals(other: ProductCode | undefined): boolean {
    return other !== undefined && this.internalValue === other.internalValue;
  }
}
