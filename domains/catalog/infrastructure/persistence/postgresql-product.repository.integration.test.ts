import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { and, eq, sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { PRODUCT_CREATE_OUTCOMES, PRODUCT_UPDATE_OUTCOMES } from "../../repositories/product-repository-results";
import { ProductTypeId } from "../../types/product-classification.value-object";
import { CatalogId, ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductRevision } from "../../types/product-revision.value-object";
import { Product } from "../../types/product.aggregate";
import { createCatalogDatabaseConnection } from "./database";
import { assertSafeIntegrationTestDatabaseUrl } from "./integration-test-database-safety";
import { PostgreSqlProductRepository } from "./postgresql-product.repository";
import { catalogProductImages, catalogProducts, catalogProductSpecificationValues } from "./schema";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);

const connection = createCatalogDatabaseConnection(connectionUrl!);
const repository = new PostgreSqlProductRepository(connection.database);

const identity = (workspace = "workspace-a", product = "product-a", catalog = "catalog-a") => ({
  workspaceId: WorkspaceId.create(workspace),
  productId: ProductId.create(product),
  catalogId: CatalogId.create(catalog),
});

const completeProduct = (
  workspace = "workspace-a",
  product = "product-a",
  code: string | undefined = " qc-lap-001 ",
  revision = 4,
) => Product.rehydrate({
  ...identity(workspace, product),
  lifecycleState: "Draft",
  revision,
  createdAt: new Date("2026-07-01T08:00:00.000Z"),
  updatedAt: new Date("2026-07-02T09:30:00.000Z"),
  classification: {
    categoryId: "category-laptops",
    productTypeId: ProductTypeId.create("product-type-gaming-laptop"),
    deviceClassId: "device-class-gaming",
    conditionId: "condition-new",
    availabilityStatusId: "available",
  },
  commercialDetails: {
    productName: "Lenovo LOQ 15",
    productCode: code,
    productModelId: "model-loq-15",
    brandId: "brand-lenovo",
    isHighlighted: true,
    pricing: {
      wholesalePrice: { amountMinor: 99500, currency: "USD" },
      retailPrice: { amountMinor: 119900, currency: "USD" },
    },
  },
  specificationValues: [
    { specificationFieldId: "cpu", value: "Intel Core i7" },
    { specificationFieldId: "ram-gb", value: 16 },
    { specificationFieldId: "backlit", value: true },
  ],
  images: [
    { productImageId: "image-main", storageReference: "stable/main.webp", order: 0, isMain: true, altText: "Front" },
    { productImageId: "image-gallery", storageReference: "stable/gallery-01.webp", order: 1, isMain: false },
  ],
});

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => {
  await connection.database.execute(sql`TRUNCATE TABLE catalog_products CASCADE`);
});
after(async () => connection.close());

