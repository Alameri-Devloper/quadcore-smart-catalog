import assert from "node:assert/strict";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import { createCatalogDatabaseConnection, type CatalogDatabase } from "../../../infrastructure/persistence/database";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../infrastructure/persistence/integration-test-database-safety";
import { PostgreSqlProductRepository } from "../../../infrastructure/persistence/postgresql-product.repository";
import {
  catalogProductEntryAuditRecords,
  catalogProductEntrySubmissionMediaOperations,
  catalogProductEntrySubmissions,
  catalogProducts,
} from "../../../infrastructure/persistence/schema";
import { ProductPublicationRequirements } from "../../../types/product-publication-requirements.value-object";
import { CatalogId, ProductId, WorkspaceId } from "../../../types/product-identity.value-object";
import { Product } from "../../../types/product.aggregate";
import { ProductCode } from "../../../types/product-code.value-object";
import { ProductEntryActorId, PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "../../application/product-entry-execution-context";
import { SubmitProductEntryUseCase } from "../../application/submit-product-entry.use-case";
import { createProductEntryMediaPlan } from "../../domain/product-entry-media-plan";
import { ProductEntrySubmissionId, RequestFingerprint } from "../../domain/product-entry-submission";
import { PostgreSqlProductEntryMediaPlanRepository } from "./postgresql-product-entry-media-plan.repository";
import { PostgreSqlProductEntrySubmissionRepository } from "./postgresql-product-entry-submission.repository";
import { PostgreSqlProductEntryUnitOfWork } from "./postgresql-product-entry-unit-of-work";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createCatalogDatabaseConnection(connectionUrl!);
const workspaceId = WorkspaceId.create("entry-workspace-a");
const otherWorkspaceId = WorkspaceId.create("entry-workspace-b");
const now = new Date("2026-08-03T10:00:00.000Z");

const context = (workspace = workspaceId): ProductEntryExecutionContext => ({
  workspaceId: workspace,
  actorId: ProductEntryActorId.create("actor-a"),
  permissions: new Set([PRODUCT_ENTRY_PERMISSIONS.create, PRODUCT_ENTRY_PERMISSIONS.edit, PRODUCT_ENTRY_PERMISSIONS.read]),
});

const command = (overrides: Record<string, unknown> = {}) => ({
  submissionId: "submission-a",
  mode: "Create",
  productId: null,
  expectedProductRevision: null,
  draft: { catalogId: "catalog-a", commercialDetails: { productName: "Ready" }, specificationValues: [] },
  mediaOperations: [{
    operationId: "add-a", operationType: "Add", sequence: 0, mediaId: null,
    requestedDisplayOrder: 0, selectedAsCover: true, expectedSourceSha256: "a".repeat(64),
    expectedSourceByteLength: 25, finalOrder: 4,
  }],
  ...overrides,
});

const createUseCase = (productId = "entry-product-a") => new SubmitProductEntryUseCase({
  unitOfWork: new PostgreSqlProductEntryUnitOfWork(
    connection.database,
    { allocate: async () => ProductId.create(productId) },
    { allocate: async () => ProductCode.create("GENERATED-ENTRY-CODE") },
  ),
  requirementsResolver: { resolve: async () => ProductPublicationRequirements.create({ commercial: ["ProductName"] }) },
  clock: { now: () => new Date(now) },
});

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => {
  await connection.database.execute(sql`
    TRUNCATE TABLE
      catalog_product_entry_submission_media_operations,
      catalog_product_entry_audit_records,
      catalog_product_entry_submissions,
      catalog_products
    CASCADE
  `);
});
after(async () => connection.close());

const claimInOwnTransaction = (workspace: WorkspaceId, fingerprint: string) =>
  connection.database.transaction(async (transaction) => new PostgreSqlProductEntrySubmissionRepository(
    transaction as unknown as CatalogDatabase,
  ).claim({
    workspaceId: workspace,
    submissionId: ProductEntrySubmissionId.create("concurrent-submission"),
    requestFingerprint: RequestFingerprint.create(fingerprint),
    mode: "Create",
    productId: null,
    claimedAt: now,
  }));

