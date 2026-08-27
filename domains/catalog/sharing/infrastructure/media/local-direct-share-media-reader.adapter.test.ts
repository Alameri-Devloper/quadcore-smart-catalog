import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, describe, it } from "node:test";
import { DepartmentStorageSegment, ProductMediaFinalKey } from "../../../media/domain/product-media-keys";
import { ProductMediaRoot } from "../../../media/domain/product-media-root";
import { ProductMediaSlots } from "../../../media/domain/product-media-slot";
import { ProductId, WorkspaceId } from "../../../types/product-identity.value-object";
import { LocalDirectShareMediaReaderAdapter } from "./local-direct-share-media-reader.adapter";

const roots: string[] = [];
afterEach(async () => { while (roots.length) await rm(roots.pop()!, { recursive: true, force: true }); });

const fixture = async () => {
  const physicalRoot = await mkdtemp(join(tmpdir(), "qsc-direct-share-")); roots.push(physicalRoot);
  const workspaceId = WorkspaceId.create("workspace-a"), productId = ProductId.create("product-a");
  const root = await ProductMediaRoot.createNew({ workspaceId, productId, departmentSegment: DepartmentStorageSegment.unclassified(), productCode: "P-1", productName: "Product", createdAt: new Date() });
  const key = ProductMediaFinalKey.fromSlot(root.storageRootKey, ProductMediaSlots.main());
  const bytes = Uint8Array.from([82, 73, 70, 70, 4, 0, 0, 0, 87, 69, 66, 80]);
  const target = join(physicalRoot, ...key.value.split("/")); await mkdir(join(target, ".."), { recursive: true }); await writeFile(target, bytes);
  return { physicalRoot, workspaceId: workspaceId.value, productId: productId.value, root: root.storageRootKey.value, key: key.value, bytes, checksum: createHash("sha256").update(bytes).digest("hex") };
};

describe("LocalDirectShareMediaReaderAdapter", () => {
  it("reads a canonical identity-bound WebP within the configured limit", async () => {
    const value = await fixture();
    const result = await new LocalDirectShareMediaReaderAdapter(value.physicalRoot).read({ workspaceId: value.workspaceId, productId: value.productId, storageRootKey: value.root, storageKey: value.key, expectedSha256: value.checksum, maximumBytes: value.bytes.byteLength });
    assert.equal(result.type, "Found"); if (result.type === "Found") assert.deepEqual(result.bytes, value.bytes);
  });

  it("fails closed for foreign identity, unsafe key, checksum mismatch, size overflow, and missing root", async () => {
    const value = await fixture(); const reader = new LocalDirectShareMediaReaderAdapter(value.physicalRoot);
    const base = { workspaceId: value.workspaceId, productId: value.productId, storageRootKey: value.root, storageKey: value.key, expectedSha256: value.checksum, maximumBytes: value.bytes.byteLength };
    for (const changed of [
      { ...base, workspaceId: "workspace-b" },
      { ...base, storageKey: `${value.root}/../../outside.webp` },
      { ...base, expectedSha256: "b".repeat(64) },
      { ...base, maximumBytes: value.bytes.byteLength - 1 },
    ]) assert.deepEqual(await reader.read(changed), { type: "Unavailable" });
    assert.deepEqual(await new LocalDirectShareMediaReaderAdapter(undefined).read(base), { type: "Unavailable" });
  });
});
