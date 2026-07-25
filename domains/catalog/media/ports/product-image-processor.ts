export type ProductImageFormat = "jpeg" | "png" | "webp";

export interface ProductImageInspection {
  readonly format: ProductImageFormat;
  readonly width: number;
  readonly height: number;
  readonly hasAlpha: boolean;
  readonly animated: false;
}

export type ProductImageFailureCode =
  | "SourceTooLarge"
  | "DecodedPixelsExceeded"
  | "UnsupportedFormat"
  | "AnimatedImage"
  | "CorruptImage";

export type ProductImageInspectionResult =
  | { readonly type: "Inspected"; readonly inspection: ProductImageInspection }
  | { readonly type: "Rejected"; readonly code: ProductImageFailureCode };

export interface ProductImageProcessingConfigurationInput {
  readonly maximumSourceBytes: number;
  readonly maximumDecodedPixels: number;
  readonly maximumWidth: number;
  readonly maximumHeight: number;
  readonly webpQuality: number;
}

export class InvalidProductImageProcessingConfigurationError extends Error {
  constructor() {
    super("Product image processing configuration is invalid.");
    this.name = "InvalidProductImageProcessingConfigurationError";
  }
}

export class ProductImageProcessingConfiguration {
  private constructor(
    readonly maximumSourceBytes: number,
    readonly maximumDecodedPixels: number,
    readonly maximumWidth: number,
    readonly maximumHeight: number,
    readonly webpQuality: number,
  ) {
    Object.freeze(this);
  }

  static create(input: ProductImageProcessingConfigurationInput): ProductImageProcessingConfiguration {
    const positiveIntegers = [input.maximumSourceBytes, input.maximumDecodedPixels, input.maximumWidth, input.maximumHeight];
    if (positiveIntegers.some((value) => !Number.isSafeInteger(value) || value <= 0) ||
      !Number.isInteger(input.webpQuality) || input.webpQuality < 1 || input.webpQuality > 100) {
      throw new InvalidProductImageProcessingConfigurationError();
    }
    return new ProductImageProcessingConfiguration(
      input.maximumSourceBytes,
      input.maximumDecodedPixels,
      input.maximumWidth,
      input.maximumHeight,
      input.webpQuality,
    );
  }
}

export interface NormalizedProductImage {
  readonly bytes: Uint8Array;
  readonly mediaType: "image/webp";
  readonly width: number;
  readonly height: number;
  readonly sha256: string;
}

export type NormalizeProductImageResult =
  | { readonly type: "Normalized"; readonly image: NormalizedProductImage }
  | { readonly type: "Rejected"; readonly code: ProductImageFailureCode };

export interface ProductImageProcessor {
  inspect(input: Uint8Array): Promise<ProductImageInspectionResult>;
  normalize(input: Uint8Array, configuration: ProductImageProcessingConfiguration): Promise<NormalizeProductImageResult>;
}

export const DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION = ProductImageProcessingConfiguration.create({
  maximumSourceBytes: 10 * 1024 * 1024,
  maximumDecodedPixels: 40_000_000,
  maximumWidth: 2000,
  maximumHeight: 2000,
  webpQuality: 82,
});