describe("PostgreSQL Product Entry Submission claims", () => {
  it("persists one claim and maps it back into the domain", async () => {
    const repository = new PostgreSqlProductEntrySubmissionRepository(connection.database);
    const result = await repository.claim({
      workspaceId,
      submissionId: ProductEntrySubmissionId.create("submission-a"),
      requestFingerprint: RequestFingerprint.create("a".repeat(64)),
      mode: "Create",
      productId: null,
      claimedAt: now,
    });
    assert.equal(result.type, "Claimed");
    const existing = await repository.findById(workspaceId, ProductEntrySubmissionId.create("submission-a"));
    assert.equal(existing?.status, "Claimed");
    assert.equal(existing?.workspaceId.value, workspaceId.value);
  });

  it("resolves concurrent same-fingerprint claims idempotently", async () => {
    const results = await Promise.all([
      claimInOwnTransaction(workspaceId, "a".repeat(64)),
      claimInOwnTransaction(workspaceId, "a".repeat(64)),
    ]);
    assert.equal(results.filter((result) => result.type === "Claimed").length, 1);
    assert.equal(results.filter((result) => result.type === "Existing").length, 1);
  });

  it("resolves concurrent different-fingerprint claims with one winner and one conflict", async () => {
    const results = await Promise.all([
      claimInOwnTransaction(workspaceId, "a".repeat(64)),
      claimInOwnTransaction(workspaceId, "b".repeat(64)),
    ]);
    assert.equal(results.filter((result) => result.type === "Claimed").length, 1);
    assert.equal(results.filter((result) => result.type === "FingerprintConflict").length, 1);
  });

  it("isolates the same SubmissionId across Workspaces", async () => {
    const results = await Promise.all([
      claimInOwnTransaction(workspaceId, "a".repeat(64)),
      claimInOwnTransaction(otherWorkspaceId, "b".repeat(64)),
    ]);
    assert.ok(results.every((result) => result.type === "Claimed"));
  });
});

describe("PostgreSQL Product Entry Unit of Work", () => {
  it("commits Product, Submission, Media Plan, and Audit together", async () => {
    const result = await createUseCase().execute(context(), command());
    assert.equal(result.type, "Accepted");
    const [products, submissions, operations, audits] = await Promise.all([
      connection.database.select().from(catalogProducts),
      connection.database.select().from(catalogProductEntrySubmissions),
      connection.database.select().from(catalogProductEntrySubmissionMediaOperations),
      connection.database.select().from(catalogProductEntryAuditRecords),
    ]);
    assert.deepEqual([products.length, submissions.length, operations.length, audits.length], [1, 1, 1, 4]);
    assert.equal(submissions[0].status, "ProductSaved");
    assert.equal(operations[0].finalOrder, 4);
  });

  it("rolls back every write after forced Audit persistence failure", async () => {
    await connection.database.execute(sql`
      CREATE OR REPLACE FUNCTION qsc_test_reject_product_entry_audit()
      RETURNS trigger LANGUAGE plpgsql AS $function$
      BEGIN
        RAISE EXCEPTION 'forced Product Entry audit failure';
      END;
      $function$
    `);
    await connection.database.execute(sql`
      CREATE TRIGGER qsc_test_reject_product_entry_audit_trigger
      BEFORE INSERT ON catalog_product_entry_audit_records
      FOR EACH ROW EXECUTE FUNCTION qsc_test_reject_product_entry_audit()
    `);
    try {
      await assert.rejects(createUseCase().execute(context(), command()));
      for (const table of [catalogProducts, catalogProductEntrySubmissions, catalogProductEntrySubmissionMediaOperations, catalogProductEntryAuditRecords]) {
        assert.equal((await connection.database.select().from(table)).length, 0);
      }
    } finally {
      await connection.database.execute(sql`DROP TRIGGER IF EXISTS qsc_test_reject_product_entry_audit_trigger ON catalog_product_entry_audit_records`);
      await connection.database.execute(sql`DROP FUNCTION IF EXISTS qsc_test_reject_product_entry_audit()`);
    }
  });

  it("rolls back claim and Media Plan after Product Revision conflict", async () => {
    const product = Product.create({
      workspaceId,
      productId: ProductId.create("existing-product"),
      catalogId: CatalogId.create("catalog-a"),
      createdAt: now,
    });
    await new PostgreSqlProductRepository(connection.database).create(product);
    const result = await createUseCase().execute(context(), command({
      mode: "Edit",
      productId: "existing-product",
      expectedProductRevision: 1,
      draft: { catalogId: null, commercialDetails: {}, specificationValues: [] },
    }));
    assert.equal(result.type, "ProductRevisionConflict");
    assert.equal((await connection.database.select().from(catalogProductEntrySubmissions)).length, 0);
    assert.equal((await connection.database.select().from(catalogProductEntrySubmissionMediaOperations)).length, 0);
    assert.equal((await connection.database.select().from(catalogProducts)).length, 1);
  });

  it("returns ProductNotFound for foreign Product ownership without persisting a claim", async () => {
    const foreign = Product.create({
      workspaceId: otherWorkspaceId,
      productId: ProductId.create("foreign-product"),
      catalogId: CatalogId.create("catalog-a"),
      createdAt: now,
    });
    await new PostgreSqlProductRepository(connection.database).create(foreign);
    const result = await createUseCase().execute(context(), command({
      mode: "Edit",
      productId: "foreign-product",
      expectedProductRevision: 0,
      draft: { catalogId: null, commercialDetails: {}, specificationValues: [] },
    }));
    assert.deepEqual(result, { type: "ProductNotFound", productId: "foreign-product" });
    assert.equal((await connection.database.select().from(catalogProductEntrySubmissions)).length, 0);
  });
});

