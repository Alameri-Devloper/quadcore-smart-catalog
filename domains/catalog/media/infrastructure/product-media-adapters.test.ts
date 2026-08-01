import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { link as fsLink, mkdir, mkdtemp, open as fsOpen, readFile, rm, symlink, unlink, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, it } from "node:test";
import sharp from "sharp";
import {
  ProductMediaFinalKey,
  ProductMediaStagingKey,
  ProductMediaStorageRootKey,
  ProductMediaTrashKey,
} from "../domain/product-media-keys";
import { ProductMediaSlots } from "../domain/product-media-slot";
import {
  DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION,
  InvalidProductImageProcessingConfigurationError,
  type ProductImageProcessor,
  ProductImageProcessingConfiguration,
} from "../ports/product-image-processor";
import {
  ProductMediaStorageInfrastructureError,
  ProductMediaStoragePartialOperationError,
  type StagedProductMediaObject,
} from "../ports/product-media-storage.port";
import { LocalProductMediaStorageAdapter } from "./local-product-media-storage.adapter";
import { SharpProductImageProcessor } from "./sharp-product-image.processor";

const processor = new SharpProductImageProcessor();
const rootKey = (workspace = "ws"): ProductMediaStorageRootKey =>
  ProductMediaStorageRootKey.create(`workspaces/${workspace}/phones/product--0123456789abcdef`);
const fixture = (format: "jpeg" | "png" | "webp", width = 12, height = 8, alpha = false): Promise<Buffer> => {
  const image = sharp({ create: { width, height, channels: alpha ? 4 : 3, background: alpha ? { r: 20, g: 40, b: 60, alpha: 0.4 } : { r: 20, g: 40, b: 60 } } });
  return image[format]().toBuffer();
};
const configuration = (overrides: Partial<{ maximumSourceBytes: number; maximumDecodedPixels: number; maximumWidth: number; maximumHeight: number; webpQuality: number }> = {}) =>
  ProductImageProcessingConfiguration.create({
    maximumSourceBytes: 10 * 1024 * 1024,
    maximumDecodedPixels: 40_000_000,
    maximumWidth: 2000,
    maximumHeight: 2000,
    webpQuality: 82,
    ...overrides,
  });

