import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductEntryRequestFingerprintService } from "./product-entry-request-fingerprint";

const service = new ProductEntryRequestFingerprintService();
const request = () => ({
  mode: "Create",
  productId: null,
  expectedProductRevision: null,
  draft: {
    catalogId: "catalog-a",
    classification: { categoryId: "category-a" },
    commercialDetails: { productName: "Laptop", productCode: null },
    specificationValues: [{ specificationFieldId: "ram", value: 16 }],
  },
  mediaOperations: [{
    operationId: "add-a", operationType: "Add", sequence: 0, mediaId: null,
    requestedDisplayOrder: 0, selectedAsCover: true, expectedSourceSha256: "a".repeat(64),
    expectedSourceByteLength: 42, finalOrder: 0,
  }],
});

describe("Product Entry request fingerprint", () => {
  it("is stable and canonical lowercase SHA-256", () => {
    const first = service.calculate(request()).value;
    assert.equal(service.calculate(request()).value, first);
    assert.match(first, /^[a-f0-9]{64}$/);
  });

  it("is independent of object key insertion order", () => {
    const original = request();
    const reordered = { mediaOperations: original.mediaOperations, draft: original.draft, expectedProductRevision: null, productId: null, mode: "Create" };
    assert.equal(service.calculate(original).value, service.calculate(reordered).value);
  });

  it("preserves media operation order as semantically significant", () => {
    const original = request();
    const second = { ...original.mediaOperations[0], operationId: "add-b", sequence: 1 };
    const forward = { ...original, mediaOperations: [original.mediaOperations[0], second] };
    const reverse = { ...original, mediaOperations: [second, original.mediaOperations[0]] };
    assert.notEqual(service.calculate(forward).value, service.calculate(reverse).value);
  });

  it("includes every Product draft field, mode, and expected Revision", () => {
    const original = request();
    assert.notEqual(service.calculate(original).value, service.calculate({ ...original, mode: "Edit" }).value);
    assert.notEqual(service.calculate(original).value, service.calculate({ ...original, expectedProductRevision: 0 }).value);
    assert.notEqual(service.calculate(original).value, service.calculate({ ...original, draft: { ...original.draft, commercialDetails: { ...original.draft.commercialDetails, productName: "Changed" } } }).value);
    assert.notEqual(service.calculate(original).value, service.calculate({ ...original, draft: { ...original.draft, specificationValues: [{ specificationFieldId: "ram", value: 32 }] } }).value);
  });

  it("includes source fingerprint, byte length, and final order", () => {
    const original = request();
    for (const operation of [
      { ...original.mediaOperations[0], expectedSourceSha256: "b".repeat(64) },
      { ...original.mediaOperations[0], expectedSourceByteLength: 43 },
      { ...original.mediaOperations[0], finalOrder: 1 },
    ]) {
      assert.notEqual(service.calculate(original).value, service.calculate({ ...original, mediaOperations: [operation] }).value);
    }
  });

  it("treats null and omission deterministically according to the canonical contract", () => {
    const withNull = { value: null };
    const omitted = {};
    assert.notEqual(service.calculate(withNull).value, service.calculate(omitted).value);
    assert.equal(service.calculate(withNull).value, service.calculate({ value: null }).value);
  });

  it("rejects unsupported, non-finite, ambiguous, and cyclic values", () => {
    for (const value of [{ value: undefined }, { value: Number.NaN }, { value: Number.POSITIVE_INFINITY }, { value: -0 }, { value: new Date() }]) {
      assert.throws(() => service.calculate(value));
    }
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    assert.throws(() => service.calculate(cyclic), /cyclic/);
  });
});
