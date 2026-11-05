import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CatalogQueryApiClient } from "./catalog-query-api.client";
import type { CatalogQueryState } from "./catalog-query-state";

const query: CatalogQueryState = { q: "ThinkPad", branchId: "branch-a", lifecycle: "Published", sort: "relevance", cursor: "opaque_cursor" };
const card = {
  productId: "product-a", productCode: "QSC-A", productName: "ThinkPad", lifecycle: "Published",
  createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z",
  classification: { department: { id: "d", displayName: "Computers" }, category: null, productType: null, brand: { id: "b", displayName: "Lenovo" }, deviceClass: "business", condition: "new", supplyStatus: null },
  mainMedia: { mediaId: "media-a", altText: "Front", position: 0, isMain: true, downloadUrl: "/api/catalog/products/product-a/media/media-a" }, listingStatus: "Listed",
  retail: { amountMinor: "0", currency: "USD", source: "WorkspaceBase" }, availability: "OutOfStock",
};
const success = (value: unknown) => new Response(JSON.stringify({ type: "Success", value }), { status: 200, headers: { "content-type": "application/json" } });

describe("Catalog Presentation API client", () => {
  it("invokes a receiver-sensitive FetchPort without binding the client instance", async () => {
    let calledWithoutReceiver = false;
    const fetchPort = async function (this: unknown): Promise<Response> {
      calledWithoutReceiver = this === undefined;
      if (this !== undefined) throw new TypeError("Illegal invocation");
      return success({ items: [], nextCursor: null });
    };
    const client = new CatalogQueryApiClient(fetchPort);

    const result = await client.search({ q: "", lifecycle: "Published", sort: "newest" });

    assert.equal(calledWithoutReceiver, true);
    assert.deepEqual(result, { ok: true, value: { items: [], nextCursor: null } });
  });

  it("uses only the canonical private API and preserves the opaque cursor", async () => {
    let observed = ""; let init: RequestInit | undefined;
    const client = new CatalogQueryApiClient(async (input, options) => { observed = String(input); init = options; return success({ items: [card], nextCursor: "next_server_cursor" }); });
    const result = await client.search(query);
    assert.equal(result.ok, true);
    assert.match(observed, /^\/api\/catalog\/products\?/u);
    assert.equal(new URL(observed, "https://qsc.invalid").searchParams.get("cursor"), "opaque_cursor");
    assert.equal(init?.credentials, "same-origin"); assert.equal(init?.cache, "no-store");
  });

  it("constructs card disclosure from allowed fields and never admits Reference Cost", async () => {
    const client = new CatalogQueryApiClient(async () => success({ items: [{ ...card, retail: { amountMinor: "750", currency: "XAU", source: "WorkspaceBase" }, referenceCost: { amountMinor: "90000", currency: "USD", source: "WorkspaceBase" } }], nextCursor: null }));
    const result = await client.search(query); assert.equal(result.ok, true);
    if (result.ok) { assert.equal("referenceCost" in result.value.items[0]!, false); assert.equal(result.value.items[0]?.retail?.amountMinor, "750"); assert.equal(result.value.items[0]?.retail?.currency, "XAU"); assert.equal("inventory" in result.value.items[0]!, false); }
  });

  it("keeps Retail and Wholesale independent and validates same-origin media descriptors", async () => {
    const wholesaleOnly = { ...card, retail: undefined, wholesale: { amountMinor: "100000", currency: "USD", source: "BranchOverride" } };
    const client = new CatalogQueryApiClient(async () => success({ items: [wholesaleOnly], nextCursor: null }));
    const result = await client.search(query); assert.equal(result.ok, true);
    if (result.ok) { assert.equal(result.value.items[0]?.retail, undefined); assert.equal(result.value.items[0]?.wholesale?.amountMinor, "100000"); }
    const external = new CatalogQueryApiClient(async () => success({ items: [{ ...card, mainMedia: { ...card.mainMedia, downloadUrl: "https://attacker.invalid/a.webp" } }], nextCursor: null }));
    assert.deepEqual(await external.search(query), { ok: false, kind: "Unavailable", code: "CatalogQueryServiceUnavailable", status: 0 });
  });

  it("returns typed failure state without mock Product fallback", async () => {
    const unavailable = new CatalogQueryApiClient(async () => { throw new Error("offline"); });
    assert.deepEqual(await unavailable.search(query), { ok: false, kind: "Unavailable", code: "CatalogQueryServiceUnavailable", status: 0 });
    const forbidden = new CatalogQueryApiClient(async () => new Response(JSON.stringify({ type: "Forbidden" }), { status: 403 }));
    assert.deepEqual(await forbidden.filterOptions(), { ok: false, kind: "Forbidden", code: "Forbidden", status: 403 });
  });

  it("requests Details with Branch input only and accepts server-derived share capabilities", async () => {
    let observed = "";
    const client = new CatalogQueryApiClient(async (input) => { observed = String(input); return success({ ...card, media: [card.mainMedia], specifications: [], capabilities: { directSharePriceModes: ["Wholesale"] } }); });
    const result = await client.productDetails("product/a", "branch-a");
    assert.equal(observed, "/api/catalog/products/product%2Fa?branchId=branch-a");
    assert.equal(result.ok, true); if (result.ok) assert.deepEqual(result.value.capabilities.directSharePriceModes, ["Wholesale"]);
    assert.equal(observed.includes("workspaceId"), false); assert.equal(observed.includes("permission"), false);
  });
});

