import { createHash } from "node:crypto";
import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import sharp from "sharp";
import { WorkspaceId, ProductId } from "../../types/product-identity.value-object";
import { ProductMediaPathPolicy } from "../../media/services/product-media-path-policy";
import { DepartmentStorageSegment } from "../../media/domain/product-media-keys";
import { LocalPublicShareMediaReader } from "../infrastructure/media/local-public-share-media-reader";

export const publicShareMediaFixture = async (workspaceId = "p6-test-workspace", productId = "p6-test-product") => {
  const base = join(process.cwd(), "artifacts/task-reviews/3.23-P6");
  await mkdir(base, { recursive: true });
  const directory = await mkdtemp(join(base, "media-fixture-"));
  const root = join(directory, "store");
  const rootKey = await ProductMediaPathPolicy.storageRoot({
    workspaceId: WorkspaceId.create(workspaceId), productId: ProductId.create(productId),
    departmentSegment: DepartmentStorageSegment.create("phones"), productName: "Synthetic",
  });
  const bytes = await sharp({ create: { width: 2, height: 2, channels: 3, background: { r: 20, g: 40, b: 60 } } }).webp().toBuffer();
  const storageKey = rootKey.value + "/main.webp", target = join(root, ...storageKey.split("/"));
  await mkdir(dirname(target), { recursive: true }); await writeFile(target, bytes);
  const input = { workspaceId, productId, storageRootKey: rootKey.value, storageKey,
    expectedSha256: createHash("sha256").update(bytes).digest("hex"), maximumBytes: 8 * 1024 * 1024 };
  return { directory, root, target, bytes, input, reader: new LocalPublicShareMediaReader(root) };
};