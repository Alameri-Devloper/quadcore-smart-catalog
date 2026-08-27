import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { DirectProductShareProjection, DirectSharePriceMode } from "../domain/direct-product-share";
import type { DirectProductShareRepository, DirectShareMediaReaderPort } from "../ports/direct-product-share-repository.port";
import { CreateDirectProductShareUseCase, DownloadDirectProductShareMediaUseCase } from "./direct-product-share.use-cases";

const context = (permissions: readonly string[] = ["catalog.products.view", "catalog.sharing.create", "pricing.view"], workspaceId = "workspace-a", branchIds?: readonly string[]): TrustedActorContext => {
  const branchScope: TrustedActorContext["branchScope"] = branchIds ? { type: "SelectedBranches", branchIds } : { type: "AllBranches" };
  return Object.freeze({ workspaceId, actorId: "actor-a", role: "Staff", permissions, branchScope, authorizationVersion: 1 });
};

const projection = (changes: Partial<DirectProductShareProjection> = {}): DirectProductShareProjection => Object.freeze({
  productId: "product-a", productCode: "LP-001", productName: "Lenovo ThinkPad P15", lifecycle: "Published",
  branch: null, price: { amountMinor: BigInt(750), currency: "USD" },
  specifications: Object.freeze([
    { displayName: "RAM", value: "16", unit: "GB", position: 1 },
    { displayName: "Processor", value: "Intel Core i7", unit: null, position: 0 },
  ]),
  mainMedia: null,
  ...changes,
});

class Repository implements DirectProductShareRepository {
  product: DirectProductShareProjection | null = projection();
  branchFound = true;
  requestedWorkspaceId: string | null = null;
  requestedMode: DirectSharePriceMode | null = null;
  async branchExists(workspaceId: string) { this.requestedWorkspaceId = workspaceId; return this.branchFound; }
  async getShareProduct(query: Parameters<DirectProductShareRepository["getShareProduct"]>[0]) { this.requestedWorkspaceId = query.workspaceId; this.requestedMode = query.priceMode; return this.product; }
  async getShareMedia(workspaceId: string) { this.requestedWorkspaceId = workspaceId; return this.product ? { productId: this.product.productId, productCode: this.product.productCode, lifecycle: this.product.lifecycle, media: this.product.mainMedia } : null; }
}

const execute = (repository: Repository, input: { branchId?: string; priceMode?: string; locale?: string } = {}, actor = context()) => new CreateDirectProductShareUseCase(repository).execute({
  context: actor, productId: "product-a", input: { priceMode: input.priceMode ?? "Retail", locale: input.locale ?? "en", ...(input.branchId ? { branchId: input.branchId } : {}) },
});

