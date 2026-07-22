import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";

export function calculateSha256(value: Uint8Array | string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function calculateFileSha256(path: string): string {
  return calculateSha256(readFileSync(path));
}

