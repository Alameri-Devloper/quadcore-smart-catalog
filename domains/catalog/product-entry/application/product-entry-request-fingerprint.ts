import { createHash } from "node:crypto";
import { RequestFingerprint } from "../domain/product-entry-submission";

const canonicalSerializeValue = (value: unknown, ancestors: ReadonlySet<object>): string => {
  if (value === null) return "null";
  if (typeof value === "string" || typeof value === "boolean") return JSON.stringify(value);
  if (typeof value === "number") {
    if (!Number.isFinite(value) || Object.is(value, -0)) {
      throw new Error("Canonical request numbers must be finite and cannot be negative zero.");
    }
    return JSON.stringify(value);
  }
  if (typeof value !== "object") {
    throw new Error("Canonical request contains an unsupported value.");
  }
  if (ancestors.has(value)) {
    throw new Error("Canonical request cannot contain cyclic values.");
  }
  const nextAncestors = new Set(ancestors).add(value);
  if (Array.isArray(value)) {
    return `[${value.map((item) => canonicalSerializeValue(item, nextAncestors)).join(",")}]`;
  }
  if (Object.getPrototypeOf(value) !== Object.prototype) {
    throw new Error("Canonical request objects must be plain objects.");
  }
  const record = value as Record<string, unknown>;
  return `{${Object.keys(record)
    .sort((left, right) => left.localeCompare(right))
    .map((key) => `${JSON.stringify(key)}:${canonicalSerializeValue(record[key], nextAncestors)}`)
    .join(",")}}`;
};

export const canonicalSerializeProductEntryRequest = (value: unknown): string =>
  canonicalSerializeValue(value, new Set());

export class ProductEntryRequestFingerprintService {
  calculate(payload: unknown): RequestFingerprint {
    const canonical = canonicalSerializeProductEntryRequest(payload);
    return RequestFingerprint.create(createHash("sha256").update(canonical, "utf8").digest("hex"));
  }
}
