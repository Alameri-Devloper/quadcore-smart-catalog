export interface MoneyInput {
  amountMinor: number;
  currency: string;
}

export class Money {
  readonly amountMinor: number;
  readonly currency: string;

  private constructor(input: MoneyInput) {
    this.amountMinor = input.amountMinor;
    this.currency = input.currency;
    Object.freeze(this);
  }

  static create(input: MoneyInput): Money {
    if (!Number.isSafeInteger(input.amountMinor) || input.amountMinor < 0) {
      throw new Error("Money amount must be a non-negative safe integer.");
    }

    if (
      input.currency.trim().length === 0 ||
      input.currency !== input.currency.trim().toUpperCase()
    ) {
      throw new Error("Money currency must be non-empty and normalized.");
    }

    return new Money(input);
  }

  equals(other: Money | undefined): boolean {
    return (
      other !== undefined &&
      this.amountMinor === other.amountMinor &&
      this.currency === other.currency
    );
  }
}

export interface ProductPricingInput {
  wholesalePrice?: MoneyInput;
  retailPrice?: MoneyInput;
}

export class ProductPricing {
  readonly wholesalePrice?: Money;
  readonly retailPrice?: Money;

  private constructor(input: ProductPricingInput) {
    this.wholesalePrice = input.wholesalePrice
      ? Money.create(input.wholesalePrice)
      : undefined;
    this.retailPrice = input.retailPrice
      ? Money.create(input.retailPrice)
      : undefined;
    Object.freeze(this);
  }

  static create(input: ProductPricingInput = {}): ProductPricing {
    return new ProductPricing(input);
  }

  equals(other: ProductPricing | undefined): boolean {
    return (
      other !== undefined &&
      optionalMoneyEquals(this.wholesalePrice, other.wholesalePrice) &&
      optionalMoneyEquals(this.retailPrice, other.retailPrice)
    );
  }
}

const optionalMoneyEquals = (
  left: Money | undefined,
  right: Money | undefined,
): boolean =>
  left === undefined ? right === undefined : left.equals(right);
