import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { ProductId, WorkspaceId } from "../../../types/product-identity.value-object";
import { ProductMediaFinalKey, ProductMediaStorageRootKey } from "../../../media/domain/product-media-keys";
import { ProductMediaRoot } from "../../../media/domain/product-media-root";
import type { PublicShareMediaReaderPort, PublicShareMediaReadResult } from "../../ports/public-share-resolution.port";
const contained = (root: string, target: string) => { const value = relative(root, target); return value !== ".." && !value.startsWith(".." + sep) && !isAbsolute(value); };
const code = (error: unknown) => error && typeof error === "object" && "code" in error ? error.code : null;

/** Bounded immutable bytes; no redirects/provider keys and no broad infrastructure-to-404 collapse. */
export class LocalPublicShareMediaReader implements PublicShareMediaReaderPort {
  constructor(private readonly configuredRoot?: string) {}
  async read(input: Parameters<PublicShareMediaReaderPort["read"]>[0]): Promise<PublicShareMediaReadResult> {
    if (!this.configuredRoot) return { type: "Unavailable" };
    if (!Number.isSafeInteger(input.maximumBytes) || input.maximumBytes < 12 || input.maximumBytes > 8 * 1024 * 1024
      || !/^[a-f0-9]{64}$/.test(input.expectedSha256)) return { type: "Missing" };
    let key: string;
    try {
      const rootKey = ProductMediaStorageRootKey.rehydrate(input.storageRootKey);
      await ProductMediaRoot.rehydrate({ workspaceId: WorkspaceId.create(input.workspaceId), productId: ProductId.create(input.productId), storageRootKey: rootKey, createdAt: new Date(0) });
      key = ProductMediaFinalKey.rehydrate(rootKey, input.storageKey).value;
    } catch { return { type: "Missing" }; }
    let physicalRoot: string;
    try {
      const configured = resolve(this.configuredRoot), info = await lstat(configured);
      if (!info.isDirectory() || info.isSymbolicLink()) return { type: "Unavailable" };
      physicalRoot = await realpath(configured);
    } catch { return { type: "Unavailable" }; }
    try {
      const target = resolve(physicalRoot, ...key.split("/"));
      if (!contained(physicalRoot, target)) return { type: "Missing" };
      const info = await lstat(target, { bigint: true });
      if (!info.isFile() || info.isSymbolicLink() || info.size > BigInt(input.maximumBytes)) return { type: "Missing" };
      const physicalTarget = await realpath(target);
      if (!contained(physicalRoot, physicalTarget)) return { type: "Missing" };
      const handle = await open(physicalTarget, "r");
      try {
        const opened = await handle.stat({ bigint: true });
        if (!opened.isFile() || opened.dev !== info.dev || opened.ino !== info.ino || opened.size > BigInt(input.maximumBytes)
          || !contained(physicalRoot, await realpath(target))) return { type: "Missing" };
        const buffer = Buffer.alloc(input.maximumBytes + 1); let used = 0;
        while (used < buffer.length) { const result = await handle.read(buffer, used, buffer.length - used, used); if (!result.bytesRead) break; used += result.bytesRead; }
        if (used > input.maximumBytes || used < 12) return { type: "Missing" };
        const bytes = buffer.subarray(0, used);
        if (bytes.toString("ascii", 0, 4) !== "RIFF" || bytes.toString("ascii", 8, 12) !== "WEBP"
          || createHash("sha256").update(bytes).digest("hex") !== input.expectedSha256) return { type: "Missing" };
        return { type: "Found", bytes: new Uint8Array(bytes) };
      } finally { await handle.close(); }
    } catch (error) { return { type: ["ENOENT", "ENOTDIR", "ELOOP"].includes(String(code(error))) ? "Missing" : "Unavailable" }; }
  }
}