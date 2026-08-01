const CANONICAL_OPERATION_ID = /^[a-z0-9][a-z0-9._-]*$/;
const WINDOWS_RESERVED_OPERATION_ID = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const RESERVED_MEDIA_NAMESPACES = new Set(["_staging", "_trash", "_variants"]);

const assertCanonicalOperationId = (value: string): string => {
  if (
    typeof value !== "string"
    || value.length < 1
    || value.length > 80
    || !CANONICAL_OPERATION_ID.test(value)
    || value.endsWith(".")
    || WINDOWS_RESERVED_OPERATION_ID.test(value)
    || RESERVED_MEDIA_NAMESPACES.has(value)
  ) {
    throw new Error("ProductMediaOperationId must be a safe lowercase canonical identifier between 1 and 80 characters.");
  }
  return value;
};

export class ProductMediaOperationId {
  private constructor(private readonly canonicalValue: string) {
    Object.freeze(this);
  }

  static create(value: string): ProductMediaOperationId {
    return new ProductMediaOperationId(assertCanonicalOperationId(value));
  }

  static rehydrate(value: string): ProductMediaOperationId {
    return ProductMediaOperationId.create(value);
  }

  get value(): string {
    return this.canonicalValue;
  }

  equals(other: ProductMediaOperationId): boolean {
    return this.canonicalValue === other.canonicalValue;
  }
}
