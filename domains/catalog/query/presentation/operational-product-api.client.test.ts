import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { OperationalProductApiClient, reconstructOperationalProducts, type FetchPort } from "./operational-product-api.client";
import { operationalProductPageFixture as page } from "./mock/operational-product.fixture";
import { OPERATIONAL_PRODUCT_PURPOSES, type OperationalProductRequest } from "./operational-product-selector.types";

const request: OperationalProductRequest = { purpose: "Listing", branchId: "branch-a", q: "" };
const client = (body: unknown, status = 200) => new OperationalProductApiClient(async () => Response.json(body, { status }));
describe("Strict A2 operational Product client", () => {
  it("has exactly the six Application purposes", () => {
    assert.deepEqual(OPERATIONAL_PRODUCT_PURPOSES, ["Listing", "Inventory", "WorkspacePricing", "BranchPricing", "WorkspaceReferenceCost", "BranchReferenceCost"]);
    // @ts-expect-error A6 Transfer is deliberately not an A2 purpose.
    const bad: OperationalProductRequest = { purpose: "Transfer", q: "" }; void bad;
    // @ts-expect-error Branch-scoped discovery requires a branch.
    const missing: OperationalProductRequest = { purpose: "Inventory", q: "" }; void missing;
    // @ts-expect-error Workspace discovery cannot carry a branch.
    const extra: OperationalProductRequest = { purpose: "WorkspacePricing", branchId: "a", q: "" }; void extra;
  });
  for (const purpose of OPERATIONAL_PRODUCT_PURPOSES) it(`serializes only A2 fields for ${purpose}`, async () => {
    const workspace = purpose.startsWith("Workspace"), branchId = workspace ? undefined : "branch-a";
    const calls: { url: string; init?: RequestInit }[] = [];
    const fetchPort: FetchPort = async (url, init) => { calls.push({ url: String(url), init }); return Response.json({ type: "Success", value: page(branchId) }); };
    const signal = new AbortController().signal;
    const result = await new OperationalProductApiClient(fetchPort).search({ purpose, ...(branchId ? { branchId } : {}), q: "  جهاز   A & B  ", cursor: "opaque_Next-123", limit: 24,
      workspaceId: "ignored", permissions: ["ignored"], capabilities: {} } as OperationalProductRequest, signal);
    assert.equal(result.ok, true);
    const url = new URL(calls[0].url, "https://local.test");
    assert.equal(url.pathname, "/api/catalog/operational-products");
    assert.deepEqual([...url.searchParams.keys()], ["purpose", "q", ...(branchId ? ["branchId"] : []), "cursor", "limit"]);
    assert.equal(url.searchParams.get("purpose"), purpose); assert.equal(url.searchParams.get("q"), "جهاز A & B");
    assert.equal(url.searchParams.get("branchId"), branchId ?? null); assert.equal(url.searchParams.get("cursor"), "opaque_Next-123");
    assert.deepEqual(calls[0].init, { method: "GET", credentials: "same-origin", cache: "no-store", signal, headers: { accept: "application/json" } });
  });
  it("omits blank q and unused cursor/limit without adding another route", async () => {
    const calls: string[] = [];
    await new OperationalProductApiClient(async (url) => { calls.push(String(url)); return Response.json({ type: "Success", value: page() }); }).search({ purpose: "WorkspacePricing", q: " \t " });
    assert.deepEqual(calls, ["/api/catalog/operational-products?purpose=WorkspacePricing"]);
  });
  it("reconstructs/freeze approved own fields, preserves order/cursor, and discards unknown authority", () => {
    const source = page("branch-a"), decorated = { ...source, total: 999, items: source.items.map((item) => ({ ...item, permissions: ["edit"], allowedActions: ["Write"], inventory: { available: 99 }, workspaceId: "ignored" })) };
    const result = reconstructOperationalProducts(decorated, request);
    assert.deepEqual(result, source); assert.ok(Object.isFrozen(result)); assert.ok(Object.isFrozen(result.items)); assert.ok(Object.isFrozen(result.items[0]));
    assert.deepEqual(result.items.map(({ productId }) => productId), ["product-z", "product-a"]); assert.equal(result.nextCursor, source.nextCursor);
    const workspace = reconstructOperationalProducts(decorated, { purpose: "WorkspacePricing", q: "" });
    assert.equal("branchId" in workspace.items[0], false); assert.equal("listingStatus" in workspace.items[0], false);
  });
  it("rejects malformed/partial/inherited DTOs, wrong branch and duplicate products", async () => {
    const source = page("branch-a"), first = source.items[0];
    const malformed = [null, [], {}, { items: [], nextCursor: 9 }, { items: [], nextCursor: "" }, { items: [], nextCursor: "x/y" },
      { items: {}, nextCursor: null }, { items: [], nextCursor: "a".repeat(2049) },
      ...["productId", "productCode", "productName", "lifecycle", "branchId", "listingStatus"].map((key) => {
        const item = { ...first } as Record<string, unknown>; delete item[key]; return { ...source, items: [item] };
      }),
      ...[{ productId: " " }, { productCode: 4 }, { productName: {} }, { lifecycle: "Archived" }, { branchId: "other" }, { listingStatus: "Any" }].map((patch) => ({ ...source, items: [{ ...first, ...patch }] })),
      { ...source, items: [first, first] },
    ];
    for (const value of malformed) assert.deepEqual(await client({ type: "Success", value }).search(request), { ok: false, kind: "MalformedResponse" });
    assert.throws(() => reconstructOperationalProducts({ ...source, items: [Object.create(first)] }, request));
    assert.throws(() => reconstructOperationalProducts(Object.create(source), request));
  });
  it("requires Success/value, JSON and exact HTTP 200", async () => {
    for (const body of [{ ok: true, value: page("branch-a") }, { type: "Success", items: [] }, { type: "Wrong", value: page("branch-a") }, []])
      assert.deepEqual(await client(body).search(request), { ok: false, kind: "MalformedResponse" });
    assert.deepEqual(await client({ type: "Success", value: page("branch-a") }, 201).search(request), { ok: false, kind: "UnexpectedResponse" });
    assert.deepEqual(await new OperationalProductApiClient(async () => new Response("not json")).search(request), { ok: false, kind: "MalformedResponse" });
  });
  for (const [type, status] of [["AuthenticationRequired", 401], ["ForbiddenForRestrictedSession", 403], ["Forbidden", 403], ["BranchNotFound", 404], ["InvalidQuery", 400], ["InvalidCursor", 400], ["CatalogQueryServiceUnavailable", 503]] as const)
    it(`normalizes exact ${status} ${type}, not authorized empty`, async () => {
      assert.deepEqual(await client({ type }, status).search(request), { ok: false, kind: type });
      assert.deepEqual(await client({ type }, 418).search(request), { ok: false, kind: "UnexpectedResponse" });
    });
  it("keeps transport, unexpected response and authorized empty distinct", async () => {
    assert.deepEqual(await new OperationalProductApiClient(async () => { throw new Error("offline"); }).search(request), { ok: false, kind: "NetworkFailure" });
    for (const type of ["toString", "ProductNotFound", "BranchServiceUnavailable", "NetworkFailure"]) assert.deepEqual(await client({ type }, 503).search(request), { ok: false, kind: "UnexpectedResponse" });
    assert.deepEqual(await client({ type: "Success", value: { items: [], nextCursor: null } }).search(request), { ok: true, value: { items: [], nextCursor: null } });
  });
  it("rejects invalid local request inputs without a network request", async () => {
    let calls = 0; const api = new OperationalProductApiClient(async () => { calls++; throw new Error("must not call"); });
    for (const input of [{ ...request, purpose: "Transfer" }, { ...request, branchId: undefined }, { purpose: "WorkspacePricing", branchId: "a", q: "" }, { ...request, q: "x".repeat(201) }, { ...request, limit: 61 }, { ...request, limit: 1.5 }])
      assert.deepEqual(await api.search(input as OperationalProductRequest), { ok: false, kind: "InvalidQuery" });
    assert.deepEqual(await api.search({ ...request, cursor: "bad/" }), { ok: false, kind: "InvalidCursor" }); assert.equal(calls, 0);
  });
});
