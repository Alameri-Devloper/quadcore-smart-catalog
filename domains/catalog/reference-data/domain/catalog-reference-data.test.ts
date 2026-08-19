import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONDITION_REGISTRY,
  DEVICE_CLASS_REGISTRY,
  ISO_CURRENCY_REGISTRY,
  normalizeDisplayName,
  normalizeOptionalUnit,
  normalizeReferenceCode,
  validateSortOrder,
  validateSpecificationValueType,
} from "./catalog-reference-data";

describe("Catalog Reference Data policy", () => {
  it("normalizes stable codes without deriving them from display names", () => {
    assert.equal(normalizeReferenceCode(" Gaming Laptops "), "gaming-laptops");
    assert.throws(() => normalizeReferenceCode("أجهزة"), /InvalidReferenceCode/);
    assert.throws(() => normalizeReferenceCode("bad_code"), /InvalidReferenceCode/);
  });

  it("trims only display-name boundaries and preserves internal Unicode", () => {
    assert.equal(normalizeDisplayName("  أجهزة  محمولة  "), "أجهزة  محمولة");
    assert.throws(() => normalizeDisplayName("   "), /InvalidDisplayName/);
  });

  it("enforces focused sort, value-type, and unit policies", () => {
    assert.equal(validateSortOrder(0), 0);
    assert.equal(validateSpecificationValueType("Boolean"), "Boolean");
    assert.equal(normalizeOptionalUnit(" GHz "), "GHz");
    assert.throws(() => validateSortOrder(-1), /InvalidSortOrder/);
    assert.throws(() => validateSpecificationValueType("Select"), /InvalidSpecificationValueType/);
  });

  it("keeps system registries fixed and localized outside Workspace rows", () => {
    assert.deepEqual(DEVICE_CLASS_REGISTRY.map(({ code }) => code), ["personal", "business", "gaming", "workstation"]);
    assert.deepEqual(CONDITION_REGISTRY.map(({ code }) => code), ["new", "used", "refurbished"]);
    assert.ok(ISO_CURRENCY_REGISTRY.length > 170);
    assert.ok(ISO_CURRENCY_REGISTRY.some(({ code }) => code === "EUR"));
    assert.ok(ISO_CURRENCY_REGISTRY.some(({ code }) => code === "USD"));
    assert.ok(ISO_CURRENCY_REGISTRY.some(({ code }) => code === "YER"));
  });
});
