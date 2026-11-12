import assert from "node:assert/strict";
import { it } from "node:test";
import { ProductSpecificationValue } from "../../types/product-specification-value.value-object";
import { publicShareResolutionFixture } from "../mock/public-share-resolution.fixture";
import { ResolvePublicProductShare } from "./resolve-public-product-share";
import { unavailablePublicShareAdmission } from "../ports/public-share-admission.port";
import { publicShareView } from "../presentation/public-share-view";

it("counts malformed requests before parsing and never touches persistence", async () => {
  for (const token of [null, "", "bad", "A".repeat(42), "A".repeat(42) + "B", "A".repeat(43) + "=", "%2F"]) {
    const f = await publicShareResolutionFixture();
    assert.deepEqual(await f.resolver.resolvePage(token, "trusted-source"), { ok: false, error: "NotFound" });
    assert.equal(f.state.admissions[0].phase, "Source"); assert.equal(f.state.snapshots, 0);
  }
});
it("missing enforcement and untrusted source fail closed before lookup", async () => {
  const f = await publicShareResolutionFixture();
  const r = new ResolvePublicProductShare(f.snapshots, f.memory.runtime.lookupDigest, unavailablePublicShareAdmission, f.reader);
  assert.deepEqual(await r.resolvePage(f.token, "trusted-source"), { ok: false, error: "ServiceUnavailable" });
  assert.deepEqual(await f.resolver.resolvePage(f.token, "https://untrusted/"), { ok: false, error: "ServiceUnavailable" });
  assert.equal(f.state.lookups, 0);
});
for (const phase of ["Source", "Resolved", "MediaRead"] as const) it("enforces " + phase + " admission without token counter keys", async () => {
  const f = await publicShareResolutionFixture(); f.withImage(); f.state.decisions[phase] = { type: "Denied", retryAfterSeconds: 7 };
  assert.deepEqual(await f.resolver.resolveMedia(f.token, "trusted-source"), { ok: false, error: "AdmissionDenied", retryAfterSeconds: 7 });
  assert.ok(!JSON.stringify(f.state.admissions).includes(f.token)); assert.equal(f.state.reads, 0);
});
it("opaque failures distinguish absence from known integrity/database/lookup failure", async () => {
  const f = await publicShareResolutionFixture();
  f.state.lookupResult = { type: "NotFound" };
  assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "NotFound" });
  f.state.lookupResult = { type: "IntegrityFailure" };
  assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "ServiceUnavailable" });
  f.state.databaseFailure = true;
  assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "ServiceUnavailable" });
});
it("live requests observe revoke and temporary resource withdrawal/restoration", async () => {
  const f = await publicShareResolutionFixture();
  assert.equal((await f.resolver.resolvePage(f.token, "source")).ok, true);
  f.state.resource = { ...f.state.resource, listed: false };
  assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "NotFound" });
  f.state.resource = { ...f.state.resource, listed: true };
  assert.equal((await f.resolver.resolvePage(f.token, "source")).ok, true);
  const grant = f.memory.grants()[0];
  await f.memory.lifecycle.revoke({ context: f.memory.command.context, grantId: grant.grantId });
  assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "NotFound" });
});
it("derives tenant/Product/Branch solely from the digest-resolved grant", async () => {
  const f = await publicShareResolutionFixture(); await f.resolver.resolvePage(f.token, "source");
  assert.deepEqual(f.state.scopeQueries, [{ workspaceId: "p4-workspace", productId: "p4-product", branchId: "p4-branch" }]);
  f.state.resource = { ...f.state.resource, template: { ...f.state.resource.template!, workspaceId: "foreign" } };
  assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "ServiceUnavailable" });
});
for (const changed of [
  { productLifecycle: "Draft" as const }, { branchStatus: "Inactive" as const }, { listed: false },
  { productName: " " }, { productName: "x".repeat(513) }, { template: null },
  { branchRetail: { amountMinor: BigInt(1), currency: "XXX" } },
  { branchRetail: { amountMinor: BigInt(-1), currency: "USD" } },
]) it("rejects currently ineligible public resources: " + Object.keys(changed)[0], async () => {
  const f = await publicShareResolutionFixture(); f.state.resource = { ...f.state.resource, ...changed };
  assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "NotFound" });
});
it("preserves exact base/override/zero prices without leaking internal fields", async () => {
  const f = await publicShareResolutionFixture();
  let result = await f.resolver.resolvePage(f.token, "source");
  assert.ok(result.ok); assert.equal(result.value.retail.amount, "0.00");
  f.state.resource = { ...f.state.resource, branchRetail: { amountMinor: BigInt("9007199254740991"), currency: "USD" } };
  result = await f.resolver.resolvePage(f.token, "source"); assert.ok(result.ok); assert.equal(result.value.retail.amount, "90071992547409.91");
  const view = publicShareView(result.value, f.token, "en")!; const json = JSON.stringify(view);
  for (const forbidden of ["workspaceId", "productId", "branchId", "grantId", "valueType", "storageKey", "wholesale", "referenceCost", "p4-workspace", "p4-spec"]) assert.ok(!json.includes(forbidden));
  assert.deepEqual(Object.keys(view).sort(), ["mainImage", "productName", "retail", "specifications"]);
});
it("keeps Boolean semantic until Presentation and localizes both locales", async () => {
  const f = await publicShareResolutionFixture();
  f.state.resource = { ...f.state.resource,
    definitions: f.state.resource.definitions.map(d => ({ ...d, valueType: "Boolean" as const })),
    specificationValues: [ProductSpecificationValue.create({ specificationFieldId: "p4-spec", value: false })] };
  const result = await f.resolver.resolvePage(f.token, "source"); assert.ok(result.ok);
  assert.equal(result.value.specifications[0].value, false); assert.equal(result.value.specifications[0].valueType, "Boolean");
  assert.equal(publicShareView(result.value, f.token, "en")!.specifications[0].value, "No");
  assert.equal(publicShareView(result.value, f.token, "ar")!.specifications[0].value, "لا");
});
for (const type of ["Missing", "Unavailable"] as const) it("degrades page image only but reports media " + type, async () => {
  const f = await publicShareResolutionFixture(); f.withImage(); f.state.readResult = { type };
  const page = await f.resolver.resolvePage(f.token, "source"); assert.ok(page.ok); assert.equal(page.value.hasMainImage, false);
  assert.deepEqual(await f.resolver.resolveMedia(f.token, "source"), { ok: false, error: type === "Missing" ? "NotFound" : "ServiceUnavailable" });
  assert.equal(f.state.releases, 2);
});
it("requires byte/concurrency reservation and always releases native read leases", async () => {
  const f = await publicShareResolutionFixture(); f.withImage(); f.state.decisions.MediaRead = { type: "Allowed" };
  assert.deepEqual(await f.resolver.resolveMedia(f.token, "source"), { ok: false, error: "ServiceUnavailable" }); assert.equal(f.state.reads, 0);
  delete f.state.decisions.MediaRead; f.state.readFailure = true;
  assert.deepEqual(await f.resolver.resolveMedia(f.token, "source"), { ok: false, error: "ServiceUnavailable" }); assert.equal(f.state.releases, 1);
});
it("reads image independently, rejects foreign binding and does not serialize storage metadata", async () => {
  const f = await publicShareResolutionFixture(); f.withImage();
  const media = await f.resolver.resolveMedia(f.token, "source"); assert.ok(media.ok); assert.equal(media.value.bytes.byteLength, 12);
  const page = await f.resolver.resolvePage(f.token, "source"); assert.ok(page.ok);
  assert.ok(publicShareView(page.value, f.token, "ar")!.mainImage!.src.endsWith("/media"));
  f.state.media = { ...f.state.media!, workspaceId: "foreign" };
  assert.deepEqual(await f.resolver.resolveMedia(f.token, "source"), { ok: false, error: "ServiceUnavailable" });
});
it("fails closed on unknown, corrupt or missing durable lookup coverage before digest lookup", async () => {
  const f = await publicShareResolutionFixture();
  for (const type of ["Unavailable", "IntegrityFailure"] as const) {
    f.state.keyInspection = { type };
    assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "ServiceUnavailable" });
  }
  for (const version of [2, 0, NaN, Number.MAX_SAFE_INTEGER + 1]) {
    f.state.keyInspection = { type: "Inspected", evidence: { lookupVersions: [version], encryptionVersions: [],
      inspectedAt: new Date("2026-10-22"), source: "PostgreSqlPublicProductShareGrants", scope: "ServiceWide", consistency: "StatementSnapshot" } };
    assert.deepEqual(await f.resolver.resolvePage(f.token, "source"), { ok: false, error: "ServiceUnavailable" });
  }
  assert.equal(f.state.lookups, 0);
});
it("public lookup does not require encryption readiness or bearer decryption", async () => {
  const { createPublicShareCryptoRuntime } = await import("../infrastructure/public-share-crypto-runtime");
  const { environment } = await import("../infrastructure/crypto/public-share-crypto.test-fixtures");
  const runtime = createPublicShareCryptoRuntime({ ...environment(), QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON: undefined });
  assert.equal(runtime.readiness.encryption, "UNAVAILABLE"); assert.equal(runtime.readiness.lookup, "READY");
  const f = await publicShareResolutionFixture();
  const resolver = new ResolvePublicProductShare(f.snapshots, runtime.lookupDigest, f.admission, f.reader);
  assert.equal((await resolver.resolvePage(f.token, "source")).ok, true);
});

it("keeps Page text when the image reader or its lease cleanup throws", async () => {
  for (const flag of ["readFailure", "releaseFailure"] as const) {
    const f = await publicShareResolutionFixture(); f.withImage(); f.state[flag] = true;
    const page = await f.resolver.resolvePage(f.token, "source");
    assert.ok(page.ok); assert.equal(page.value.hasMainImage, false); assert.equal(f.state.releases, 1);
    assert.deepEqual(await f.resolver.resolveMedia(f.token, "source"), { ok: false, error: "ServiceUnavailable" });
    assert.equal(f.state.releases, 2);
  }
});
