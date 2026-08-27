import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  CONDITION_REGISTRY,
  DEVICE_CLASS_REGISTRY,
  ISO_CURRENCY_CODES,
  ISO_CURRENCY_REGISTRY,
  currencyMinorUnitDigits,
  formatIsoCurrencyAmountMinor,
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
    assert.equal(ISO_CURRENCY_CODES.length, 178);
    assert.equal(new Set(ISO_CURRENCY_CODES).size, ISO_CURRENCY_CODES.length);
    assert.deepEqual(ISO_CURRENCY_REGISTRY.map(({ code }) => code), [...ISO_CURRENCY_CODES]);
    assert.ok(ISO_CURRENCY_REGISTRY.some(({ code }) => code === "EUR"));
    assert.ok(ISO_CURRENCY_REGISTRY.some(({ code }) => code === "USD"));
    assert.ok(ISO_CURRENCY_REGISTRY.some(({ code }) => code === "YER"));
  });

  it("preserves authoritative ISO minor-unit metadata and formats bigint Money deterministically", () => {
    assert.equal(currencyMinorUnitDigits("USD"), 2);
    assert.equal(currencyMinorUnitDigits("JPY"), 0);
    assert.equal(currencyMinorUnitDigits("KWD"), 3);
    assert.equal(currencyMinorUnitDigits("CLF"), 4);
    assert.equal(currencyMinorUnitDigits("XAU"), null);
    assert.equal(currencyMinorUnitDigits("NOT"), undefined);
    assert.equal(formatIsoCurrencyAmountMinor(BigInt(750), "USD"), "7.50");
    assert.equal(formatIsoCurrencyAmountMinor(BigInt(750), "JPY"), "750");
    assert.equal(formatIsoCurrencyAmountMinor(BigInt(750), "KWD"), "0.750");
    assert.equal(formatIsoCurrencyAmountMinor(BigInt(750), "CLF"), "0.0750");
    assert.equal(formatIsoCurrencyAmountMinor(BigInt(0), "USD"), "0.00");
    assert.equal(formatIsoCurrencyAmountMinor(BigInt("9007199254740991"), "USD"), "90071992547409.91");
    assert.equal(formatIsoCurrencyAmountMinor(BigInt(1), "XAU"), null);
    assert.throws(() => formatIsoCurrencyAmountMinor(BigInt(-1), "USD"), /InvalidMoneyAmount/);
  });
});