describe("Sharp Product image processor", () => {
  it("accepts content-signature JPEG, PNG, and WebP and normalizes each to WebP", async () => {
    for (const format of ["jpeg", "png", "webp"] as const) {
      const source = await fixture(format);
      const inspection = await processor.inspect(source);
      assert.equal(inspection.type, "Inspected");
      const normalized = await processor.normalize(source, DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION);
      assert.equal(normalized.type, "Normalized");
      if (normalized.type === "Normalized") {
        assert.equal(Buffer.from(normalized.image.bytes.subarray(0, 4)).toString("ascii"), "RIFF");
        assert.equal(normalized.image.sha256, createHash("sha256").update(normalized.image.bytes).digest("hex"));
      }
    }
  });

  it("deterministically rejects GIF, BMP, TIFF, HEIC/HEIF, SVG/text, and unknown signatures", async () => {
    const rejected = [
      Buffer.from("GIF89a", "ascii"),
      Buffer.from([0x42, 0x4d, 0, 0, 0, 0]),
      Buffer.from([0x49, 0x49, 0x2a, 0x00]),
      Buffer.from([0, 0, 0, 24, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]),
      Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>"),
      Buffer.from("unknown binary"),
    ];
    for (const input of rejected) {
      assert.deepEqual(await processor.inspect(input), { type: "Rejected", code: "UnsupportedFormat" });
    }
  });

  it("parses WebP RIFF animation chunks without scanning compressed payload text", async () => {
    const animated = Buffer.alloc(30);
    animated.write("RIFF", 0, "ascii");
    animated.writeUInt32LE(22, 4);
    animated.write("WEBP", 8, "ascii");
    animated.write("VP8X", 12, "ascii");
    animated.writeUInt32LE(10, 16);
    animated[20] = 0x02;
    assert.deepEqual(await processor.inspect(animated), { type: "Rejected", code: "AnimatedImage" });

    const stillPayloadMarker = await fixture("webp");
    assert.equal((await processor.inspect(stillPayloadMarker)).type, "Inspected");
  });

  it("reports corrupt data only when a supported signature fails decoding", async () => {
    const corruptJpeg = Buffer.from([0xff, 0xd8, 0xff, 0, 1, 2, 3]);
    assert.deepEqual(await processor.inspect(corruptJpeg), { type: "Rejected", code: "CorruptImage" });
  });

  it("validates configuration before processing", () => {
    const invalid = [
      { maximumSourceBytes: 0 },
      { maximumDecodedPixels: -1 },
      { maximumWidth: Number.NaN },
      { maximumHeight: Number.POSITIVE_INFINITY },
      { webpQuality: 0 },
      { webpQuality: 101 },
      { webpQuality: 82.5 },
    ];
    for (const override of invalid) {
      assert.throws(() => configuration(override), InvalidProductImageProcessingConfigurationError);
    }
  });

  it("enforces source-byte and decoded-pixel limits", async () => {
    const source = await fixture("png", 20, 20);
    assert.deepEqual(await processor.normalize(source, configuration({ maximumSourceBytes: source.byteLength - 1 })), { type: "Rejected", code: "SourceTooLarge" });
    assert.deepEqual(await processor.normalize(source, configuration({ maximumDecodedPixels: 399 })), { type: "Rejected", code: "DecodedPixelsExceeded" });
  });

  it("limits dimensions without upscaling, preserves alpha, rotates orientation, converts sRGB, and removes EXIF", async () => {
    const resized = await processor.normalize(await fixture("jpeg", 40, 20), configuration({ maximumWidth: 10, maximumHeight: 10 }));
    assert.equal(resized.type, "Normalized");
    if (resized.type === "Normalized") assert.deepEqual([resized.image.width, resized.image.height], [10, 5]);

    const small = await processor.normalize(await fixture("png", 4, 3, true), DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION);
    if (small.type === "Normalized") {
      assert.deepEqual([small.image.width, small.image.height], [4, 3]);
      assert.equal((await sharp(small.image.bytes).metadata()).hasAlpha, true);
    }

    const oriented = await sharp(await fixture("jpeg", 6, 3)).withMetadata({ orientation: 6 }).jpeg().toBuffer();
    const normalized = await processor.normalize(oriented, DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION);
    if (normalized.type === "Normalized") {
      const metadata = await sharp(normalized.image.bytes).metadata();
      assert.deepEqual([metadata.width, metadata.height], [3, 6]);
      assert.equal(metadata.orientation, undefined);
      assert.equal(metadata.exif, undefined);
      assert.equal(metadata.space, "srgb");
    }
  });
});

