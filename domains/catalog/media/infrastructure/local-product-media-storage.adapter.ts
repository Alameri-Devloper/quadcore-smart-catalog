import { createHash } from "node:crypto";
import { lstat, link, mkdir, open, readFile, realpath, stat, unlink } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import type { ProductMediaFinalKey } from "../domain/product-media-keys";
import type { ProductImageProcessor } from "../ports/product-image-processor";
import {
  ProductMediaStorageInfrastructureError,
  ProductMediaStoragePartialOperationError,
  type DiscardTemporaryProductMediaInput,
  type DiscardTemporaryProductMediaResult,
  type MoveProductMediaToTrashInput,
  type MoveProductMediaToTrashResult,
  type ProductMediaExistsResult,
  type ProductMediaStoragePort,
  type ProductMediaStoredObject,
  type ProductMediaStoredObjectInspectionResult,
  type PublishNewProductMediaInput,
  type PublishNewProductMediaResult,
  type PublishReplacementProductMediaInput,
  type PublishReplacementProductMediaResult,
  type RestoreProductMediaFromTrashInput,
  type RestoreProductMediaFromTrashResult,
  type StageProductMediaInput,
  type StageProductMediaResult,
  type StagedProductMediaObject,
} from "../ports/product-media-storage.port";

class UnsafeMediaPathError extends Error {}

export interface ProductMediaFileSystemOperations {
  readonly link: (existingPath: string, newPath: string) => Promise<void>;
  readonly unlink: (path: string) => Promise<void>;
}

const defaultFileSystemOperations: ProductMediaFileSystemOperations = { link, unlink };

const errorCode = (error: unknown): string | undefined => (error as NodeJS.ErrnoException)?.code;
const sameRoot = (...keys: readonly { readonly root: { readonly value: string } }[]): boolean =>
  keys.every((key) => key.root.value === keys[0]?.root.value);

export class LocalProductMediaStorageAdapter implements ProductMediaStoragePort {
  private constructor(
    private readonly root: string,
    private readonly processor: ProductImageProcessor,
    private readonly fileSystem: ProductMediaFileSystemOperations,
  ) {}

  static async create(root: string | undefined, processor: ProductImageProcessor, fileSystem: ProductMediaFileSystemOperations = defaultFileSystemOperations): Promise<LocalProductMediaStorageAdapter> {
    if (!root || !isAbsolute(root) || /^[a-z]:[^\\/]/i.test(root)) {
      throw new Error("QSC_MEDIA_ROOT must be a valid absolute directory.");
    }
    const info = await stat(root).catch(() => undefined);
    if (!info?.isDirectory()) throw new Error("QSC_MEDIA_ROOT must identify an existing directory.");
    return new LocalProductMediaStorageAdapter(await realpath(root), processor, fileSystem);
  }

  static createFromEnvironment(processor: ProductImageProcessor): Promise<LocalProductMediaStorageAdapter> {
    return this.create(process.env.QSC_MEDIA_ROOT, processor);
  }

  private inside(candidate: string): boolean {
    const fromRoot = relative(this.root, candidate);
    return fromRoot === "" || (!fromRoot.startsWith(`..${sep}`) && fromRoot !== ".." && !isAbsolute(fromRoot));
  }

  private infrastructure(operation: string): never {
    throw new ProductMediaStorageInfrastructureError(operation);
  }

  private async safePath(key: { readonly value: string }, createParent: boolean): Promise<string> {
    let rootInfo;
    try {
      rootInfo = await lstat(this.root);
    } catch {
      throw new ProductMediaStorageInfrastructureError("validate-root");
    }
    if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) throw new UnsafeMediaPathError();
    const target = resolve(this.root, ...key.value.split("/"));
    if (!this.inside(target)) throw new UnsafeMediaPathError();

    const segments = key.value.split("/").slice(0, -1);
    let current = this.root;
    for (const segment of segments) {
      current = resolve(current, segment);
      let info = await lstat(current).catch((error: unknown) => {
        if (errorCode(error) === "ENOENT") return undefined;
        throw error;
      });
      if (!info && createParent) {
        try {
          await mkdir(current);
        } catch (error) {
          if (errorCode(error) !== "EEXIST") throw error;
        }
        info = await lstat(current);
      }
      if (!info) break;
      if (!info.isDirectory() || info.isSymbolicLink()) throw new UnsafeMediaPathError();
      const physical = await realpath(current);
      if (!this.inside(physical)) throw new UnsafeMediaPathError();
    }

