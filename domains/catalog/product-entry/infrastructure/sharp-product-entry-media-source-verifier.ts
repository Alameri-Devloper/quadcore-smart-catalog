import { createHash } from "node:crypto";
import type { ProductImageProcessingConfiguration, ProductImageProcessor } from "../../media/ports/product-image-processor";
import {
  PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES,
  type ProductEntryMediaSourceVerificationCommand,
  type ProductEntryMediaSourceVerificationResult,
  type ProductEntryMediaSourceVerifier,
} from "../ports/product-entry-media-source-verifier.port";

const detectedMediaType = {
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
} as const;

export class SharpProductEntryMediaSourceVerifier implements ProductEntryMediaSourceVerifier {
  constructor(
    private readonly processor: Pick<ProductImageProcessor, "inspect">,
    private readonly configuration: ProductImageProcessingConfiguration,
  ) {}

  async verify(
    command: ProductEntryMediaSourceVerificationCommand,
  ): Promise<ProductEntryMediaSourceVerificationResult> {
    const rejected = (code: (typeof PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES)[keyof typeof PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES]) => ({
      type: "Rejected" as const,
      code,
      operationId: command.operationId,
    });
    if (command.bytes.byteLength === 0) return rejected(PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.required);
    if (command.bytes.byteLength > this.configuration.maximumSourceBytes) {
      return rejected(PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.tooLarge);
    }
    if (command.bytes.byteLength !== command.expectedByteLength) {
      return rejected(PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.byteLengthMismatch);
    }
    const rawSha256 = createHash("sha256").update(command.bytes).digest("hex");
    if (rawSha256 !== command.expectedSha256) {
      return rejected(PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.sha256Mismatch);
    }
    const inspected = await this.processor.inspect(command.bytes);
    if (inspected.type === "Rejected") {
      return rejected(inspected.code === "CorruptImage"
        ? PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.imageInvalid
        : PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.mimeUnsupported);
    }
    const { width, height } = inspected.inspection;
    if (
      width > this.configuration.maximumWidth
      || height > this.configuration.maximumHeight
      || width * height > this.configuration.maximumDecodedPixels
    ) {
      return rejected(PRODUCT_ENTRY_MEDIA_SOURCE_ERROR_CODES.dimensionsUnsupported);
    }
    return {
      type: "Verified",
      source: Object.freeze({
        operationId: command.operationId,
        bytes: command.bytes,
        rawSha256,
        rawByteLength: command.bytes.byteLength,
        detectedMediaType: detectedMediaType[inspected.inspection.format],
        width,
        height,
      }),
    };
  }
}