describe("Local Product media storage adapter", () => {
  const withAdapter = async (run: (root: string, adapter: LocalProductMediaStorageAdapter) => Promise<void>): Promise<void> => {
    const root = await mkdtemp(join(tmpdir(), "qsc-media-"));
    try {
      await run(root, await LocalProductMediaStorageAdapter.create(root, processor));
    } finally {
      await rm(root, { recursive: true, force: true });
    }
  };

  const normalized = async () => {
    const result = await processor.normalize(await fixture("png"), DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION);
    assert.equal(result.type, "Normalized");
    if (result.type !== "Normalized") throw new Error("fixture normalization failed");
    return result.image;
  };

  it("validates QSC_MEDIA_ROOT as an existing absolute directory", async () => {
    await assert.rejects(LocalProductMediaStorageAdapter.create(undefined, processor));
    await assert.rejects(LocalProductMediaStorageAdapter.create("relative", processor));
    await assert.rejects(LocalProductMediaStorageAdapter.create(join(tmpdir(), "missing-qsc-media"), processor));
  });

  it("handles concurrent creation of shared parent directories", async () => withAdapter(async (_root, adapter) => {
    const root = rootKey();
    const image = await normalized();
    const results = await Promise.all([
      adapter.stage({ stagingKey: ProductMediaStagingKey.create(root, "concurrent-a"), image }),
      adapter.stage({ stagingKey: ProductMediaStagingKey.create(root, "concurrent-b"), image }),
    ]);
    assert.deepEqual(results.map((result) => result.type), ["Staged", "Staged"]);
  }));

  it("reports staging ambiguity when cleanup of an operation-owned partial file fails", async () => {
    const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-media-stage-partial-"));
    try {
      const adapter = await LocalProductMediaStorageAdapter.create(physicalRoot, processor, {
        link: fsLink,
        open: fsOpen,
        readFile: (async () => { throw Object.assign(new Error("injected staging inspection failure"), { code: "EIO" }); }) as typeof readFile,
        unlink: async () => { throw Object.assign(new Error("injected staging cleanup failure"), { code: "EIO" }); },
      });
      const stagingKey = ProductMediaStagingKey.create(rootKey(), "stage-partial");
      await assert.rejects(
        adapter.stage({ stagingKey, image: await normalized() }),
        (error: unknown) => error instanceof ProductMediaStoragePartialOperationError && error.operation === "stage",
      );
      assert.ok((await readFile(join(physicalRoot, ...stagingKey.value.split("/")))).byteLength > 0);
    } finally {
      await rm(physicalRoot, { recursive: true, force: true });
    }
  });

  it("verifies final checksum and length before removing staging", async () => withAdapter(async (physicalRoot, adapter) => {
    const root = rootKey();
    const stagingKey = ProductMediaStagingKey.create(root, "publish");
    const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
    const staged = await adapter.stage({ stagingKey, image: await normalized() });
    assert.equal(staged.type, "Staged");
    if (staged.type !== "Staged") return;
    const published = await adapter.publishNew({ stagedObject: staged.object, finalKey });
    assert.equal(published.type, "Published");
    assert.deepEqual(await adapter.exists(finalKey), { type: "Exists", exists: true });
    await assert.rejects(readFile(join(physicalRoot, ...stagingKey.value.split("/"))), { code: "ENOENT" });
  }));

  it("reports a publish target conflict without removing the existing final or staged object", async () => withAdapter(async (physicalRoot, adapter) => {
    const root = rootKey();
    const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
    const original = await adapter.stage({ stagingKey: ProductMediaStagingKey.create(root, "publish-original"), image: await normalized() });
    if (original.type !== "Staged") return;
    const published = await adapter.publishNew({ stagedObject: original.object, finalKey });
    if (published.type !== "Published") return;
    const replacement = await adapter.stage({ stagingKey: ProductMediaStagingKey.create(root, "publish-conflict"), image: await normalized() });
    if (replacement.type !== "Staged") return;
    assert.deepEqual(await adapter.publishNew({ stagedObject: replacement.object, finalKey }), { type: "Failed", code: "TargetConflict" });
    assert.deepEqual(await adapter.exists(finalKey), { type: "Exists", exists: true });
    assert.ok((await readFile(join(physicalRoot, ...replacement.object.key.value.split("/")))).byteLength > 0);
  }));

  it("preserves staging and removes invalid final on modified bytes, length mismatch, and checksum mismatch", async () => withAdapter(async (physicalRoot, adapter) => {
    const root = rootKey();
    const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
    const image = await normalized();

    const modifiedKey = ProductMediaStagingKey.create(root, "modified");
    const modified = await adapter.stage({ stagingKey: modifiedKey, image });
    if (modified.type !== "Staged") return;
    await writeFile(join(physicalRoot, ...modifiedKey.value.split("/")), Buffer.from("modified after stage"));
    assert.deepEqual(await adapter.publishNew({ stagedObject: modified.object, finalKey }), { type: "Failed", code: "ChecksumMismatch" });
    assert.ok((await readFile(join(physicalRoot, ...modifiedKey.value.split("/")))).byteLength > 0);
    assert.deepEqual(await adapter.exists(finalKey), { type: "Exists", exists: false });

    const lengthKey = ProductMediaStagingKey.create(root, "length");
    const length = await adapter.stage({ stagingKey: lengthKey, image });
    if (length.type !== "Staged") return;
    const wrongLength: StagedProductMediaObject = { ...length.object, byteLength: length.object.byteLength + 1 };
    assert.deepEqual(await adapter.publishNew({ stagedObject: wrongLength, finalKey }), { type: "Failed", code: "ChecksumMismatch" });

    const hashKey = ProductMediaStagingKey.create(root, "hash");
    const hash = await adapter.stage({ stagingKey: hashKey, image });
    if (hash.type !== "Staged") return;
    const wrongHash: StagedProductMediaObject = { ...hash.object, sha256: "0".repeat(64) };
    assert.deepEqual(await adapter.publishNew({ stagedObject: wrongHash, finalKey }), { type: "Failed", code: "ChecksumMismatch" });
  }));

  it("enforces same-root cohesion for publication, trash, restore, and replacement", async () => withAdapter(async (_physicalRoot, adapter) => {
    const first = rootKey("ws-a");
    const second = rootKey("ws-b");
    const staged = await adapter.stage({ stagingKey: ProductMediaStagingKey.create(first, "cohesion"), image: await normalized() });
    if (staged.type !== "Staged") return;
    const final = ProductMediaFinalKey.fromSlot(second, ProductMediaSlots.main());
    const trash = ProductMediaTrashKey.create(first, "cohesion");
    assert.deepEqual(await adapter.publishNew({ stagedObject: staged.object, finalKey: final }), { type: "Failed", code: "UnsafeKey" });
    assert.deepEqual(await adapter.moveToTrash({ finalKey: final, trashKey: trash }), { type: "Failed", code: "UnsafeKey" });
    assert.deepEqual(await adapter.restoreFromTrash({ finalKey: final, trashKey: trash }), { type: "Failed", code: "UnsafeKey" });
    assert.deepEqual(await adapter.publishReplacement({ stagedObject: staged.object, finalKey: final, trashKey: trash }), { type: "Failed", code: "UnsafeKey" });
  }));

  it("retains old trash and verifies replacement, then restores old final after failed promotion", async () => withAdapter(async (physicalRoot, adapter) => {
    const root = rootKey();
    const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
    const originalKey = ProductMediaStagingKey.create(root, "original");
    const original = await adapter.stage({ stagingKey: originalKey, image: await normalized() });
    if (original.type !== "Staged") return;
    await adapter.publishNew({ stagedObject: original.object, finalKey });

    const replacementKey = ProductMediaStagingKey.create(root, "replacement");
    const replacement = await adapter.stage({ stagingKey: replacementKey, image: await normalized() });
    if (replacement.type !== "Staged") return;
    await writeFile(join(physicalRoot, ...replacementKey.value.split("/")), "corrupt replacement");
    const trashKey = ProductMediaTrashKey.create(root, "backup");
    assert.deepEqual(await adapter.publishReplacement({ stagedObject: replacement.object, finalKey, trashKey }), { type: "Failed", code: "ChecksumMismatch" });
    assert.deepEqual(await adapter.exists(finalKey), { type: "Exists", exists: true });
    await assert.rejects(readFile(join(physicalRoot, ...trashKey.value.split("/"))), { code: "ENOENT" });
    assert.ok((await readFile(join(physicalRoot, ...replacementKey.value.split("/")))).byteLength > 0);
  }));

  it("moves to trash, restores, reports conflicts, and retains the old object after replacement", async () => withAdapter(async (physicalRoot, adapter) => {
    const root = rootKey();
    const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
    const trashKey = ProductMediaTrashKey.create(root, "old-object");
    const firstKey = ProductMediaStagingKey.create(root, "first");
    const first = await adapter.stage({ stagingKey: firstKey, image: await normalized() });
    if (first.type !== "Staged") return;
    await adapter.publishNew({ stagedObject: first.object, finalKey });
    assert.deepEqual(await adapter.moveToTrash({ finalKey, trashKey }), { type: "MovedToTrash" });
    assert.deepEqual(await adapter.exists(finalKey), { type: "Exists", exists: false });
    assert.deepEqual(await adapter.restoreFromTrash({ finalKey, trashKey }), { type: "Restored" });
    assert.deepEqual(await adapter.moveToTrash({ finalKey, trashKey }), { type: "MovedToTrash" });
    await writeFile(join(physicalRoot, ...finalKey.value.split("/")), "unrelated target");
    assert.deepEqual(await adapter.restoreFromTrash({ finalKey, trashKey }), { type: "Failed", code: "TargetConflict" });
    assert.equal((await readFile(join(physicalRoot, ...finalKey.value.split("/")))).toString(), "unrelated target");
    await unlink(join(physicalRoot, ...finalKey.value.split("/")));
    await adapter.restoreFromTrash({ finalKey, trashKey });

    const replacementKey = ProductMediaStagingKey.create(root, "replacement-success");
    const replacement = await adapter.stage({ stagingKey: replacementKey, image: await normalized() });
    if (replacement.type !== "Staged") return;
    const replacementTrash = ProductMediaTrashKey.create(root, "replacement-old");
    assert.equal((await adapter.publishReplacement({ stagedObject: replacement.object, finalKey, trashKey: replacementTrash })).type, "Replaced");
    assert.ok((await readFile(join(physicalRoot, ...replacementTrash.value.split("/")))).byteLength > 0);
    await assert.rejects(readFile(join(physicalRoot, ...replacementKey.value.split("/"))), { code: "ENOENT" });
  }));

  it("reports trash conflicts and discards only its owned staging object", async () => withAdapter(async (physicalRoot, adapter) => {
    const root = rootKey();
    const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
    const stagingA = ProductMediaStagingKey.create(root, "discard-a");
    const stagingB = ProductMediaStagingKey.create(root, "discard-b");
    const stagingC = ProductMediaStagingKey.create(root, "unrelated-staging");
    const image = await normalized();
    const stagedA = await adapter.stage({ stagingKey: stagingA, image });
    await adapter.stage({ stagingKey: stagingB, image });
    await adapter.stage({ stagingKey: stagingC, image });
    if (stagedA.type !== "Staged") return;
    await adapter.publishNew({ stagedObject: stagedA.object, finalKey });
    const trash = ProductMediaTrashKey.create(root, "conflict");
    const trashPath = join(physicalRoot, ...trash.value.split("/"));
    await mkdir(join(trashPath, ".."), { recursive: true });
    await writeFile(trashPath, "unrelated trash");
    assert.deepEqual(await adapter.moveToTrash({ finalKey, trashKey: trash }), { type: "Failed", code: "TrashConflict" });
    assert.equal((await readFile(trashPath)).toString(), "unrelated trash");
    assert.deepEqual(await adapter.discardTemporary({ stagingKey: stagingB }), { type: "Discarded" });
    await assert.rejects(readFile(join(physicalRoot, ...stagingB.value.split("/"))), { code: "ENOENT" });
    assert.ok((await readFile(join(physicalRoot, ...stagingC.value.split("/")))).byteLength > 0);
  }));

  it("rolls back operation-owned destinations and truthfully reports rollback failure", async () => {
    const exercise = async (operation: "move" | "restore", rollbackFails: boolean): Promise<void> => {
      const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-media-fault-"));
      let unlinkCalls = 0;
      let faultArmed = false;
      const adapter = await LocalProductMediaStorageAdapter.create(physicalRoot, processor, {
        link: fsLink,
        unlink: async (path) => {
          if (!faultArmed) return unlink(path);
          unlinkCalls += 1;
          if (unlinkCalls === 1 || (rollbackFails && unlinkCalls === 2)) throw Object.assign(new Error("injected"), { code: "EIO" });
          await unlink(path);
        },
      });
      try {
        const root = rootKey();
        const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
        const trashKey = ProductMediaTrashKey.create(root, `fault-${operation}`);
        const staged = await adapter.stage({ stagingKey: ProductMediaStagingKey.create(root, `setup-${operation}`), image: await normalized() });
        if (staged.type !== "Staged") return;
        await adapter.publishNew({ stagedObject: staged.object, finalKey });
        if (operation === "restore") {
          await adapter.moveToTrash({ finalKey, trashKey });
        }
        faultArmed = true;
        const action = operation === "move"
          ? adapter.moveToTrash({ finalKey, trashKey })
          : adapter.restoreFromTrash({ finalKey, trashKey });
        if (rollbackFails) {
          await assert.rejects(action, (error: unknown) => {
            assert.ok(error instanceof ProductMediaStoragePartialOperationError);
            assert.equal(error.operation, operation === "move" ? "move-to-trash" : "restore-from-trash");
            assert.equal(error.reconciliationRequired, true);
            assert.equal(error.message.includes(physicalRoot), false);
            return true;
          });
        } else {
          await assert.rejects(action, ProductMediaStorageInfrastructureError);
          const ownedDestination = operation === "move" ? trashKey : finalKey;
          await assert.rejects(readFile(join(physicalRoot, ...ownedDestination.value.split("/"))), { code: "ENOENT" });
        }
      } finally {
        await rm(physicalRoot, { recursive: true, force: true });
      }
    };
    await exercise("move", false);
    await exercise("restore", false);
    await exercise("move", true);
    await exercise("restore", true);
  });

  it("cleans an owned final after inspection failure and reports cleanup ambiguity truthfully", async () => {
    const exercise = async (cleanupFails: boolean): Promise<void> => {
      const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-media-publish-inspect-"));
      let failInspection = false;
      const controlledProcessor: ProductImageProcessor = {
        inspect: async (input) => {
          if (failInspection) throw new Error("injected inspection failure");
          return processor.inspect(input);
        },
        normalize: (input, options) => processor.normalize(input, options),
      };
      const adapter = await LocalProductMediaStorageAdapter.create(physicalRoot, controlledProcessor, {
        link: fsLink,
        unlink: async (path) => {
          if (cleanupFails && path.endsWith("main.webp")) throw Object.assign(new Error("injected cleanup failure"), { code: "EIO" });
          await unlink(path);
        },
      });
      try {
        const root = rootKey();
        const stagingKey = ProductMediaStagingKey.create(root, cleanupFails ? "inspect-partial" : "inspect-rollback");
        const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
        const staged = await adapter.stage({ stagingKey, image: await normalized() });
        if (staged.type !== "Staged") return;
        failInspection = true;
        const publication = adapter.publishNew({ stagedObject: staged.object, finalKey });
        if (cleanupFails) {
          await assert.rejects(publication, (error: unknown) => {
            assert.ok(error instanceof ProductMediaStoragePartialOperationError);
            assert.equal(error.operation, "publish-new");
            assert.equal(error.reconciliationRequired, true);
            assert.equal(error.message.includes(physicalRoot), false);
            return true;
          });
          assert.ok((await readFile(join(physicalRoot, ...finalKey.value.split("/")))).byteLength > 0);
        } else {
          await assert.rejects(publication, ProductMediaStorageInfrastructureError);
          await assert.rejects(readFile(join(physicalRoot, ...finalKey.value.split("/"))), { code: "ENOENT" });
        }
        assert.ok((await readFile(join(physicalRoot, ...stagingKey.value.split("/")))).byteLength > 0);
      } finally {
        await rm(physicalRoot, { recursive: true, force: true });
      }
    };
    await exercise(false);
    await exercise(true);
  });

  it("rolls back a verified final after staging-unlink failure or reports publish ambiguity", async () => {
    const exercise = async (finalRollbackFails: boolean): Promise<void> => {
      const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-media-publish-staging-"));
      let armed = false;
      const adapter = await LocalProductMediaStorageAdapter.create(physicalRoot, processor, {
        link: fsLink,
        unlink: async (path) => {
          if (armed && (path.includes("_staging") || (finalRollbackFails && path.endsWith("main.webp")))) {
            throw Object.assign(new Error("injected unlink failure"), { code: "EIO" });
          }
          await unlink(path);
        },
      });
      try {
        const root = rootKey();
        const stagingKey = ProductMediaStagingKey.create(root, finalRollbackFails ? "staging-partial" : "staging-rollback");
        const unrelatedKey = ProductMediaStagingKey.create(root, "staging-unrelated");
        const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
        const image = await normalized();
        const staged = await adapter.stage({ stagingKey, image });
        await adapter.stage({ stagingKey: unrelatedKey, image });
        if (staged.type !== "Staged") return;
        armed = true;
        const publication = adapter.publishNew({ stagedObject: staged.object, finalKey });
        if (finalRollbackFails) {
          await assert.rejects(publication, (error: unknown) => error instanceof ProductMediaStoragePartialOperationError && error.operation === "publish-new");
          assert.ok((await readFile(join(physicalRoot, ...finalKey.value.split("/")))).byteLength > 0);
        } else {
          await assert.rejects(publication, ProductMediaStorageInfrastructureError);
          await assert.rejects(readFile(join(physicalRoot, ...finalKey.value.split("/"))), { code: "ENOENT" });
        }
        assert.ok((await readFile(join(physicalRoot, ...stagingKey.value.split("/")))).byteLength > 0);
        assert.ok((await readFile(join(physicalRoot, ...unrelatedKey.value.split("/")))).byteLength > 0);
      } finally {
        await rm(physicalRoot, { recursive: true, force: true });
      }
    };
    await exercise(false);
    await exercise(true);
  });

  it("restores the old final after thrown publication failure and rethrows the original error", async () => {
    const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-media-replacement-infrastructure-"));
    let failInspection = false;
    const controlledProcessor: ProductImageProcessor = {
      inspect: async (input) => {
        if (failInspection) throw new Error("injected inspection failure");
        return processor.inspect(input);
      },
      normalize: (input, options) => processor.normalize(input, options),
    };
    const adapter = await LocalProductMediaStorageAdapter.create(physicalRoot, controlledProcessor);
    try {
      const root = rootKey();
      const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
      const original = await adapter.stage({ stagingKey: ProductMediaStagingKey.create(root, "replacement-infrastructure-original"), image: await normalized() });
      if (original.type !== "Staged") return;
      await adapter.publishNew({ stagedObject: original.object, finalKey });
      const originalBytes = await readFile(join(physicalRoot, ...finalKey.value.split("/")));
      const replacementKey = ProductMediaStagingKey.create(root, "replacement-infrastructure-new");
      const replacement = await adapter.stage({ stagingKey: replacementKey, image: await normalized() });
      if (replacement.type !== "Staged") return;
      const trashKey = ProductMediaTrashKey.create(root, "replacement-infrastructure-trash");
      failInspection = true;
      await assert.rejects(adapter.publishReplacement({ stagedObject: replacement.object, finalKey, trashKey }), (error: unknown) => {
        assert.ok(error instanceof ProductMediaStorageInfrastructureError);
        assert.equal(error.operation, "inspect");
        return true;
      });
      assert.deepEqual(await readFile(join(physicalRoot, ...finalKey.value.split("/"))), originalBytes);
      await assert.rejects(readFile(join(physicalRoot, ...trashKey.value.split("/"))), { code: "ENOENT" });
      assert.ok((await readFile(join(physicalRoot, ...replacementKey.value.split("/")))).byteLength > 0);
    } finally {
      await rm(physicalRoot, { recursive: true, force: true });
    }
  });

  it("reports replacement restoration failure and never blind-restores after publication ambiguity", async () => {
    const exercise = async (publicationCleanupFails: boolean): Promise<void> => {
      const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-media-replacement-partial-"));
      let failInspection = false;
      let armed = false;
      let linkCalls = 0;
      const controlledProcessor: ProductImageProcessor = {
        inspect: async (input) => {
          if (failInspection) throw new Error("injected inspection failure");
          return processor.inspect(input);
        },
        normalize: (input, options) => processor.normalize(input, options),
      };
      const adapter = await LocalProductMediaStorageAdapter.create(physicalRoot, controlledProcessor, {
        link: async (existingPath, newPath) => {
          if (armed) {
            linkCalls += 1;
            if (!publicationCleanupFails && linkCalls === 3) throw Object.assign(new Error("injected restore failure"), { code: "EIO" });
          }
          await fsLink(existingPath, newPath);
        },
        unlink: async (path) => {
          if (armed && publicationCleanupFails && linkCalls >= 2 && path.endsWith("main.webp")) {
            throw Object.assign(new Error("injected publication cleanup failure"), { code: "EIO" });
          }
          await unlink(path);
        },
      });
      try {
        const root = rootKey();
        const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
        const original = await adapter.stage({ stagingKey: ProductMediaStagingKey.create(root, `partial-original-${publicationCleanupFails}`), image: await normalized() });
        if (original.type !== "Staged") return;
        await adapter.publishNew({ stagedObject: original.object, finalKey });
        const replacementKey = ProductMediaStagingKey.create(root, `partial-new-${publicationCleanupFails}`);
        const unrelatedKey = ProductMediaStagingKey.create(root, `partial-unrelated-${publicationCleanupFails}`);
        const replacement = await adapter.stage({ stagingKey: replacementKey, image: await normalized() });
        await adapter.stage({ stagingKey: unrelatedKey, image: await normalized() });
        if (replacement.type !== "Staged") return;
        const trashKey = ProductMediaTrashKey.create(root, `partial-trash-${publicationCleanupFails}`);
        armed = true;
        failInspection = true;
        await assert.rejects(adapter.publishReplacement({ stagedObject: replacement.object, finalKey, trashKey }), (error: unknown) => {
          assert.ok(error instanceof ProductMediaStoragePartialOperationError);
          assert.equal(error.operation, publicationCleanupFails ? "publish-new" : "publish-replacement");
          return true;
        });
        assert.equal(linkCalls, publicationCleanupFails ? 2 : 3);
        assert.ok((await readFile(join(physicalRoot, ...trashKey.value.split("/")))).byteLength > 0);
        assert.ok((await readFile(join(physicalRoot, ...replacementKey.value.split("/")))).byteLength > 0);
        assert.ok((await readFile(join(physicalRoot, ...unrelatedKey.value.split("/")))).byteLength > 0);
        if (!publicationCleanupFails) await assert.rejects(readFile(join(physicalRoot, ...finalKey.value.split("/"))), { code: "ENOENT" });
      } finally {
        await rm(physicalRoot, { recursive: true, force: true });
      }
    };
    await exercise(false);
    await exercise(true);
  });

  it("rejects parent and leaf symlink/junction escape where platform permissions allow", async (context) => withAdapter(async (physicalRoot, adapter) => {
    const outside = await mkdtemp(join(tmpdir(), "qsc-media-outside-"));
    try {
      const root = rootKey();
      const finalKey = ProductMediaFinalKey.fromSlot(root, ProductMediaSlots.main());
      const parent = join(physicalRoot, "workspaces");
      try {
        await symlink(outside, parent, process.platform === "win32" ? "junction" : "dir");
      } catch (error) {
        if (["EPERM", "EACCES"].includes(errorCode(error) ?? "")) {
          context.skip("Platform does not permit test-owned link creation.");
          return;
        }
        throw error;
      }
      assert.deepEqual(await adapter.exists(finalKey), { type: "Failed", code: "UnsafeKey" });
      await unlink(parent);

      const stagingKey = ProductMediaStagingKey.create(root, "leaf-setup");
      const staged = await adapter.stage({ stagingKey, image: await normalized() });
      if (staged.type === "Staged") await adapter.discardTemporary({ stagingKey });
      const finalPath = join(physicalRoot, ...finalKey.value.split("/"));
      await writeFile(join(outside, "outside.webp"), "outside");
      let leafCreated = true;
      await symlink(join(outside, "outside.webp"), finalPath, "file").catch(async (error) => {
        if (["EPERM", "EACCES"].includes(errorCode(error) ?? "")) {
          leafCreated = false;
          context.skip("Platform does not permit leaf-link creation.");
        }
        else throw error;
      });
      if (!leafCreated) return;
      assert.deepEqual(await adapter.inspect(finalKey), { type: "Failed", code: "UnsafeKey" });
      assert.deepEqual(await adapter.exists(finalKey), { type: "Failed", code: "UnsafeKey" });
    } finally {
      await rm(outside, { recursive: true, force: true });
    }
  }));

  it("does not hide unexpected provider failure as missing or UnsafeKey", async () => {
    const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-media-failure-"));
    const adapter = await LocalProductMediaStorageAdapter.create(physicalRoot, processor);
    await rm(physicalRoot, { recursive: true, force: true });
    const finalKey = ProductMediaFinalKey.fromSlot(rootKey(), ProductMediaSlots.main());
    await assert.rejects(adapter.exists(finalKey), (error: unknown) => {
      assert.ok(error instanceof ProductMediaStorageInfrastructureError);
      assert.equal(error.message.includes(physicalRoot), false);
      return true;
    });
    const stagingKey = ProductMediaStagingKey.create(rootKey(), "probe-operation");
    await assert.rejects(adapter.temporaryExists(stagingKey), (error: unknown) => {
      assert.ok(error instanceof ProductMediaStorageInfrastructureError);
      assert.equal(error.message.includes(physicalRoot), false);
      return true;
    });
  });
});

const errorCode = (error: unknown): string | undefined => (error as NodeJS.ErrnoException).code;
