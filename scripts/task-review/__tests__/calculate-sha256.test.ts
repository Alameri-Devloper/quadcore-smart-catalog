import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { calculateSha256 } from "../calculate-sha256";
import { copySourceFile } from "../copy-source-file";

test("calculates stable SHA-256 and preserves exact source bytes", () => {
  assert.equal(calculateSha256("abc"), "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-copy-"));
  const bundle = join(repository, "bundle");
  writeFileSync(join(repository, "source.bin"), Buffer.from([0, 1, 2, 255]));
  const copied = copySourceFile(repository, bundle, "source.bin");
  assert.equal(copied.sourceSha256, copied.bundleSha256);
  assert.deepEqual(readFileSync(copied.destination), Buffer.from([0, 1, 2, 255]));
});

test("fails closed instead of rewriting source containing suspected secrets", () => {
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-secret-"));
  const bundle = join(repository, "bundle");
  const token = `ghp_${"Z".repeat(30)}`;
  writeFileSync(join(repository, "secret.ts"), `export const value = "${token}";`);
  assert.throws(() => copySourceFile(repository, bundle, "secret.ts"), /GITHUB_TOKEN.*secret\.ts/);
});

test("rejects a constructed credential URL while preserving exact non-text binary bytes", () => {
  const repository = mkdtempSync(join(tmpdir(), "qsc-review-credential-"));
  const scheme = "postgresql";
  writeFileSync(join(repository, "credential.ts"), `${scheme}://user:${"realistic-secret"}@host/database`);
  assert.throws(() => copySourceFile(repository, join(repository, "bundle"), "credential.ts"), /CREDENTIAL_URL.*credential\.ts/);
  const binary = Buffer.from([0, 255, 254, 1, 13, 10]);
  writeFileSync(join(repository, "image.bin"), binary);
  const copied = copySourceFile(repository, join(repository, "binary-bundle"), "image.bin");
  assert.deepEqual(readFileSync(copied.destination), binary);
  assert.equal(copied.sourceSha256, copied.bundleSha256);
});
