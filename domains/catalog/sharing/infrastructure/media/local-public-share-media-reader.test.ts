import assert from "node:assert/strict";
import { it } from "node:test";
import { createHash } from "node:crypto";
import { mkdir, symlink, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { publicShareMediaFixture } from "../../mock/public-share-media.fixture";
import { LocalPublicShareMediaReader } from "./local-public-share-media-reader";
it("reads a real contained WebP and exposes bytes only", async () => {
  const f = await publicShareMediaFixture(), result = await f.reader.read(f.input);
  assert.equal(result.type, "Found"); if (result.type === "Found") assert.deepEqual(result.bytes, new Uint8Array(f.bytes));
});
it("rejects foreign Product/Workspace/root and noncanonical paths before file delivery", async () => {
  const f = await publicShareMediaFixture();
  for (const patch of [{ productId: "foreign" }, { workspaceId: "foreign" }, { storageKey: "../outside.webp" }, { storageKey: f.input.storageRootKey + "/../../outside.webp" }])
    assert.equal((await f.reader.read({ ...f.input, ...patch })).type, "Missing");
});
it("missing/corrupt/checksum mismatch are missing while configuration failure is unavailable", async () => {
  const f = await publicShareMediaFixture();
  assert.equal((await f.reader.read({ ...f.input, expectedSha256: "0".repeat(64) })).type, "Missing");
  assert.equal((await f.reader.read({ ...f.input, storageKey: f.input.storageRootKey + "/gallery-01.webp" })).type, "Missing");
  await writeFile(f.target, Buffer.from("not a valid webp"));
  assert.equal((await f.reader.read(f.input)).type, "Missing");
  assert.equal((await new LocalPublicShareMediaReader().read(f.input)).type, "Unavailable");
  assert.equal((await new LocalPublicShareMediaReader(join(f.directory, "absent-root")).read(f.input)).type, "Unavailable");
});
it("enforces the exact 8 MiB boundary with a bounded read", async () => {
  const f = await publicShareMediaFixture(), maximum = 8 * 1024 * 1024;
  const atLimit = Buffer.concat([f.bytes, Buffer.alloc(maximum - f.bytes.length)]);
  await writeFile(f.target, atLimit);
  assert.equal((await f.reader.read({ ...f.input, expectedSha256: createHash("sha256").update(atLimit).digest("hex") })).type, "Found");
  await writeFile(f.target, Buffer.concat([atLimit, Buffer.from([0])]));
  assert.equal((await f.reader.read(f.input)).type, "Missing");
  assert.equal((await f.reader.read({ ...f.input, maximumBytes: maximum + 1 })).type, "Missing");
});
it("rejects symbolic file and ancestor escapes using real filesystem containment", async t => {
  const f = await publicShareMediaFixture(), other = join(f.directory, "other"); await mkdir(other);
  await writeFile(join(other, "main.webp"), f.bytes);
  const linkedRoot = join(f.directory, "linked-store");
  try { await symlink(f.root, linkedRoot, "junction"); }
  catch (error) { if (error && typeof error === "object" && "code" in error && error.code === "EPERM") { t.skip("Host does not permit creating a synthetic link"); return; } throw error; }
  assert.equal((await new LocalPublicShareMediaReader(linkedRoot).read(f.input)).type, "Unavailable");
  const escaped = join(other, ...f.input.storageKey.split("/")); await mkdir(join(escaped, ".."), { recursive: true });
  await writeFile(escaped, f.bytes);
  const outsideRoot = join(f.directory, "escaping-store"); await mkdir(outsideRoot);
  await symlink(join(other, "workspaces"), join(outsideRoot, "workspaces"), "junction");
  assert.equal((await new LocalPublicShareMediaReader(outsideRoot).read(f.input)).type, "Missing");
});