    const leaf = await lstat(target).catch((error: unknown) => {
      if (errorCode(error) === "ENOENT") return undefined;
      throw error;
    });
    if (leaf) {
      if (!leaf.isFile() || leaf.isSymbolicLink()) throw new UnsafeMediaPathError();
      const physical = await realpath(target);
      if (!this.inside(physical)) throw new UnsafeMediaPathError();
    }
    return target;
  }

  private async inspectFile(key: ProductMediaFinalKey): Promise<ProductMediaStoredObjectInspectionResult> {
    try {
      const path = await this.safePath(key, false);
      const bytes = new Uint8Array(await readFile(path));
      const inspection = await this.processor.inspect(bytes);
      if (inspection.type === "Rejected" || inspection.inspection.format !== "webp") {
        return { type: "Failed", code: "ChecksumMismatch" };
      }
      return {
        type: "Found",
        object: Object.freeze({
          key,
          sha256: createHash("sha256").update(bytes).digest("hex"),
          byteLength: bytes.byteLength,
          mediaType: "image/webp",
          width: inspection.inspection.width,
          height: inspection.inspection.height,
        }),
      };
    } catch (error) {
      if (error instanceof UnsafeMediaPathError) return { type: "Failed", code: "UnsafeKey" };
      if (errorCode(error) === "ENOENT") return { type: "Failed", code: "FinalObjectMissing" };
      return this.infrastructure("inspect");
    }
  }

  async stage(input: StageProductMediaInput): Promise<StageProductMediaResult> {
    let path: string | undefined;
    let owned = false;
    try {
      path = await this.safePath(input.stagingKey, true);
      const handle = await open(path, "wx");
      owned = true;
      try {
        await handle.writeFile(input.image.bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      const storedBytes = new Uint8Array(await readFile(path));
      const hash = createHash("sha256").update(storedBytes).digest("hex");
      if (storedBytes.byteLength !== input.image.bytes.byteLength || hash !== input.image.sha256) {
        await unlink(path);
        return { type: "Failed", code: "ChecksumMismatch" };
      }
      const object: StagedProductMediaObject = Object.freeze({
        key: input.stagingKey,
        sha256: hash,
        byteLength: storedBytes.byteLength,
        mediaType: "image/webp",
        width: input.image.width,
        height: input.image.height,
      });
      return { type: "Staged", object };
    } catch (error) {
      if (error instanceof UnsafeMediaPathError) return { type: "Failed", code: "UnsafeKey" };
      if (errorCode(error) === "EEXIST") return { type: "Failed", code: "TargetConflict" };
      if (owned && path) await unlink(path).catch(() => undefined);
      return this.infrastructure("stage");
    }
  }

  private integrityMatches(staged: StagedProductMediaObject, final: ProductMediaStoredObject): boolean {
    return staged.sha256 === final.sha256 &&
      staged.byteLength === final.byteLength &&
      staged.mediaType === final.mediaType &&
      staged.width === final.width &&
      staged.height === final.height;
  }

  async publishNew(input: PublishNewProductMediaInput): Promise<PublishNewProductMediaResult> {
    if (!sameRoot(input.stagedObject.key, input.finalKey)) return { type: "Failed", code: "UnsafeKey" };
    let finalPath: string | undefined;
    let ownedFinal = false;
    try {
      const stagingPath = await this.safePath(input.stagedObject.key, false);
      finalPath = await this.safePath(input.finalKey, true);
      await this.fileSystem.link(stagingPath, finalPath);
      ownedFinal = true;
      const inspected = await this.inspectFile(input.finalKey);
      if (inspected.type !== "Found" || !this.integrityMatches(input.stagedObject, inspected.object)) {
        try {
          await this.fileSystem.unlink(finalPath);
          ownedFinal = false;
        } catch {
          throw new ProductMediaStoragePartialOperationError("publish-new");
        }
        return { type: "Failed", code: "ChecksumMismatch" };
      }
      try {
        await this.fileSystem.unlink(stagingPath);
      } catch {
        try {
          await this.fileSystem.unlink(finalPath);
          ownedFinal = false;
        } catch {
          throw new ProductMediaStoragePartialOperationError("publish-new");
        }
        return this.infrastructure("publish-new");
      }
      ownedFinal = false;
      return { type: "Published", object: inspected.object };
    } catch (error) {
      if (error instanceof ProductMediaStoragePartialOperationError) throw error;
      if (ownedFinal && finalPath) {
        try {
          await this.fileSystem.unlink(finalPath);
          ownedFinal = false;
        } catch {
          throw new ProductMediaStoragePartialOperationError("publish-new");
        }
      }
      if (error instanceof UnsafeMediaPathError) return { type: "Failed", code: "UnsafeKey" };
      if (errorCode(error) === "ENOENT") return { type: "Failed", code: "TemporaryObjectMissing" };
      if (errorCode(error) === "EEXIST") return { type: "Failed", code: "TargetConflict" };
      if (error instanceof ProductMediaStorageInfrastructureError) throw error;
      return this.infrastructure("publish-new");
    }
  }

  async moveToTrash(input: MoveProductMediaToTrashInput): Promise<MoveProductMediaToTrashResult> {
    if (!sameRoot(input.finalKey, input.trashKey)) return { type: "Failed", code: "UnsafeKey" };
    let trash: string | undefined;
    let ownedTrash = false;
    try {
      const final = await this.safePath(input.finalKey, false);
      trash = await this.safePath(input.trashKey, true);
      await this.fileSystem.link(final, trash);
      ownedTrash = true;
      await this.fileSystem.unlink(final);
      return { type: "MovedToTrash" };
    } catch (error) {
      if (ownedTrash && trash) {
        try {
          await this.fileSystem.unlink(trash);
        } catch {
          throw new ProductMediaStoragePartialOperationError("move-to-trash");
        }
      }
      if (error instanceof UnsafeMediaPathError) return { type: "Failed", code: "UnsafeKey" };
      if (errorCode(error) === "ENOENT") return { type: "Failed", code: "FinalObjectMissing" };
      if (errorCode(error) === "EEXIST") return { type: "Failed", code: "TrashConflict" };
      return this.infrastructure("move-to-trash");
    }
  }

  async restoreFromTrash(input: RestoreProductMediaFromTrashInput): Promise<RestoreProductMediaFromTrashResult> {
    if (!sameRoot(input.finalKey, input.trashKey)) return { type: "Failed", code: "UnsafeKey" };
    let final: string | undefined;
    let ownedFinal = false;
    try {
      final = await this.safePath(input.finalKey, true);
      const trash = await this.safePath(input.trashKey, false);
      await this.fileSystem.link(trash, final);
      ownedFinal = true;
      await this.fileSystem.unlink(trash);
      return { type: "Restored" };
    } catch (error) {
      if (ownedFinal && final) {
        try {
          await this.fileSystem.unlink(final);
        } catch {
          throw new ProductMediaStoragePartialOperationError("restore-from-trash");
        }
      }
      if (error instanceof UnsafeMediaPathError) return { type: "Failed", code: "UnsafeKey" };
      if (errorCode(error) === "ENOENT") return { type: "Failed", code: "TemporaryObjectMissing" };
      if (errorCode(error) === "EEXIST") return { type: "Failed", code: "TargetConflict" };
      return this.infrastructure("restore-from-trash");
    }
  }

  async publishReplacement(input: PublishReplacementProductMediaInput): Promise<PublishReplacementProductMediaResult> {
    if (!sameRoot(input.stagedObject.key, input.finalKey, input.trashKey)) return { type: "Failed", code: "UnsafeKey" };
    const moved = await this.moveToTrash(input);
    if (moved.type === "Failed") return moved;
    let published: PublishNewProductMediaResult;
    try {
      published = await this.publishNew(input);
    } catch (error) {
      if (error instanceof ProductMediaStoragePartialOperationError) throw error;
      try {
        const restored = await this.restoreFromTrash(input);
        if (restored.type !== "Restored") {
          throw new ProductMediaStoragePartialOperationError("publish-replacement");
        }
      } catch (restoreError) {
        if (restoreError instanceof ProductMediaStoragePartialOperationError && restoreError.operation === "restore-from-trash") {
          throw restoreError;
        }
        throw new ProductMediaStoragePartialOperationError("publish-replacement");
      }
      throw error;
    }
    if (published.type === "Published") return { type: "Replaced", object: published.object };
    try {
      const restored = await this.restoreFromTrash(input);
      return restored.type === "Restored" ? published : { type: "Failed", code: "ReplacementRestorationFailed" };
    } catch (error) {
      if (error instanceof ProductMediaStoragePartialOperationError) throw error;
      throw new ProductMediaStoragePartialOperationError("publish-replacement");
    }
  }

  async discardTemporary(input: DiscardTemporaryProductMediaInput): Promise<DiscardTemporaryProductMediaResult> {
    try {
      await unlink(await this.safePath(input.stagingKey, false));
      return { type: "Discarded" };
    } catch (error) {
      if (error instanceof UnsafeMediaPathError) return { type: "Failed", code: "UnsafeKey" };
      if (errorCode(error) === "ENOENT") return { type: "Failed", code: "TemporaryObjectMissing" };
      return this.infrastructure("discard-staging");
    }
  }

  inspect(key: ProductMediaFinalKey): Promise<ProductMediaStoredObjectInspectionResult> {
    return this.inspectFile(key);
  }

  async exists(key: ProductMediaFinalKey): Promise<ProductMediaExistsResult> {
    try {
      await stat(await this.safePath(key, false));
      return { type: "Exists", exists: true };
    } catch (error) {
      if (error instanceof UnsafeMediaPathError) return { type: "Failed", code: "UnsafeKey" };
      if (errorCode(error) === "ENOENT") return { type: "Exists", exists: false };
      return this.infrastructure("exists");
    }
  }
}