describe("PostgreSqlProductRepository create and find", () => {
  it("atomically persists and completely rehydrates the Aggregate at any safe Revision", async () => {
    const product = completeProduct();
    const result = await repository.create(product);
    assert.equal(result.outcome, PRODUCT_CREATE_OUTCOMES.created);
    assert.equal(result.persistedRevision.value, 4);
    const found = await repository.findById(product.identity.workspaceId, product.identity.productId);
    assert.ok(found);
    assert.equal(found.events.length, 0);
    assert.equal(found.identity.catalogId.value, "catalog-a");
    assert.equal(found.lifecycleState.value, "Draft");
    assert.equal(found.revision.value, 4);
    assert.equal(found.createdAt.toISOString(), "2026-07-01T08:00:00.000Z");
    assert.equal(found.updatedAt.toISOString(), "2026-07-02T09:30:00.000Z");
    assert.equal(found.classification?.productTypeId?.value, "product-type-gaming-laptop");
    assert.equal(found.commercialDetails?.productCode?.value, "QC-LAP-001");
    assert.equal(found.commercialDetails?.pricing?.retailPrice?.amountMinor, 119900);
    assert.deepEqual(found.specificationValues.map((value) => value.value), ["Intel Core i7", 16, true]);
    assert.deepEqual(found.images.map((image) => image.productImageId), ["image-main", "image-gallery"]);
  });

  it("persists Revision 0 Drafts without codes and permits multiple null codes", async () => {
    const first = Product.create({ ...identity("workspace-a", "draft-1"), createdAt: new Date() });
    const second = Product.create({ ...identity("workspace-a", "draft-2"), createdAt: new Date() });
    const eventCount = first.events.length;
    assert.equal((await repository.create(first)).outcome, PRODUCT_CREATE_OUTCOMES.created);
    assert.equal((await repository.create(second)).outcome, PRODUCT_CREATE_OUTCOMES.created);
    assert.equal(first.events.length, eventCount);
    assert.equal((await repository.findById(first.identity.workspaceId, first.identity.productId))?.revision.value, 0);
  });

  it("maps Product identity and canonical workspace ProductCode conflicts", async () => {
    assert.equal((await repository.create(completeProduct())).outcome, PRODUCT_CREATE_OUTCOMES.created);
    assert.equal((await repository.create(completeProduct())).outcome, PRODUCT_CREATE_OUTCOMES.productIdConflict);
    assert.equal((await repository.create(completeProduct("workspace-a", "other", " QC-LAP-001 "))).outcome, PRODUCT_CREATE_OUTCOMES.productCodeConflict);
    assert.equal((await repository.create(completeProduct("workspace-b", "other", "qc-lap-001"))).outcome, PRODUCT_CREATE_OUTCOMES.created);
  });

  it("does not scope ProductCode by Catalog and keeps archived codes reserved", async () => {
    const archived = Product.rehydrate({
      ...identity("workspace-a", "archived", "catalog-one"), lifecycleState: "Archived", revision: 7,
      createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-02-01T00:00:00Z"),
      commercialDetails: { productCode: "RESERVED" },
    });
    await repository.create(archived);
    const conflict = await repository.create(completeProduct("workspace-a", "new", "RESERVED"));
    assert.equal(conflict.outcome, PRODUCT_CREATE_OUTCOMES.productCodeConflict);
  });

  it("returns null for missing or differently scoped Products", async () => {
    await repository.create(completeProduct());
    assert.equal(await repository.findById(WorkspaceId.create("workspace-b"), ProductId.create("product-a")), null);
    assert.equal(await repository.findById(WorkspaceId.create("workspace-a"), ProductId.create("missing")), null);
  });
});