describe("CreateDirectProductShareUseCase", () => {
  it("creates a bounded English retail payload from canonical data", async () => {
    const repository = new Repository();
    const result = await execute(repository);
    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.value.productName, "Lenovo ThinkPad P15");
    assert.equal(result.value.productCode, "LP-001");
    assert.deepEqual(result.value.price, { mode: "Retail", amountMinor: "750", currency: "USD" });
    assert.match(result.value.text, /Price \(Retail\): 7\.50 USD/);
    assert.match(result.value.text, /Processor: Intel Core i7/);
    assert.ok(result.value.text.indexOf("Processor") < result.value.text.indexOf("RAM"));
  });

  it("uses trusted Workspace scope and non-discloses foreign Products", async () => {
    const repository = new Repository(); repository.product = null;
    const result = await execute(repository, {}, context(undefined, "workspace-a"));
    assert.deepEqual(result, { ok: false, error: "ProductNotFound" });
    assert.equal(repository.requestedWorkspaceId, "workspace-a");
  });

  it("requires sharing, Product visibility, and independent price authority", async () => {
    for (const permissions of [[], ["catalog.products.view", "pricing.view"], ["catalog.sharing.create", "pricing.view"], ["catalog.products.view", "catalog.sharing.create"]]) {
      assert.deepEqual(await execute(new Repository(), {}, context(permissions)), { ok: false, error: "Forbidden" });
    }
    assert.deepEqual(await execute(new Repository(), { priceMode: "Wholesale" }, context(["catalog.products.view", "catalog.sharing.create", "pricing.view"])), { ok: false, error: "Forbidden" });
  });

  it("supports authorized Wholesale without exposing Reference Cost", async () => {
    const repository = new Repository();
    const result = await execute(repository, { priceMode: "Wholesale" }, context(["catalog.products.view", "catalog.sharing.create", "pricing.wholesale.view", "referenceCost.view"]));
    assert.equal(result.ok, true); assert.equal(repository.requestedMode, "Wholesale");
    assert.match(result.ok ? result.value.text : "", /Price \(Wholesale\): 7\.50 USD/);
    const serialized = JSON.stringify(result);
    for (const forbidden of ["referenceCost", "costAmount", "onHand", "reserved", "damaged", "availableQuantity", "storageKey", "workspaceId"]) assert.equal(serialized.includes(forbidden), false, forbidden);
  });

  it("preserves zero and treats missing price as PriceUnavailable", async () => {
    const repository = new Repository(); repository.product = projection({ price: { amountMinor: BigInt(0), currency: "YER" } });
    const zero = await execute(repository); assert.equal(zero.ok && zero.value.price.amountMinor, "0");
    assert.match(zero.ok ? zero.value.text : "", /Price \(Retail\): 0\.00 YER/);
    repository.product = projection({ price: null });
    assert.deepEqual(await execute(repository), { ok: false, error: "PriceUnavailable" });
  });

  it("formats canonical ISO minor units without changing machine Money", async () => {
    for (const [currency, expected] of [["USD", "7.50"], ["JPY", "750"], ["KWD", "0.750"], ["CLF", "0.0750"]] as const) {
      const repository = new Repository(); repository.product = projection({ price: { amountMinor: BigInt(750), currency } });
      const result = await execute(repository);
      assert.equal(result.ok && result.value.price.amountMinor, "750", currency);
      assert.match(result.ok ? result.value.text : "", new RegExp(`Price \\(Retail\\): ${expected.replace(".", "\\.")} ${currency}$`), currency);
    }
    const repository = new Repository(); repository.product = projection({ price: { amountMinor: BigInt("9007199254740991"), currency: "USD" } });
    const large = await execute(repository);
    assert.equal(large.ok && large.value.price.amountMinor, "9007199254740991");
    assert.match(large.ok ? large.value.text : "", /90071992547409\.91 USD/);
  });

  it("rejects official N.A. minor units without guessing a customer price", async () => {
    const repository = new Repository(); repository.product = projection({ price: { amountMinor: BigInt(750), currency: "XAU" } });
    const result = await execute(repository);
    assert.deepEqual(result, { ok: false, error: "UnsupportedCurrencyForDirectShare" });
    assert.equal(JSON.stringify(result).includes("750"), false);
  });

  it("rejects archived and draft Products with a typed safe outcome", async () => {
    for (const lifecycle of ["Archived", "Draft"] as const) {
      const repository = new Repository(); repository.product = projection({ lifecycle });
      assert.deepEqual(await execute(repository), { ok: false, error: "ProductIneligible" });
    }
  });

  it("validates Branch scope, ownership, listing, effective price, and safe availability", async () => {
    const denied = await execute(new Repository(), { branchId: "branch-a" }, context(undefined, "workspace-a", ["branch-b"]));
    assert.deepEqual(denied, { ok: false, error: "BranchNotFound" });
    const foreign = new Repository(); foreign.branchFound = false;
    assert.deepEqual(await execute(foreign, { branchId: "branch-a" }), { ok: false, error: "BranchNotFound" });
    const disappeared = new Repository(); disappeared.product = projection({ branch: null });
    assert.deepEqual(await execute(disappeared, { branchId: "branch-a" }), { ok: false, error: "BranchNotFound" });
    for (const listingStatus of ["Unlisted", "NotConfigured"] as const) {
      const repository = new Repository(); repository.product = projection({ branch: { displayName: "Sana'a", listingStatus, availableQuantity: BigInt(4) } });
      assert.deepEqual(await execute(repository, { branchId: "branch-a" }), { ok: false, error: "BranchProductIneligible" });
    }
    const repository = new Repository(); repository.product = projection({ price: { amountMinor: BigInt(600), currency: "USD" }, branch: { displayName: "Sana'a", listingStatus: "Listed", availableQuantity: BigInt(0) } });
    const result = await execute(repository, { branchId: "branch-a" });
    assert.equal(result.ok && result.value.price.amountMinor, "600");
    assert.match(result.ok ? result.value.text : "", /Price \(Retail\): 6\.00 USD/);
    assert.equal(result.ok && result.value.availability, "OutOfStock");
    assert.equal(JSON.stringify(result).includes("availableQuantity"), false);
  });

  it("omits availability without Branch context rather than fabricating a global value", async () => {
    const result = await execute(new Repository());
    assert.equal(result.ok && "availability" in result.value, false);
    assert.equal(result.ok && "branch" in result.value, false);
  });

  it("keeps persisted historical specifications, limits them deterministically, and omits empty values", async () => {
    const repository = new Repository(); repository.product = projection({ specifications: Object.freeze([
      { displayName: "Historical RAM", value: "16", unit: "GB", position: 8 },
      { displayName: "Empty", value: " ", unit: null, position: 0 },
      ...Array.from({ length: 8 }, (_, index) => ({ displayName: `Field ${index}`, value: String(index), unit: null, position: index + 1 })),
    ]) });
    const result = await execute(repository);
    assert.equal(result.ok && result.value.specifications.length, 6);
    assert.deepEqual(result.ok && result.value.specifications.map(({ displayName }) => displayName), ["Field 0", "Field 1", "Field 2", "Field 3", "Field 4", "Field 5"]);
  });

  it("localizes only system labels and preserves dynamic display names", async () => {
    const repository = new Repository(); repository.product = projection({ productName: "Lenovo ثينك باد", branch: { displayName: "فرع Sana'a", listingStatus: "Listed", availableQuantity: BigInt(1) } });
    const result = await execute(repository, { branchId: "branch-a", locale: "ar" });
    assert.equal(result.ok && result.value.productName, "Lenovo ثينك باد");
    assert.equal(result.ok && result.value.branch?.displayName, "فرع Sana'a");
    assert.match(result.ok ? result.value.text : "", /السعر/);
  });

  it("exposes only a safe authenticated descriptor for approved main media", async () => {
    const repository = new Repository(); repository.product = projection({ mainMedia: { mediaId: "media-a", storageRootKey: "internal/root", storageKey: "internal/root/main.webp", checksumSha256: "a".repeat(64), mimeType: "image/webp" } });
    const result = await execute(repository);
    assert.equal(result.ok && result.value.mainMedia?.downloadUrl, "/api/catalog/products/product-a/direct-share/media");
    const serialized = JSON.stringify(result);
    assert.equal(serialized.includes("storageKey"), false); assert.equal(serialized.includes("checksum"), false); assert.equal(serialized.includes("mediaId"), false);
  });

  it("rejects malformed modes/locales and any invalid identifier", async () => {
    assert.deepEqual(await execute(new Repository(), { priceMode: "ReferenceCost" }), { ok: false, error: "InvalidInput" });
    assert.deepEqual(await execute(new Repository(), { locale: "fr" }), { ok: false, error: "InvalidInput" });
    const result = await new CreateDirectProductShareUseCase(new Repository()).execute({ context: context(), productId: " bad ", input: { priceMode: "Retail", locale: "en" } });
    assert.deepEqual(result, { ok: false, error: "InvalidInput" });
  });

  it("fails safely instead of truncating an ambiguous overlong Product identity", async () => {
    const repository = new Repository(); repository.product = projection({ productCode: "X".repeat(161) });
    assert.deepEqual(await execute(repository), { ok: false, error: "PayloadTooLarge" });
  });
});