describe("Phase 1 specification DTO validation", () => {
  const spec = { specificationDefinitionId: "outdoor", displayName: "Outdoor / خارجي", valueType: "Boolean", unit: null, value: false, sortOrder: 0 };
  it("retains false and rejects excessive or duplicate Card values", async () => {
    for (const entries of [[spec], [spec, spec], Array.from({ length: 4 }, (_, index) => ({ ...spec, specificationDefinitionId: String(index) }))]) {
      const client = new CatalogQueryApiClient(async () => success({ items: [{ ...card, cardSpecifications: entries }], nextCursor: null }));
      const result = await client.search(query);
      assert.equal(result.ok, entries.length === 1);
      if (result.ok) assert.equal(result.value.items[0]!.cardSpecifications![0]!.value, false);
    }
  });
  it("rejects lost historical values, unknown group references and excessive missing rows", async () => {
    const validGroup = { id: "camera", label: { en: "Camera", ar: "الكاميرا" }, specificationDefinitionIds: ["outdoor"], missingSpecifications: [] };
    for (const [groups, expected] of [
      [[validGroup], true],
      [[{ ...validGroup, specificationDefinitionIds: [] }], false],
      [[{ ...validGroup, specificationDefinitionIds: ["foreign"] }], false],
      [[{ ...validGroup, missingSpecifications: Array.from({ length: 5 }, (_, index) => ({ specificationDefinitionId: "missing-" + index, displayName: "Missing", valueType: "Text", unit: null, sortOrder: index })) }], false],
      [[validGroup, validGroup], false],
    ] as const) {
      const client = new CatalogQueryApiClient(async () => success({ ...card, media: [], specifications: [spec], capabilities: { directSharePriceModes: [] }, specificationGroups: groups }));
      const result = await client.productDetails("product-a");
      assert.equal(result.ok, expected);
      if (result.ok) assert.equal(result.value.specifications[0]!.value, false);
    }
  });
});

describe("Specification composition DTO boundary",()=>{
  const capacity={specificationDefinitionId:"ram",displayName:"Memory (RAM)",valueType:"Number",unit:"GB",value:"16",sortOrder:0};
  const ddr={specificationDefinitionId:"ddr",displayName:"DDR",valueType:"Text",unit:null,value:"DDR5",sortOrder:1};
  it("retains independent components and scoped model identity in valid Details",async()=>{
    const client=new CatalogQueryApiClient(async()=>success({...card,modelName:"ThinkPad T14 Gen 3",media:[],specifications:[{...capacity,presentation:{component:ddr,separator:" "}},ddr],capabilities:{directSharePriceModes:[]}}));
    const result=await client.productDetails("product-a");assert.ok(result.ok);if(result.ok){assert.equal(result.value.modelName,"ThinkPad T14 Gen 3");assert.equal(result.value.specifications.length,2);assert.equal(result.value.specifications[0].presentation?.component?.value,"DDR5");}
  });
  it("rejects dangling, altered and recursive component references",async()=>{
    for(const component of [{...ddr,specificationDefinitionId:"foreign"},{...ddr,value:"DDR4"},{...ddr,presentation:{component:capacity,separator:" "}}]){
      const client=new CatalogQueryApiClient(async()=>success({...card,media:[],specifications:[{...capacity,presentation:{component,separator:" "}},ddr],capabilities:{directSharePriceModes:[]}}));
      assert.equal((await client.productDetails("product-a")).ok,false);
    }
  });
});