describe("PostgreSqlProductRepository update", () => {
  it("revision-checks the main row and atomically replaces owned collections", async () => {
    const product = completeProduct();
    await repository.create(product);
    product.replaceSpecificationValues([{ specificationFieldId: "storage", value: 1024 }], new Date("2026-07-03T00:00:00Z"));
    product.replaceImages([{ productImageId: "replacement", storageReference: "stable/main.webp", order: 0, isMain: true }], new Date("2026-07-03T00:00:01Z"));
    const result = await repository.update(product, ProductRevision.rehydrate(4));
    assert.equal(result.outcome, PRODUCT_UPDATE_OUTCOMES.updated);
    const found = await repository.findById(product.identity.workspaceId, product.identity.productId);
    assert.deepEqual(found?.specificationValues.map((value) => value.specificationFieldId), ["storage"]);
    assert.deepEqual(found?.images.map((image) => image.productImageId), ["replacement"]);
    assert.equal(found?.revision.value, 6);
  });

  it("distinguishes not-found and stale Revision without overwriting newer state", async () => {
    const missing = completeProduct("workspace-a", "missing");
    assert.equal((await repository.update(missing, ProductRevision.rehydrate(4))).outcome, PRODUCT_UPDATE_OUTCOMES.productNotFound);
    const product = completeProduct();
    await repository.create(product);
    product.updateCommercialDetails({ productName: "Newer", productCode: "QC-LAP-001" }, new Date("2026-07-03T00:00:00Z"));
    await repository.update(product, ProductRevision.rehydrate(4));
    const stale = completeProduct("workspace-a", "product-a", "STALE", 5);
    const conflict = await repository.update(stale, ProductRevision.rehydrate(4));
    assert.equal(conflict.outcome, PRODUCT_UPDATE_OUTCOMES.revisionConflict);
    if (conflict.outcome === PRODUCT_UPDATE_OUTCOMES.revisionConflict) assert.equal(conflict.actualPersistedRevision.value, 5);
    assert.equal((await repository.findById(stale.identity.workspaceId, stale.identity.productId))?.commercialDetails?.productName, "Newer");
  });

  it("maps code changes atomically, permits keeping and clearing the Product's code", async () => {
    const first = completeProduct("workspace-a", "first", "FIRST");
    const second = completeProduct("workspace-a", "second", "SECOND");
    await repository.create(first); await repository.create(second);
    const before = await repository.findById(first.identity.workspaceId, first.identity.productId);
    first.updateCommercialDetails({ productCode: "SECOND" }, new Date("2026-07-03T00:00:00Z"));
    assert.equal((await repository.update(first, ProductRevision.rehydrate(4))).outcome, PRODUCT_UPDATE_OUTCOMES.productCodeConflict);
    const afterConflict = await repository.findById(first.identity.workspaceId, first.identity.productId);
    assert.equal(afterConflict?.commercialDetails?.productCode?.value, "FIRST");
    assert.deepEqual(afterConflict?.specificationValues, before?.specificationValues);
    assert.deepEqual(afterConflict?.images, before?.images);
    first.updateCommercialDetails({ productCode: "FIRST" }, new Date("2026-07-03T00:00:01Z"));
    assert.equal((await repository.update(first, ProductRevision.rehydrate(4))).outcome, PRODUCT_UPDATE_OUTCOMES.updated);
    first.updateCommercialDetails({}, new Date("2026-07-03T00:00:02Z"));
    assert.equal((await repository.update(first, ProductRevision.rehydrate(6))).outcome, PRODUCT_UPDATE_OUTCOMES.updated);
  });

  it("database composite ownership rejects cross-workspace child rows", async () => {
    await repository.create(completeProduct());
    await assert.rejects(connection.database.execute(sql`
      INSERT INTO catalog_product_images
        (workspace_id, product_id, product_image_id, storage_key, position, is_main)
      VALUES ('workspace-b', 'product-a', 'cross', 'none', 9, false)
    `));
    await assert.rejects(connection.database.execute(sql`
      INSERT INTO catalog_product_specification_values
        (workspace_id, product_id, specification_field_id, position, value_type, text_value)
      VALUES ('workspace-b', 'product-a', 'cross', 9, 'string', 'none')
    `));
  });
});

describe("PostgreSQL Product invariant constraints", () => {
  it("rejects non-canonical direct ProductCode writes and still permits null codes", async () => {
    await repository.create(completeProduct());
    for (const code of ["lowercase", " SURROUNDED ", "", "   "]) {
      await assert.rejects(connection.database.execute(sql`
        UPDATE catalog_products SET product_code = ${code}
        WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'
      `));
    }
    await connection.database.execute(sql`
      UPDATE catalog_products SET product_code = NULL
      WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'
    `);
    const second = Product.create({ ...identity("workspace-a", "null-two"), createdAt: new Date() });
    assert.equal((await repository.create(second)).outcome, PRODUCT_CREATE_OUTCOMES.created);
  });

  it("rejects unsupported lifecycle and unsafe Revision values", async () => {
    await repository.create(completeProduct());
    await assert.rejects(connection.database.execute(sql`
      UPDATE catalog_products SET lifecycle_state = 'Deleted'
      WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'
    `));
    for (const revision of [-1, 9007199254740992]) {
      await assert.rejects(connection.database.execute(sql`
        UPDATE catalog_products SET revision = ${revision}
        WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'
      `));
    }
  });

  it("rejects negative and unsafe wholesale and retail Money", async () => {
    await repository.create(completeProduct());
    for (const column of ["wholesale_price_minor", "retail_price_minor"] as const) {
      for (const amount of [-1, 9007199254740992]) {
        const statement = column === "wholesale_price_minor"
          ? sql`UPDATE catalog_products SET wholesale_price_minor = ${amount}, wholesale_price_currency = 'USD' WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'`
          : sql`UPDATE catalog_products SET retail_price_minor = ${amount}, retail_price_currency = 'USD' WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'`;
        await assert.rejects(connection.database.execute(statement));
      }
    }
  });

  it("prevents hidden stale optional-section columns while allowing partial present sections", async () => {
    await repository.create(completeProduct());
    await assert.rejects(connection.database.execute(sql`
      UPDATE catalog_products SET has_classification = false
      WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'
    `));
    await assert.rejects(connection.database.execute(sql`
      UPDATE catalog_products SET has_commercial_details = false
      WHERE workspace_id = 'workspace-a' AND product_id = 'product-a'
    `));
    const partial = Product.rehydrate({
      ...identity("workspace-a", "partial"), lifecycleState: "Draft", revision: 0,
      createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"),
      classification: {}, commercialDetails: {},
    });
    assert.equal((await repository.create(partial)).outcome, PRODUCT_CREATE_OUTCOMES.created);
    assert.ok((await repository.findById(partial.identity.workspaceId, partial.identity.productId))?.classification);
    assert.ok((await repository.findById(partial.identity.workspaceId, partial.identity.productId))?.commercialDetails);
  });

  it("rejects duplicate Specification positions for one Product", async () => {
    await repository.create(completeProduct());
    await assert.rejects(connection.database.execute(sql`
      INSERT INTO catalog_product_specification_values
        (workspace_id, product_id, specification_field_id, position, value_type, text_value)
      VALUES ('workspace-a', 'product-a', 'duplicate-position', 0, 'string', 'duplicate')
    `));
  });
});

