import type { ProductEntryImageReference } from "../product-entry.types";

export interface ImageBackgroundProcessingResult {
  /** Preview output composed on a pure #FFFFFF background. */
  processedPreviewUrl: string;
}

export interface ImageBackgroundProcessingPort {
  readonly available: boolean;
  process(
    image: Readonly<ProductEntryImageReference>,
  ): Promise<ImageBackgroundProcessingResult>;
}
