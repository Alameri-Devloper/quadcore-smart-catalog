export const PRODUCT_ARCHIVE_REASONS = {
  manual: "Manual",
  publicationRequirementsNotMet: "PublicationRequirementsNotMet",
} as const;

export type ProductArchiveReasonValue =
  (typeof PRODUCT_ARCHIVE_REASONS)[keyof typeof PRODUCT_ARCHIVE_REASONS];

const SUPPORTED_REASONS = Object.values(PRODUCT_ARCHIVE_REASONS);

export class ProductArchiveReason {
  private constructor(readonly value: ProductArchiveReasonValue) {
    Object.freeze(this);
  }

  static manual(): ProductArchiveReason {
    return new ProductArchiveReason(PRODUCT_ARCHIVE_REASONS.manual);
  }

  static publicationRequirementsNotMet(): ProductArchiveReason {
    return new ProductArchiveReason(
      PRODUCT_ARCHIVE_REASONS.publicationRequirementsNotMet,
    );
  }

  static rehydrate(value: ProductArchiveReasonValue): ProductArchiveReason {
    if (!SUPPORTED_REASONS.includes(value)) {
      throw new Error(`Unsupported Product archive reason: "${value}".`);
    }
    return new ProductArchiveReason(value);
  }

  equals(other: ProductArchiveReason | undefined): boolean {
    return other !== undefined && this.value === other.value;
  }
}
