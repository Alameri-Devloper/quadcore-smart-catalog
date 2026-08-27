import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createPlatformDatabaseConnection } from "../../../../../shared/infrastructure/persistence/database";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../infrastructure/persistence/integration-test-database-safety";
import { PostgreSqlDirectProductShareRepository } from "./postgresql-direct-product-share.repository";

const testUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(testUrl, process.env.DATABASE_URL);
const connection = createPlatformDatabaseConnection(testUrl!);
const repository = new PostgreSqlDirectProductShareRepository(connection.database);

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => {
  await connection.database.execute(sql`TRUNCATE TABLE catalog_products CASCADE`);
  await connection.database.execute(sql`TRUNCATE TABLE workspaces CASCADE`);
  await connection.database.execute(sql`
    INSERT INTO workspaces(workspace_id,company_id,workspace_code,display_name,password_recovery_policy,created_at,updated_at) VALUES
      ('share-workspace-a','company-a','share-workspace-a','Workspace A','OwnerManagedOnly','2026-01-01','2026-01-01'),
      ('share-workspace-b','company-b','share-workspace-b','Workspace B','OwnerManagedOnly','2026-01-01','2026-01-01');
    INSERT INTO workspace_branch_references(workspace_id,branch_id,code,display_name,status,sort_order,revision,created_at,updated_at) VALUES
      ('share-workspace-a','share-branch-a','share-branch-a','Sana Branch','Active',0,1,'2026-01-01','2026-01-01'),
      ('share-workspace-b','share-branch-b','share-branch-b','Foreign Branch','Active',0,1,'2026-01-01','2026-01-01');
    INSERT INTO catalog_products(workspace_id,product_id,catalog_id,lifecycle_state,revision,created_at,updated_at,has_classification,has_commercial_details,product_name,product_code,is_highlighted,retail_price_minor,retail_price_currency,wholesale_price_minor,wholesale_price_currency) VALUES
      ('share-workspace-a','share-product-a','catalog-a','Published',1,'2026-01-01','2026-01-01',false,true,'Laptop','LAP-001',false,0,'USD',700,'USD'),
      ('share-workspace-a','share-unlisted','catalog-a','Published',1,'2026-01-01','2026-01-01',false,true,'Dock','DOCK-001',false,50,'USD',40,'USD'),
      ('share-workspace-b','share-product-b','catalog-b','Published',1,'2026-01-01','2026-01-01',false,true,'Foreign','FOREIGN-001',false,999,'USD',900,'USD');
    INSERT INTO catalog_branch_product_listings(workspace_id,branch_id,product_id,listing_status,revision,created_at,updated_at) VALUES
      ('share-workspace-a','share-branch-a','share-product-a','Listed',1,'2026-01-01','2026-01-01'),
      ('share-workspace-a','share-branch-a','share-unlisted','Unlisted',1,'2026-01-01','2026-01-01');
    INSERT INTO inventory_balances(workspace_id,branch_id,product_id,on_hand_quantity,reserved_quantity,damaged_quantity,revision,updated_at) VALUES
      ('share-workspace-a','share-branch-a','share-product-a',10,2,1,1,'2026-01-01');
    INSERT INTO catalog_product_branch_price_overrides(workspace_id,branch_id,product_id,price_type,amount_minor,currency,revision,created_at,updated_at) VALUES
      ('share-workspace-a','share-branch-a','share-product-a','Retail',1250,'YER',1,'2026-01-01','2026-01-01');
    INSERT INTO catalog_product_reference_costs(workspace_id,product_id,amount_minor,currency,revision,created_at,updated_at) VALUES
      ('share-workspace-a','share-product-a',333,'USD',1,'2026-01-01','2026-01-01');
    INSERT INTO catalog_specification_definitions(workspace_id,specification_definition_id,code,display_name,status,sort_order,version,created_at,updated_at,value_type,unit) VALUES
      ('share-workspace-a','share-spec-ram','ram','RAM','Inactive',0,1,'2026-01-01','2026-01-01','Number','GB'),
      ('share-workspace-b','share-spec-ram','ram','Foreign RAM','Active',0,1,'2026-01-01','2026-01-01','Text',NULL);
    INSERT INTO catalog_product_specification_values(workspace_id,product_id,specification_field_id,position,value_type,number_value) VALUES
      ('share-workspace-a','share-product-a','share-spec-ram',2,'number','16');
    INSERT INTO catalog_product_media_roots(workspace_id,product_id,storage_root_key,created_at) VALUES
      ('share-workspace-a','share-product-a','workspaces/share/department/laptop--0123456789abcdef','2026-01-01');
    INSERT INTO catalog_product_images(workspace_id,product_id,product_image_id,storage_key,position,is_main,alt_text,checksum_sha256,mime_type,media_created_at,media_created_by) VALUES
      ('share-workspace-a','share-product-a','share-media-a','workspaces/share/department/laptop--0123456789abcdef/main.webp',0,true,'Front','aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa','image/webp','2026-01-01','actor-a');
  `);
});
after(async () => connection.close());

describe("PostgreSQL direct Product share repository", () => {
  it("uses Branch override and returns only safe availability source data", async () => {
    const value = await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-product-a", branchId: "share-branch-a", priceMode: "Retail" });
    assert.equal(value?.price?.amountMinor, BigInt(1250)); assert.equal(value?.price?.currency, "YER");
    assert.equal(value?.branch?.listingStatus, "Listed"); assert.equal(value?.branch?.availableQuantity, BigInt(7));
  });

  it("inherits Workspace base Wholesale, preserves zero Retail, and distinguishes missing", async () => {
    const wholesale = await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-product-a", branchId: "share-branch-a", priceMode: "Wholesale" });
    assert.equal(wholesale?.price?.amountMinor, BigInt(700)); assert.equal(wholesale?.price?.currency, "USD");
    const retail = await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-product-a", branchId: null, priceMode: "Retail" });
    assert.equal(retail?.price?.amountMinor, BigInt(0)); assert.equal(retail?.branch, null);
    await connection.database.execute(sql`UPDATE catalog_products SET wholesale_price_minor=NULL,wholesale_price_currency=NULL WHERE workspace_id='share-workspace-a' AND product_id='share-product-a'`);
    const missing = await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-product-a", branchId: null, priceMode: "Wholesale" });
    assert.equal(missing?.price, null);
  });

  it("preserves inactive historical specification metadata and approved main media", async () => {
    const value = await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-product-a", branchId: null, priceMode: "Retail" });
    assert.deepEqual(value?.specifications, [{ displayName: "RAM", value: "16", unit: "GB", position: 2 }]);
    assert.equal(value?.mainMedia?.mediaId, "share-media-a"); assert.equal(value?.mainMedia?.mimeType, "image/webp");
  });

  it("isolates foreign Products/Branches and projects Unlisted explicitly", async () => {
    assert.equal(await repository.branchExists("share-workspace-a", "share-branch-b"), false);
    assert.equal(await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-product-b", branchId: null, priceMode: "Retail" }), null);
    const unlisted = await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-unlisted", branchId: "share-branch-a", priceMode: "Retail" });
    assert.equal(unlisted?.branch?.listingStatus, "Unlisted");
  });

  it("never queries or returns Reference Cost through a share price mode", async () => {
    const value = await repository.getShareProduct({ workspaceId: "share-workspace-a", productId: "share-product-a", branchId: null, priceMode: "Retail" });
    const serialized = JSON.stringify(value, (_key, item) => typeof item === "bigint" ? item.toString() : item);
    for (const forbidden of ["referenceCost", "costAmount", "333"]) assert.equal(serialized.includes(forbidden), false);
  });
});
