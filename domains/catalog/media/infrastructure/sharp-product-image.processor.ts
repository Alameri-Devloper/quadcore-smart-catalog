import { createHash } from "node:crypto";
import sharp from "sharp";
import type {
  NormalizeProductImageResult,
  ProductImageFailureCode,
  ProductImageInspectionResult,
  ProductImageProcessingConfiguration,
  ProductImageProcessor,
} from "../ports/product-image-processor";

const supported = new Set(["jpeg", "png", "webp"]);

const rejection = (code: ProductImageFailureCode): ProductImageInspectionResult => ({ type: "Rejected", code });

type SignatureClassification =
  | { readonly type: "Supported"; readonly format: "jpeg" | "png" | "webp"; readonly animatedWebP: boolean }
  | { readonly type: "Rejected" };

const ascii = (input: Uint8Array, start: number, end: number): string =>
  String.fromCharCode(...input.subarray(start, end));

const littleEndianUint32 = (input: Uint8Array, offset: number): number =>
  (input[offset] | (input[offset + 1] << 8) | (input[offset + 2] << 16) | (input[offset + 3] << 24)) >>> 0;

const webPAnimation = (input: Uint8Array): boolean => {
  let offset = 12;
  while (offset + 8 <= input.byteLength) {
    const chunk = ascii(input, offset, offset + 4);
    const size = littleEndianUint32(input, offset + 4);
    const dataStart = offset + 8;
    const dataEnd = dataStart + size;
    if (dataEnd > input.byteLength) return false;
    if (chunk === "ANIM") return true;
    if (chunk === "VP8X" && size >= 1 && (input[dataStart] & 0x02) !== 0) return true;
    offset = dataEnd + (size % 2);
  }
  return false;
};

const classifySignature = (input: Uint8Array): SignatureClassification => {
  if (input.byteLength >= 3 && input[0] === 0xff && input[1] === 0xd8 && input[2] === 0xff) {
    return { type: "Supported", format: "jpeg", animatedWebP: false };
  }
  const png = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
  if (input.byteLength >= png.length && png.every((byte, index) => input[index] === byte)) {
    return { type: "Supported", format: "png", animatedWebP: false };
  }
  if (input.byteLength >= 12 && ascii(input, 0, 4) === "RIFF" && ascii(input, 8, 12) === "WEBP") {
    return { type: "Supported", format: "webp", animatedWebP: webPAnimation(input) };
  }
  if (input.byteLength >= 6 && (ascii(input, 0, 6) === "GIF87a" || ascii(input, 0, 6) === "GIF89a")) return { type: "Rejected" };
  if (input.byteLength >= 2 && ascii(input, 0, 2) === "BM") return { type: "Rejected" };
  if (input.byteLength >= 4 && (ascii(input, 0, 4) === "II*\0" || ascii(input, 0, 4) === "MM\0*")) return { type: "Rejected" };
  if (input.byteLength >= 12 && ascii(input, 4, 8) === "ftyp") return { type: "Rejected" };
  const textPrefix = new TextDecoder().decode(input.subarray(0, Math.min(256, input.byteLength))).trimStart().toLowerCase();
  if (textPrefix.startsWith("<svg") || (textPrefix.startsWith("<?xml") && textPrefix.includes("<svg"))) return { type: "Rejected" };
  return { type: "Rejected" };
};

export class SharpProductImageProcessor implements ProductImageProcessor {
  async inspect(input: Uint8Array): Promise<ProductImageInspectionResult> {
    const signature = classifySignature(input);
    if (signature.type === "Rejected") return rejection("UnsupportedFormat");
    if (signature.animatedWebP) return rejection("AnimatedImage");
    try {
      const metadata = await sharp(input, { animated: true, failOn: "error" }).metadata();
      if (!metadata.format || !supported.has(metadata.format) || metadata.format !== signature.format || !metadata.width || !metadata.height) {
        return rejection("UnsupportedFormat");
      }
      if ((metadata.pages ?? 1) > 1) return rejection("AnimatedImage");
      return {
        type: "Inspected",
        inspection: Object.freeze({
          format: metadata.format as "jpeg" | "png" | "webp",
          width: metadata.width,
          height: metadata.height,
          hasAlpha: metadata.hasAlpha ?? false,
          animated: false,
        }),
      };
    } catch {
      return rejection("CorruptImage");
    }
  }

  async normalize(input: Uint8Array, configuration: ProductImageProcessingConfiguration): Promise<NormalizeProductImageResult> {
    if (input.byteLength > configuration.maximumSourceBytes) return { type: "Rejected", code: "SourceTooLarge" };
    const inspected = await this.inspect(input);
    if (inspected.type === "Rejected") return inspected;
    if (inspected.inspection.width * inspected.inspection.height > configuration.maximumDecodedPixels) {
      return { type: "Rejected", code: "DecodedPixelsExceeded" };
    }
    try {
      const output = await sharp(input, { failOn: "error", limitInputPixels: configuration.maximumDecodedPixels })
        .rotate()
        .resize({
          width: configuration.maximumWidth,
          height: configuration.maximumHeight,
          fit: "inside",
          withoutEnlargement: true,
        })
        .toColourspace("srgb")
        .webp({ quality: configuration.webpQuality, effort: 4 })
        .toBuffer({ resolveWithObject: true });
      const bytes = new Uint8Array(output.data);
      return {
        type: "Normalized",
        image: Object.freeze({
          bytes,
          mediaType: "image/webp",
          width: output.info.width,
          height: output.info.height,
          sha256: createHash("sha256").update(bytes).digest("hex"),
        }),
      };
    } catch {
      return { type: "Rejected", code: "CorruptImage" };
    }
  }
}
