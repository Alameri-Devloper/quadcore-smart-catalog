import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parsePersistedSpecificationNumber } from "./product-persistence.mapper";
import { PRODUCT_READ_TRANSACTION_CONFIG } from "./postgresql-product.repository";

describe("ProductPersistenceMapper specification numbers", () => {
  it("accepts exactly the representation emitted by String(number)", () => {
    for (const value of [0, -0, 0.5, -42.25, 1e21, NaN, Infinity, -Infinity]) {
      const persisted = String(value);
      assert.ok(Object.is(parsePersistedSpecificationNumber(persisted), Number(persisted)));
    }
  });

  it("rejects non-canonical persisted number spellings", () => {
    for (const persisted of ["01", ".5", "1.", "1e+3", "1E21", "+1", "-0", "infinity", " NaN "]) {
      assert.throws(() => parsePersistedSpecificationNumber(persisted), /non-canonical representation/);
    }
  });
});

describe("PostgreSQL Product read transaction", () => {
  it("declares one read-only repeatable-read snapshot for Aggregate reconstruction", () => {
    assert.deepEqual(PRODUCT_READ_TRANSACTION_CONFIG, {
      isolationLevel: "repeatable read",
      accessMode: "read only",
    });
  });
});
