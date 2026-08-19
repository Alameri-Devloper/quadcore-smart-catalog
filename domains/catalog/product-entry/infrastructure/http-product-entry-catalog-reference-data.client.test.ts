import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { HttpProductEntryCatalogReferenceDataClient } from "./browser/http-product-entry-catalog-reference-data.client";

const emptyReferenceData = { departments: [], categories: [], productTypes: [], brands: [], deviceClasses: [], conditions: [], supplyStatuses: [], currencies: [], specificationDefinitions: [], specificationTemplates: [] };

describe("Product Entry Catalog Reference Data client", () => {
  it("consumes the active Workspace selection contract without sending authority", async () => {
    let requested = "";
    const client = new HttpProductEntryCatalogReferenceDataClient(async (input, init) => {
      requested = String(input);
      assert.equal(init?.method, "GET");
      assert.equal(init?.body, undefined);
      return Response.json({ type: "Success", value: emptyReferenceData });
    });
    assert.deepEqual(await client.load(), { type: "Available", value: emptyReferenceData });
    assert.equal(requested, "/api/catalog/reference-data");
  });

  it("fails closed for malformed or unavailable responses", async () => {
    assert.deepEqual(await new HttpProductEntryCatalogReferenceDataClient(async () => Response.json({ value: { departments: [] } })).load(), { type: "Unavailable" });
    assert.deepEqual(await new HttpProductEntryCatalogReferenceDataClient(async () => new Response(null, { status: 503 })).load(), { type: "Unavailable" });
  });
});