describe("PostgreSQL Product transaction rollback", () => {
  it("rolls back main, Specification, and Image rows after a forced child insert failure", async () => {
    await connection.database.execute(sql`DROP TRIGGER IF EXISTS qsc_test_reject_sentinel_specification_trigger ON catalog_product_specification_values`);
    await connection.database.execute(sql`DROP FUNCTION IF EXISTS qsc_test_reject_sentinel_specification()`);
    await connection.database.execute(sql`
      CREATE OR REPLACE FUNCTION qsc_test_reject_sentinel_specification()
      RETURNS trigger LANGUAGE plpgsql AS $function$
      BEGIN
        IF NEW.specification_field_id = '__force_child_failure__' THEN
          RAISE EXCEPTION 'forced test child failure';
        END IF;
        RETURN NEW;
      END;
      $function$
    `);
    await connection.database.execute(sql`
      CREATE TRIGGER qsc_test_reject_sentinel_specification_trigger
      BEFORE INSERT ON catalog_product_specification_values
      FOR EACH ROW EXECUTE FUNCTION qsc_test_reject_sentinel_specification()
    `);
    const product = Product.rehydrate({
      ...identity("workspace-a", "rollback"), lifecycleState: "Draft", revision: 0,
      createdAt: new Date("2026-01-01T00:00:00Z"), updatedAt: new Date("2026-01-01T00:00:00Z"),
      specificationValues: [{ specificationFieldId: "__force_child_failure__", value: "fail" }],
      images: [{ productImageId: "rollback-image", storageReference: "stable/main.webp", order: 0, isMain: true }],
    });
    try {
      await assert.rejects(repository.create(product));
      const productScope = and(eq(catalogProducts.workspaceId, "workspace-a"), eq(catalogProducts.productId, "rollback"));
      const specificationScope = and(eq(catalogProductSpecificationValues.workspaceId, "workspace-a"), eq(catalogProductSpecificationValues.productId, "rollback"));
      const imageScope = and(eq(catalogProductImages.workspaceId, "workspace-a"), eq(catalogProductImages.productId, "rollback"));
      assert.equal((await connection.database.select().from(catalogProducts).where(productScope)).length, 0);
      assert.equal((await connection.database.select().from(catalogProductSpecificationValues).where(specificationScope)).length, 0);
      assert.equal((await connection.database.select().from(catalogProductImages).where(imageScope)).length, 0);
    } finally {
      await connection.database.execute(sql`DROP TRIGGER IF EXISTS qsc_test_reject_sentinel_specification_trigger ON catalog_product_specification_values`);
      await connection.database.execute(sql`DROP FUNCTION IF EXISTS qsc_test_reject_sentinel_specification()`);
    }
  });
});
