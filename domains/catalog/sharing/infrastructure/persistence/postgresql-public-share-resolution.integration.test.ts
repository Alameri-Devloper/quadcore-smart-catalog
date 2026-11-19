import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { writeFile } from "node:fs/promises";
import { publicSharePostgresFixture } from "../../mock/public-share-postgres.fixture";
import { publicShareMediaFixture } from "../../mock/public-share-media.fixture";
import { PostgreSqlPublicShareReadSnapshot } from "./postgresql-public-share-read-snapshot";
import { ResolvePublicProductShare } from "../../application/resolve-public-product-share";
import { LocalPublicShareMediaReader } from "../media/local-public-share-media-reader";
import { createPublicShareMediaGet } from "../http/public-share-resolution-http";
import { publicShareView } from "../../presentation/public-share-view";
import type { PublicShareAdmissionPort } from "../../ports/public-share-admission.port";
import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import type { PublicShareReadSnapshotPort } from "../../ports/public-share-resolution.port";

describe("P6 real PostgreSQL live anonymous resolution", { skip: !process.env.TEST_DATABASE_URL }, () => {
  if (new URL(process.env.TEST_DATABASE_URL!).pathname !== "/qsc_p6_public_resolution_test_20261022") throw Error("P6RequiresItsOwnIsolatedDatabase");
  const f = publicSharePostgresFixture("p6-public-resolution");
  const snapshots = new PostgreSqlPublicShareReadSnapshot(f.connection.database);
  const admission: PublicShareAdmissionPort = { admit: async input => ({ type: "Allowed",
    ...(input.phase === "MediaRead" ? { release: async () => undefined } : {}) }) };
  const resolver = (work: PublicShareReadSnapshotPort = snapshots, root?: string) =>
    new ResolvePublicProductShare(work, f.runtime.lookupDigest, admission, new LocalPublicShareMediaReader(root));
  const issue = async () => { const result = await f.lifecycle.issue(f.command); if (!result.ok) throw Error("SyntheticIssueFailed"); return result.value.url.split("/").at(-1)!; };
  before(async () => { await f.migrate(); });
  beforeEach(async () => { await f.seed(); });
  after(async () => { await f.connection.close(); });
  it("uses actual read-only REPEATABLE READ transactions", async () => {
    let isolation: unknown, readOnly: unknown;
    const instrumented = { transaction: (work: Parameters<PlatformDatabase["transaction"]>[0], config: Parameters<PlatformDatabase["transaction"]>[1]) =>
      f.connection.database.transaction(async tx => {
        isolation = (await tx.execute(sql`SHOW transaction_isolation`)).rows[0].transaction_isolation;
        readOnly = (await tx.execute(sql`SHOW transaction_read_only`)).rows[0].transaction_read_only;
        return work(tx);
      }, config) } as PlatformDatabase;
    await new PostgreSqlPublicShareReadSnapshot(instrumented).execute(async () => undefined);
    assert.equal(isolation, "repeatable read"); assert.equal(readOnly, "on");
  });
  it("fails closed when an active persisted lookup version is not configured", async () => {
    const token = await issue();
    await f.execute(sql`UPDATE catalog_public_product_share_grants SET lookup_key_version=2 WHERE workspace_id='p4-workspace' AND revoked_at IS NULL`);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "ServiceUnavailable" });
    await f.execute(sql`UPDATE catalog_public_product_share_grants SET lookup_key_version=1 WHERE workspace_id='p4-workspace' AND revoked_at IS NULL`);
    assert.equal((await resolver().resolvePage(token, "source")).ok, true);
  });
  it("returns the safe live projection and preserves source anonymity", async () => {
    const token = await issue(), result = await resolver().resolvePage(token, "server-source");
    assert.ok(result.ok); assert.equal(result.value.productName, "منتج Product"); assert.equal(result.value.retail.amount, "0.00");
    const view = publicShareView(result.value, token, "en")!;
    assert.equal(view.specifications[0].value, "Actual value");
    for (const field of ["workspaceId", "productId", "branchId", "grantId", "valueType", "storageRootKey", "wholesale", "referenceCost", "actorId"])
      assert.ok(!JSON.stringify(view).includes(field));
  });
  it("keeps actual stored Wholesale prices private and independent of Retail", async () => {
    const stored = async () => (await f.execute(sql`SELECT retail_price_minor::text AS retail,retail_price_currency AS retail_currency,
      wholesale_price_minor::text AS wholesale,wholesale_price_currency AS wholesale_currency FROM catalog_products
      WHERE workspace_id='p4-workspace' AND product_id='p4-product'`)).rows;
    assert.deepEqual(await stored(), [{ retail:"0", retail_currency:"USD", wholesale:"73129", wholesale_currency:"USD" }]);
    const token = await issue();
    const verify = async () => {
      const result = await resolver().resolvePage(token, "source"); assert.ok(result.ok);
      assert.deepEqual(result.value.retail, {amount:"0.00",currency:"USD"});
      for (const locale of ["en","ar"] as const) {
        const view = publicShareView(result.value, token, locale); assert.ok(view);
        assert.deepEqual(Object.keys(view).sort(), ["mainImage","productName","retail","specifications"]);
        const serialized = JSON.stringify({projection:result.value,view});
        for (const marker of ["wholesale","73129","731.29","95237","952.37","86421","864.21"]) assert.ok(!serialized.includes(marker));
      }
    };
    await verify();
    await f.execute(sql`UPDATE catalog_products SET wholesale_price_minor=95237 WHERE workspace_id='p4-workspace' AND product_id='p4-product'`);
    assert.deepEqual(await stored(), [{ retail:"0", retail_currency:"USD", wholesale:"95237", wholesale_currency:"USD" }]);
    await verify();
  });
  it("observes current template visibility and restoration without replacing the grant", async () => {
    const token = await issue();
    await f.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility='internal' WHERE workspace_id='p4-workspace'`);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "NotFound" });
    await f.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility='public' WHERE workspace_id='p4-workspace'`);
    assert.equal((await resolver().resolvePage(token, "source")).ok, true);
    await f.execute(sql`UPDATE catalog_specification_definitions SET status='Inactive' WHERE workspace_id='p4-workspace'`);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "NotFound" });
  });
  it("uses exact Retail override/absence fallback without foreign or sensitive price fields", async () => {
    const token = await issue();
    await f.execute(sql`UPDATE catalog_products SET retail_price_minor=12345,retail_price_currency='USD' WHERE workspace_id='p4-workspace'`);
    let result = await resolver().resolvePage(token, "source"); assert.ok(result.ok); assert.equal(result.value.retail.amount, "123.45");
    await f.execute(sql`INSERT INTO catalog_product_branch_price_overrides(workspace_id,branch_id,product_id,price_type,amount_minor,currency,revision,created_at,updated_at)
      VALUES('p4-workspace','p4-branch','p4-product','Retail',0,'USD',1,clock_timestamp(),clock_timestamp())`);
    result = await resolver().resolvePage(token, "source"); assert.ok(result.ok); assert.equal(result.value.retail.amount, "0.00");
    await f.execute(sql`UPDATE catalog_product_branch_price_overrides SET currency='XXX' WHERE workspace_id='p4-workspace'`);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "NotFound" });
  });
  it("isolates scope and reflects branch/listing changes on subsequent reads", async () => {
    const token = await issue();
    await f.execute(sql`UPDATE catalog_products SET product_name='Foreign secret' WHERE workspace_id='p4-foreign'`);
    const result = await resolver().resolvePage(token, "source"); assert.ok(result.ok); assert.equal(result.value.productName, "منتج Product");
    await f.execute(sql`UPDATE workspace_branch_references SET status='Inactive' WHERE workspace_id='p4-workspace' AND branch_id='p4-branch'`);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "NotFound" });
    await f.execute(sql`UPDATE workspace_branch_references SET status='Active' WHERE workspace_id='p4-workspace' AND branch_id='p4-branch'`);
    await f.execute(sql`DELETE FROM catalog_branch_product_listings WHERE workspace_id='p4-workspace' AND branch_id='p4-branch'`);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "NotFound" });
  });
  it("keeps one real snapshot across a concurrent eligibility commit, then observes withdrawal", async () => {
    const token = await issue(); let reached!: () => void, release!: () => void;
    const atLookup = new Promise<void>(resolve => { reached = resolve; }), barrier = new Promise<void>(resolve => { release = resolve; });
    const delayed: PublicShareReadSnapshotPort = { execute: work => snapshots.execute(context => work({ ...context,
      grants: { findByDigestCandidates: async candidates => { const result = await context.grants.findByDigestCandidates(candidates); reached(); await barrier; return result; } },
    })) };
    const oldRead = resolver(delayed).resolvePage(token, "source"); await atLookup;
    try { await f.execute(sql`UPDATE catalog_branch_product_listings SET listing_status='Unlisted' WHERE workspace_id='p4-workspace' AND product_id='p4-product' AND branch_id='p4-branch'`); }
    finally { release(); }
    const old = await oldRead; assert.ok(old.ok);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "NotFound" });
  });
  it("allows an already-authorized snapshot to finish across revoke but rejects the next request", async () => {
    const token = await issue(); let reached!: () => void, release!: () => void;
    const atLookup = new Promise<void>(resolve => { reached = resolve; }), barrier = new Promise<void>(resolve => { release = resolve; });
    const delayed: PublicShareReadSnapshotPort = { execute: work => snapshots.execute(context => work({ ...context,
      grants: { findByDigestCandidates: async candidates => { const result = await context.grants.findByDigestCandidates(candidates); reached(); await barrier; return result; } },
    })) };
    const oldRead = resolver(delayed).resolvePage(token, "source"); await atLookup;
    try {
      const rows = await f.execute(sql`SELECT grant_id FROM catalog_public_product_share_grants WHERE workspace_id='p4-workspace'`);
      const revoked = await f.lifecycle.revoke({ context: f.command.context, grantId: String(rows.rows[0].grant_id) }); assert.ok(revoked.ok);
    } finally { release(); }
    assert.equal((await oldRead).ok, true);
    assert.deepEqual(await resolver().resolvePage(token, "source"), { ok: false, error: "NotFound" });
  });
  it("independently authorizes real current-main media and degrades missing/corrupt files only", async () => {
    const token = await issue(), media = await publicShareMediaFixture("p4-workspace", "p4-product");
    await f.execute(sql`INSERT INTO catalog_product_media_roots(workspace_id,product_id,storage_root_key,created_at)
      VALUES('p4-workspace','p4-product',${media.input.storageRootKey},clock_timestamp())`);
    await f.execute(sql`INSERT INTO catalog_product_images(workspace_id,product_id,product_image_id,storage_key,position,is_main,checksum_sha256,mime_type,media_created_at,media_created_by)
      VALUES('p4-workspace','p4-product','p6-image',${media.input.storageKey},0,true,${media.input.expectedSha256},'image/webp',clock_timestamp(),'synthetic-operator')`);
    const service = resolver(snapshots, media.root), get = createPublicShareMediaGet(service, { resolve: async () => "trusted-source" });
    const request = new Request("http://localhost/share/synthetic/media");
    let response = await get(request, token); assert.equal(response.status, 200);
    assert.deepEqual(new Uint8Array(await response.arrayBuffer()), new Uint8Array(media.bytes));
    await writeFile(media.target, "corrupt synthetic fixture");
    response = await get(request, token); assert.equal(response.status, 404); assert.equal(await response.text(), "");
    const text = await service.resolvePage(token, "source"); assert.ok(text.ok); assert.equal(text.value.hasMainImage, false);
    await writeFile(media.target, media.bytes);
    await f.execute(sql`UPDATE catalog_product_images SET checksum_sha256=NULL,mime_type=NULL,media_created_at=NULL,media_created_by=NULL WHERE workspace_id='p4-workspace'`);
    assert.equal((await get(request, token)).status, 404);
    assert.equal((await service.resolvePage(token, "source")).ok, true);
  });
});