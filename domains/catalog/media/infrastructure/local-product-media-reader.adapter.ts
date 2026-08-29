import { createHash } from "node:crypto";
import { lstat, open, realpath } from "node:fs/promises";
import { isAbsolute, relative, resolve, sep } from "node:path";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductMediaFinalKey, ProductMediaStorageRootKey } from "../domain/product-media-keys";
import { ProductMediaRoot } from "../domain/product-media-root";
import type { ProductMediaReaderPort, ProductMediaReadResult } from "../ports/product-media-reader.port";

export class LocalProductMediaReaderAdapter implements ProductMediaReaderPort {
  constructor(private readonly configuredRoot = process.env.QSC_MEDIA_ROOT) {}

  async read(input: Parameters<ProductMediaReaderPort["read"]>[0]): Promise<ProductMediaReadResult> {
    try {
      if (!this.configuredRoot || !isAbsolute(this.configuredRoot) || /^[a-z]:[^\\/]/iu.test(this.configuredRoot)) return { type: "Unavailable" };
      const physicalRoot = await realpath(this.configuredRoot);
      const rootInfo = await lstat(physicalRoot);
      if (!rootInfo.isDirectory() || rootInfo.isSymbolicLink()) return { type: "Unavailable" };
      const storageRootKey = ProductMediaStorageRootKey.rehydrate(input.storageRootKey);
      await ProductMediaRoot.rehydrate({ workspaceId: WorkspaceId.create(input.workspaceId), productId: ProductId.create(input.productId), storageRootKey, createdAt: new Date(0) });
      const key = ProductMediaFinalKey.rehydrate(storageRootKey, input.storageKey);
      const target = resolve(physicalRoot, ...key.value.split("/"));
      const fromRoot = relative(physicalRoot, target);
      if (fromRoot === ".." || fromRoot.startsWith(`..${sep}`) || isAbsolute(fromRoot)) return { type: "Unavailable" };
      const info = await lstat(target);
      if (!info.isFile() || info.isSymbolicLink() || info.size > input.maximumBytes) return { type: "Unavailable" };
      const physicalTarget = await realpath(target);
      const physicalRelative = relative(physicalRoot, physicalTarget);
      if (physicalRelative === ".." || physicalRelative.startsWith(`..${sep}`) || isAbsolute(physicalRelative)) return { type: "Unavailable" };
      const handle = await open(physicalTarget, "r");
      try {
        const openedInfo = await handle.stat();
        if (!openedInfo.isFile() || openedInfo.size > input.maximumBytes) return { type: "Unavailable" };
        const bytes = new Uint8Array(await handle.readFile());
        if (bytes.byteLength > input.maximumBytes || bytes.byteLength < 12) return { type: "Unavailable" };
        const signature = String.fromCharCode(...bytes.subarray(0, 4)) === "RIFF" && String.fromCharCode(...bytes.subarray(8, 12)) === "WEBP";
        if (!signature || createHash("sha256").update(bytes).digest("hex") !== input.expectedSha256) return { type: "Unavailable" };
        return { type: "Found", bytes };
      } finally { await handle.close(); }
    } catch { return { type: "Unavailable" }; }
  }
}