describe("DownloadDirectProductShareMediaUseCase", () => {
  it("authorizes the canonical active main artifact and returns a safe filename", async () => {
    const repository = new Repository(); repository.product = projection({ mainMedia: { mediaId: "media-a", storageRootKey: "root", storageKey: "root/main.webp", checksumSha256: "a".repeat(64), mimeType: "image/webp" } });
    let requestedMaximum = 0;
    const reader: DirectShareMediaReaderPort = { async read(input) { requestedMaximum = input.maximumBytes; return { type: "Found", bytes: new Uint8Array([1, 2]) }; } };
    const result = await new DownloadDirectProductShareMediaUseCase(repository, reader).execute({ context: context(), productId: "product-a" });
    assert.equal(result.ok && result.value.fileName, "lp-001.webp"); assert.equal(requestedMaximum, 8 * 1024 * 1024);
  });

  it("fails safely for missing, archived, foreign, unauthorized, or unreadable media", async () => {
    const reader: DirectShareMediaReaderPort = { async read() { return { type: "Unavailable" }; } };
    const repository = new Repository(); repository.product = projection({ mainMedia: null });
    assert.deepEqual(await new DownloadDirectProductShareMediaUseCase(repository, reader).execute({ context: context(), productId: "product-a" }), { ok: false, error: "MediaUnavailable" });
    assert.deepEqual(await new DownloadDirectProductShareMediaUseCase(repository, reader).execute({ context: context([]), productId: "product-a" }), { ok: false, error: "Forbidden" });
    repository.product = null;
    assert.deepEqual(await new DownloadDirectProductShareMediaUseCase(repository, reader).execute({ context: context(), productId: "product-a" }), { ok: false, error: "ProductNotFound" });
    repository.product = projection({ lifecycle: "Archived", mainMedia: { mediaId: "media-a", storageRootKey: "root", storageKey: "root/main.webp", checksumSha256: "a".repeat(64), mimeType: "image/webp" } });
    assert.deepEqual(await new DownloadDirectProductShareMediaUseCase(repository, reader).execute({ context: context(), productId: "product-a" }), { ok: false, error: "ProductIneligible" });
    repository.product = projection({ mainMedia: { mediaId: "media-a", storageRootKey: "root", storageKey: "root/main.webp", checksumSha256: "a".repeat(64), mimeType: "image/webp" } });
    assert.deepEqual(await new DownloadDirectProductShareMediaUseCase(repository, reader).execute({ context: context(), productId: "product-a" }), { ok: false, error: "MediaUnavailable" });
  });
});