describe("PostgreSQL Product Entry constraints and mapping", () => {
  it("enforces unique operation identity and sequence", async () => {
    await createUseCase().execute(context(), command());
    const existing = (await connection.database.select().from(catalogProductEntrySubmissionMediaOperations))[0];
    await assert.rejects(connection.database.insert(catalogProductEntrySubmissionMediaOperations).values({
      ...existing,
      operationId: "different-operation",
    }));
    await assert.rejects(connection.database.insert(catalogProductEntrySubmissionMediaOperations).values(existing));
  });

  it("persists finalOrder independently and rehydrates operations by sequence", async () => {
    const submissionRepository = new PostgreSqlProductEntrySubmissionRepository(connection.database);
    const submissionId = ProductEntrySubmissionId.create("plan-submission");
    await submissionRepository.claim({ workspaceId, submissionId, requestFingerprint: RequestFingerprint.create("a".repeat(64)), mode: "Create", productId: null, claimedAt: now });
    const plan = createProductEntryMediaPlan([
      {
        workspaceId, submissionId, operationId: "add-a", operationType: "Add", sequence: 0, mediaId: null,
        requestedDisplayOrder: 7, selectedAsCover: false, expectedSourceSha256: "a".repeat(64), expectedSourceByteLength: 9, finalOrder: 3, createdAt: now,
      },
      {
        workspaceId, submissionId, operationId: "remove-a", operationType: "Remove", sequence: 1, mediaId: "old-media",
        requestedDisplayOrder: null, selectedAsCover: false, expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: null, createdAt: now,
      },
    ]);
    const repository = new PostgreSqlProductEntryMediaPlanRepository(connection.database);
    await repository.save(plan);
    const rehydrated = await repository.findBySubmission(workspaceId, submissionId);
    assert.deepEqual(rehydrated.map((operation) => [operation.sequence, operation.finalOrder]), [[0, 3], [1, null]]);
  });

  it("rejects a foreign Product FK and preserves composite Workspace ownership", async () => {
    const foreign = Product.create({ workspaceId: otherWorkspaceId, productId: ProductId.create("foreign"), catalogId: CatalogId.create("catalog-a"), createdAt: now });
    await new PostgreSqlProductRepository(connection.database).create(foreign);
    await assert.rejects(connection.database.insert(catalogProductEntrySubmissions).values({
      workspaceId: workspaceId.value,
      submissionId: "foreign-link",
      requestFingerprint: "a".repeat(64),
      productId: foreign.identity.productId.value,
      mode: "Edit",
      status: "Claimed",
      productRevision: null,
      mediaWorkflowId: null,
      productSaveReceipt: null,
      createdAt: now,
      updatedAt: now,
    }));
  });

  it("enforces non-empty identities and Edit Product linkage in PostgreSQL", async () => {
    const base = {
      workspaceId: workspaceId.value,
      requestFingerprint: "a".repeat(64),
      productId: null,
      mode: "Create",
      status: "Claimed",
      productRevision: null,
      mediaWorkflowId: null,
      productSaveReceipt: null,
      createdAt: now,
      updatedAt: now,
    };
    await assert.rejects(connection.database.insert(catalogProductEntrySubmissions).values({ ...base, submissionId: "" }));
    await assert.rejects(connection.database.insert(catalogProductEntrySubmissions).values({ ...base, submissionId: "edit-without-product", mode: "Edit" }));
  });

  it("applies and exposes the generated migration tables in the dedicated test database", async () => {
    const result = await connection.database.execute<{ submissions: string | null; operations: string | null; audits: string | null }>(sql`
      SELECT
        to_regclass('catalog_product_entry_submissions')::text AS submissions,
        to_regclass('catalog_product_entry_submission_media_operations')::text AS operations,
        to_regclass('catalog_product_entry_audit_records')::text AS audits
    `);
    assert.deepEqual(result.rows[0], {
      submissions: "catalog_product_entry_submissions",
      operations: "catalog_product_entry_submission_media_operations",
      audits: "catalog_product_entry_audit_records",
    });
  });
});
