import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { count, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { DepartmentStorageSegment } from "../../media/domain/product-media-keys";
import { ProductMediaRoot } from "../../media/domain/product-media-root";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { createCatalogDatabaseConnection } from "./database";
import { assertSafeIntegrationTestDatabaseUrl } from "./integration-test-database-safety";
import { PostgreSqlProductMediaRootRepository } from "./postgresql-product-media-root.repository";
import { catalogProductMediaRoots } from "./schema";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createCatalogDatabaseConnection(connectionUrl);
const repository = new PostgreSqlProductMediaRootRepository(connection.database);

const insertProduct = async (workspaceId: string, productId: string): Promise<void> => {
  await connection.database.execute(sql`
    INSERT INTO catalog_products (
      workspace_id, product_id, catalog_id, lifecycle_state, revision,
      created_at, updated_at, has_classification, has_commercial_details, is_highlighted
    ) VALUES (${workspaceId}, ${productId}, 'catalog-test', 'Draft', 0, NOW(), NOW(), false, false, false)
  `);
};

const root = (workspace: string, product: string): Promise<ProductMediaRoot> => ProductMediaRoot.createNew({
  workspaceId: WorkspaceId.create(workspace),
  productId: ProductId.create(product),
  departmentSegment: DepartmentStorageSegment.unclassified(),
  productName: "Product",
  createdAt: new Date("2026-07-23T00:00:00.000Z"),
});

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => connection.database.execute(sql`TRUNCATE TABLE catalog_product_media_roots, catalog_products CASCADE`));
after(async () => connection.close());

describe("PostgreSQL ProductMediaRoot registry", () => {
  it("creates, strictly rehydrates, finds within Workspace, and isolates other Workspaces", async () => {
    await insertProduct("ws-a", "product-a");
    const expected = await root("ws-a", "product-a");
    assert.equal((await repository.create(expected)).type, "Created");
    const found = await repository.findByProduct(expected.workspaceId, expected.productId);
    assert.equal(found?.storageRootKey.value, expected.storageRootKey.value);
    assert.equal(found?.createdAt.toISOString(), expected.createdAt.toISOString());
    assert.equal(await repository.findByProduct(WorkspaceId.create("ws-b"), expected.productId), null);
  });

  it("returns AlreadyExists for the same Product and creates another Product with its distinct derived root", async () => {
    await insertProduct("ws", "product-a");
    await insertProduct("ws", "product-b");
    const original = await root("ws", "product-a");
    await repository.create(original);
    const same = await repository.create(await root("ws", "product-a"));
    assert.equal(same.type, "AlreadyExists");
    if (same.type === "AlreadyExists") assert.equal(same.existingRoot.storageRootKey.value, original.storageRootKey.value);
    assert.equal((await repository.create(await root("ws", "product-b"))).type, "Created");
  });

  it("maps a real provider-global storage-root collision without tenant identity leakage", async () => {
    await insertProduct("ws-a", "occupying-product");
    await insertProduct("ws-b", "candidate-product");
    const candidate = await root("ws-b", "candidate-product");
    await connection.database.execute(sql`
      INSERT INTO catalog_product_media_roots (workspace_id, product_id, storage_root_key, created_at)
      VALUES ('ws-a', 'occupying-product', ${candidate.storageRootKey.value}, NOW())
    `);
    const result = await repository.create(candidate);
    assert.deepEqual(result, { type: "StorageRootConflict" });
    assert.deepEqual(Object.keys(result), ["type"]);
    assert.equal(JSON.stringify(result).includes("ws-a"), false);
    assert.equal(JSON.stringify(result).includes("occupying-product"), false);
  });

  it("keeps generated provider roots distinct across Workspaces", async () => {
    await insertProduct("ws-a", "product");
    await insertProduct("ws-b", "product");
    const first = await root("ws-a", "product");
    const second = await root("ws-b", "product");
    assert.notEqual(first.storageRootKey.value, second.storageRootKey.value);
    assert.equal((await repository.create(first)).type, "Created");
    assert.equal((await repository.create(second)).type, "Created");
  });

  it("rejects corrupted persisted identity/path combinations during strict rehydration", async () => {
    await insertProduct("ws-a", "product");
    await connection.database.execute(sql`
      INSERT INTO catalog_product_media_roots (workspace_id, product_id, storage_root_key, created_at)
      VALUES ('ws-a', 'product', 'workspaces/wrong/unclassified/product--0123456789abcdef', NOW())
    `);
    await assert.rejects(repository.findByProduct(WorkspaceId.create("ws-a"), ProductId.create("product")));
  });

  it("maps concurrent same-Product creation deterministically", async () => {
    await insertProduct("ws", "product");
    const candidate = await root("ws", "product");
    const results = await Promise.all([repository.create(candidate), repository.create(candidate)]);
    assert.deepEqual(results.map((result) => result.type).sort(), ["AlreadyExists", "Created"]);
  });

  it("enforces canonical storage-key constraints in PostgreSQL", async () => {
    await insertProduct("ws", "product");
    const invalid = [
      "Upper/key",
      "/absolute",
      "trailing/",
      "a//b",
      "a/../b",
      "a\\b",
      "c:/drive",
      "short/root",
      "workspaces/ws/_trash/product--0123456789abcdef",
      "workspaces/ws/phones/product",
      "workspaces/ws/phones/product--0123456789abcdef/nested",
    ];
    for (const key of invalid) {
      await assert.rejects(connection.database.execute(sql`
        INSERT INTO catalog_product_media_roots (workspace_id, product_id, storage_root_key, created_at)
        VALUES ('ws', 'product', ${key}, NOW())
      `));
    }
  });

  it("uses ON DELETE RESTRICT and never backfills roots for existing Products", async () => {
    await insertProduct("ws", "without-root");
    const [countBefore] = await connection.database.select({ value: count() }).from(catalogProductMediaRoots);
    assert.equal(countBefore.value, 0);
    await insertProduct("ws", "with-root");
    await repository.create(await root("ws", "with-root"));
    await assert.rejects(connection.database.execute(sql`DELETE FROM catalog_products WHERE workspace_id = 'ws' AND product_id = 'with-root'`));
  });

  it("records the complete 0000 to 0001 to 0002 migration chain", async () => {
    const result = await connection.database.execute<{ count: number }>(sql`SELECT count(*)::int AS count FROM drizzle.__drizzle_migrations`);
    assert.ok(result.rows[0].count >= 3);
  });
});
