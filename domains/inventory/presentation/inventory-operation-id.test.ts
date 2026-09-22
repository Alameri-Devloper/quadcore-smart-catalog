import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createInventoryOperationId } from "./inventory-operation-id";

describe("Inventory operation identity", () => {
  it("uses the injected browser crypto allocator and enforces the server length boundary", () => {
    assert.equal(createInventoryOperationId({ randomUUID: () => "browser-operation-0001" }), "browser-operation-0001");
    assert.throws(() => createInventoryOperationId({ randomUUID: () => "short" }), /InvalidOperationId/u);
    assert.throws(() => createInventoryOperationId({ randomUUID: () => "x".repeat(129) }), /InvalidOperationId/u);
  });
});
