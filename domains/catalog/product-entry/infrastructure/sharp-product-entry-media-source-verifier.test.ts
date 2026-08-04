import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, it } from "node:test";
import sharp from "sharp";
import { SharpProductImageProcessor } from "../../media/infrastructure/sharp-product-image.processor";
import { ProductImageProcessingConfiguration } from "../../media/ports/product-image-processor";
import { SharpProductEntryMediaSourceVerifier } from "./sharp-product-entry-media-source-verifier";

const configuration = (overrides: Partial<{
  maximumSourceBytes: number;
  maximumDecodedPixels: number;
  maximumWidth: number;
  maximumHeight: number;
}> = {}) => ProductImageProcessingConfiguration.create({
  maximumSourceBytes: 1024 * 1024,
  maximumDecodedPixels: 1_000_000,
  maximumWidth: 100,
  maximumHeight: 100,
  webpQuality: 82,
  ...overrides,
});

const fixture = async (width = 8, height = 6): Promise<Uint8Array> => new Uint8Array(await sharp({
  create: { width, height, channels: 3, background: { r: 20, g: 40, b: 60 } },
}).png().toBuffer());

const command = (bytes: Uint8Array, overrides: Partial<{
  expectedSha256: string;
  expectedByteLength: number;
  clientMediaType: string | null;
}> = {}) => ({
  operationId: "add-a",
  bytes,
  expectedSha256: createHash("sha256").update(bytes).digest("hex"),
  expectedByteLength: bytes.byteLength,
  clientMediaType: "image/png",
  ...overrides,
});

describe("SharpProductEntryMediaSourceVerifier", () => {
  it("detects the content type and ignores a false client MIME", async () => {
    const bytes = await fixture();
    const result = await new SharpProductEntryMediaSourceVerifier(new SharpProductImageProcessor(), configuration())
      .verify(command(bytes, { clientMediaType: "text/plain" }));
    assert.equal(result.type, "Verified");
    if (result.type === "Verified") {
      assert.equal(result.source.detectedMediaType, "image/png");
      assert.equal(result.source.rawByteLength, bytes.byteLength);
      assert.equal(result.source.width, 8);
    }
  });

  it("rejects raw byte-length and SHA-256 mismatches", async () => {
    const bytes = await fixture();
    const verifier = new SharpProductEntryMediaSourceVerifier(new SharpProductImageProcessor(), configuration());
    assert.equal((await verifier.verify(command(bytes, { expectedByteLength: bytes.byteLength + 1 }))).type, "Rejected");
    assert.deepEqual(await verifier.verify(command(bytes, { expectedSha256: "0".repeat(64) })), {
      type: "Rejected", code: "SOURCE_SHA256_MISMATCH", operationId: "add-a",
    });
    assert.deepEqual(await verifier.verify(command(bytes, { expectedByteLength: bytes.byteLength + 1 })), {
      type: "Rejected", code: "SOURCE_BYTE_LENGTH_MISMATCH", operationId: "add-a",
    });
  });

  it("rejects unsupported and corrupt image content independently", async () => {
    const unsupported = new Uint8Array(Buffer.from("GIF89a-not-supported"));
    const corruptJpeg = new Uint8Array([0xff, 0xd8, 0xff, 0x00, 0x01]);
    const verifier = new SharpProductEntryMediaSourceVerifier(new SharpProductImageProcessor(), configuration());
    assert.deepEqual(await verifier.verify(command(unsupported)), {
      type: "Rejected", code: "SOURCE_MIME_UNSUPPORTED", operationId: "add-a",
    });
    assert.deepEqual(await verifier.verify(command(corruptJpeg)), {
      type: "Rejected", code: "SOURCE_IMAGE_INVALID", operationId: "add-a",
    });
  });

  it("rejects configured source-size and decoded-dimension limits", async () => {
    const bytes = await fixture(8, 6);
    const tooLarge = new SharpProductEntryMediaSourceVerifier(
      new SharpProductImageProcessor(),
      configuration({ maximumSourceBytes: bytes.byteLength - 1 }),
    );
    assert.deepEqual(await tooLarge.verify(command(bytes)), {
      type: "Rejected", code: "SOURCE_TOO_LARGE", operationId: "add-a",
    });
    const dimensions = new SharpProductEntryMediaSourceVerifier(
      new SharpProductImageProcessor(),
      configuration({ maximumWidth: 7 }),
    );
    assert.deepEqual(await dimensions.verify(command(bytes)), {
      type: "Rejected", code: "SOURCE_DIMENSIONS_UNSUPPORTED", operationId: "add-a",
    });
  });
});
