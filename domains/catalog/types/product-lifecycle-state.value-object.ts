export const PRODUCT_LIFECYCLE_STATES = {
  draft: "Draft",
  published: "Published",
  archived: "Archived",
} as const;

export type ProductLifecycleStateValue =
  (typeof PRODUCT_LIFECYCLE_STATES)[keyof typeof PRODUCT_LIFECYCLE_STATES];

const isProductLifecycleStateValue = (
  value: string,
): value is ProductLifecycleStateValue =>
  Object.values(PRODUCT_LIFECYCLE_STATES).some((state) => state === value);

export class ProductLifecycleState {
  private readonly internalValue: ProductLifecycleStateValue;

  private constructor(value: ProductLifecycleStateValue) {
    this.internalValue = value;
    Object.freeze(this);
  }

  static draft(): ProductLifecycleState {
    return new ProductLifecycleState(PRODUCT_LIFECYCLE_STATES.draft);
  }

  static rehydrate(value: string): ProductLifecycleState {
    if (!isProductLifecycleStateValue(value)) {
      throw new Error(`Invalid Product lifecycle state: "${value}".`);
    }

    return new ProductLifecycleState(value);
  }

  get value(): ProductLifecycleStateValue {
    return this.internalValue;
  }
}
