import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { after, before, beforeEach, describe, it } from "node:test";
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/node-postgres/migrator";
import sharp from "sharp";
import { createCatalogDatabaseConnection } from "../../../infrastructure/persistence/database";
import { assertSafeIntegrationTestDatabaseUrl } from "../../../infrastructure/persistence/integration-test-database-safety";
import {
  catalogProductEntrySubmissionMediaOperations,
  catalogProductEntrySubmissions,
  catalogProductImages,
  catalogProductMediaOperations,
  catalogProductMediaWorkflows,
  catalogProducts,
} from "../../../infrastructure/persistence/schema";
import { LocalProductMediaStorageAdapter } from "../../../media/infrastructure/local-product-media-storage.adapter";
import { SharpProductImageProcessor } from "../../../media/infrastructure/sharp-product-image.processor";
import { DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION } from "../../../media/ports/product-image-processor";
import type { ProductMediaStoragePort } from "../../../media/ports/product-media-storage.port";
import { ProductPublicationRequirements } from "../../../types/product-publication-requirements.value-object";
import { ProductId, WorkspaceId } from "../../../types/product-identity.value-object";
import { ProductCode } from "../../../types/product-code.value-object";
import { GetProductEntrySubmissionMediaStatusUseCase } from "../../application/get-product-entry-submission-media-status.use-case";
import { ProductEntryActorId, PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext } from "../../application/product-entry-execution-context";
import { ProductEntryMediaIdempotencyKeyService } from "../../application/product-entry-media-idempotency-key";
import { SubmitProductEntryUseCase } from "../../application/submit-product-entry.use-case";
import { UploadProductEntrySubmissionMediaUseCase } from "../../application/upload-product-entry-submission-media.use-case";
import { ProductEntryMediaWorkflowCoordinatorAdapter } from "../product-entry-media-workflow-coordinator.adapter";
import { SharpProductEntryMediaSourceVerifier } from "../sharp-product-entry-media-source-verifier";
import { PostgreSqlProductEntryUnitOfWork } from "./postgresql-product-entry-unit-of-work";

const connectionUrl = process.env.TEST_DATABASE_URL;
assertSafeIntegrationTestDatabaseUrl(connectionUrl, process.env.DATABASE_URL);
const connection = createCatalogDatabaseConnection(connectionUrl!);
const workspaceId = WorkspaceId.create("entry-media-workspace-a");
const otherWorkspaceId = WorkspaceId.create("entry-media-workspace-b");
const now = new Date("2026-08-04T12:00:00.000Z");
const processor = new SharpProductImageProcessor();

const context = (workspace = workspaceId): ProductEntryExecutionContext => ({
  workspaceId: workspace,
  actorId: ProductEntryActorId.create("actor-a"),
  permissions: new Set([
    PRODUCT_ENTRY_PERMISSIONS.create,
    PRODUCT_ENTRY_PERMISSIONS.edit,
    PRODUCT_ENTRY_PERMISSIONS.read,
    PRODUCT_ENTRY_PERMISSIONS.mediaUpload,
  ]),
});

const imageFixture = async (): Promise<Uint8Array> => new Uint8Array(await sharp({
  create: { width: 12, height: 8, channels: 3, background: { r: 25, g: 50, b: 75 } },
}).png().toBuffer());

interface SeedInput {
  readonly submissionId?: string;
  readonly productId?: string;
  readonly operationId?: string;
  readonly operationType?: "Add" | "Remove";
  readonly source?: Uint8Array;
}

const seedPhaseOne = async (input: SeedInput = {}) => {
  const source = input.source ?? await imageFixture();
  const submissionId = input.submissionId ?? "submission-a";
  const productId = input.productId ?? "product-a";
  const operationId = input.operationId ?? "add-a";
  const operationType = input.operationType ?? "Add";
  const sha256 = createHash("sha256").update(source).digest("hex");
  const useCase = new SubmitProductEntryUseCase({
    unitOfWork: new PostgreSqlProductEntryUnitOfWork(
      connection.database,
      { allocate: async () => ProductId.create(productId) },
      { allocate: async () => ProductCode.create(`CODE-${productId}`) },
    ),
    requirementsResolver: { resolve: async () => ProductPublicationRequirements.create({ commercial: ["ProductName"] }) },
    clock: { now: () => new Date(now) },
  });
  const result = await useCase.execute(context(), {
    submissionId,
    mode: "Create",
    productId: null,
    expectedProductRevision: null,
    draft: { catalogId: "catalog-a", commercialDetails: { productName: "Media Product" }, specificationValues: [] },
    mediaOperations: operationType === "Add" ? [{
      operationId,
      operationType: "Add",
      sequence: 0,
      mediaId: null,
      requestedDisplayOrder: 9,
      selectedAsCover: true,
      expectedSourceSha256: sha256,
      expectedSourceByteLength: source.byteLength,
      finalOrder: 0,
    }] : [{
      operationId,
      operationType: "Remove",
      sequence: 0,
      mediaId: "missing-media",
      requestedDisplayOrder: null,
      selectedAsCover: false,
      expectedSourceSha256: null,
      expectedSourceByteLength: null,
      finalOrder: null,
    }],
  });
  assert.equal(result.type, "Accepted");
  return { submissionId, productId, operationId, source };
};

const storageWithPublishFailure = (
  delegate: ProductMediaStoragePort,
  code: "ChecksumMismatch" | "TargetConflict",
  once: boolean,
): ProductMediaStoragePort => {
  let shouldFail = true;
  return {
    stage: (input) => delegate.stage(input),
    publishNew: async (input) => {
      if (shouldFail) {
        if (once) shouldFail = false;
        return { type: "Failed", code };
      }
      return delegate.publishNew(input);
    },
    publishReplacement: (input) => delegate.publishReplacement(input),
    moveToTrash: (input) => delegate.moveToTrash(input),
    restoreFromTrash: (input) => delegate.restoreFromTrash(input),
    discardTemporary: (input) => delegate.discardTemporary(input),
    temporaryExists: (key) => delegate.temporaryExists(key),
    inspect: (key) => delegate.inspect(key),
    exists: (key) => delegate.exists(key),
  };
};

const mediaApplication = (storage: ProductMediaStoragePort) => {
  const unitOfWork = new PostgreSqlProductEntryUnitOfWork(connection.database);
  const idempotencyKeys = new ProductEntryMediaIdempotencyKeyService();
  const coordinator = new ProductEntryMediaWorkflowCoordinatorAdapter(
    connection.database,
    processor,
    DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION,
    storage,
  );
  return {
    upload: new UploadProductEntrySubmissionMediaUseCase({
      unitOfWork,
      sourceVerifier: new SharpProductEntryMediaSourceVerifier(processor, DEFAULT_PRODUCT_IMAGE_PROCESSING_CONFIGURATION),
      idempotencyKeys,
      workflowCoordinator: coordinator,
      clock: { now: () => new Date(now) },
    }),
    status: new GetProductEntrySubmissionMediaStatusUseCase(unitOfWork, coordinator, idempotencyKeys),
  };
};

const withStorage = async (run: (storage: LocalProductMediaStorageAdapter) => Promise<void>): Promise<void> => {
  const root = await mkdtemp(join(tmpdir(), "qsc-entry-media-"));
  try { await run(await LocalProductMediaStorageAdapter.create(root, processor)); }
  finally { await rm(root, { recursive: true, force: true }); }
};

before(async () => migrate(connection.database, { migrationsFolder: "drizzle" }));
beforeEach(async () => {
  await connection.database.execute(sql`
    TRUNCATE TABLE
      catalog_product_entry_submission_media_operations,
      catalog_product_entry_audit_records,
      catalog_product_entry_submissions,
      catalog_product_media_operations,
      catalog_product_media_workflows,
      catalog_product_media_states,
      catalog_product_media_roots,
      catalog_products
    CASCADE
  `);
});
after(async () => connection.close());

describe("PostgreSQL Product Entry Media coordination", () => {
  it("loads the authoritative plan, completes once, links once, and replays without duplicate media", async () => {
    await withStorage(async (storage) => {
      const seeded = await seedPhaseOne();
      const phaseOneRevision = (await connection.database.select().from(catalogProducts))[0].revision;
      const app = mediaApplication(storage);
      const parts = [{ fieldName: `source:${seeded.operationId}`, bytes: seeded.source, clientMediaType: "text/plain" }];
      const first = await app.upload.execute(context(), seeded.submissionId, parts);
      const second = await app.upload.execute(context(), seeded.submissionId, []);
      assert.equal(first.type, "Completed");
      assert.equal(second.type, "Completed");
      if (second.type === "Completed") assert.equal(second.idempotentReplay, true);
      const [workflows, operations, images, submissions, plans, products] = await Promise.all([
        connection.database.select().from(catalogProductMediaWorkflows),
        connection.database.select().from(catalogProductMediaOperations),
        connection.database.select().from(catalogProductImages),
        connection.database.select().from(catalogProductEntrySubmissions),
        connection.database.select().from(catalogProductEntrySubmissionMediaOperations),
        connection.database.select().from(catalogProducts),
      ]);
      assert.deepEqual([workflows.length, operations.length, images.length], [1, 1, 1]);
      assert.equal(submissions[0].mediaWorkflowId, workflows[0].workflowId);
      assert.equal(submissions[0].status, "Completed");
      assert.equal(plans[0].finalOrder, 0);
      assert.equal(plans[0].requestedDisplayOrder, 9);
      assert.equal(images[0].position, 0);
      assert.equal(products[0].revision, phaseOneRevision);
    });
  });

  it("uses one workflow and one linkage for concurrent same-key requests", async () => {
    await withStorage(async (storage) => {
      const seeded = await seedPhaseOne({ submissionId: "concurrent-submission", productId: "concurrent-product", operationId: "concurrent-add" });
      const app = mediaApplication(storage);
      const parts = [{ fieldName: `source:${seeded.operationId}`, bytes: seeded.source, clientMediaType: null }];
      const results = await Promise.all([
        app.upload.execute(context(), seeded.submissionId, parts),
        app.upload.execute(context(), seeded.submissionId, parts),
      ]);
      assert.ok(results.every((result) => result.type === "Completed" || result.type === "Accepted" || result.type === "Conflict"));
      assert.equal((await connection.database.select().from(catalogProductMediaWorkflows)).length, 1);
      assert.equal((await connection.database.select().from(catalogProductMediaOperations)).length, 1);
      assert.ok((await connection.database.select().from(catalogProductEntrySubmissions))[0].mediaWorkflowId);
    });
  });

  it("returns foreign Workspace Submission as not found and keeps GET read-only", async () => {
    await withStorage(async (storage) => {
      const seeded = await seedPhaseOne();
      const app = mediaApplication(storage);
      assert.equal((await app.upload.execute(context(otherWorkspaceId), seeded.submissionId, [])).type, "NotFound");
      const before = await connection.database.select().from(catalogProductEntrySubmissions);
      const status = await app.status.execute(context(), seeded.submissionId);
      const afterStatus = await connection.database.select().from(catalogProductEntrySubmissions);
      assert.equal(status.type, "Found");
      assert.deepEqual(afterStatus, before);
      assert.equal((await app.status.execute(context(otherWorkspaceId), seeded.submissionId)).type, "NotFound");
    });
  });

  it("keeps partial Media failure independent from Product persistence", async () => {
    await withStorage(async (storage) => {
      const seeded = await seedPhaseOne({ operationType: "Remove", operationId: "remove-missing" });
      const phaseOneRevision = (await connection.database.select().from(catalogProducts))[0].revision;
      const app = mediaApplication(storage);
      const result = await app.upload.execute(context(), seeded.submissionId, []);
      assert.equal(result.type, "Accepted");
      const submission = (await connection.database.select().from(catalogProductEntrySubmissions))[0];
      const product = (await connection.database.select().from(catalogProducts))[0];
      assert.equal(submission.status, "PartiallyCompleted");
      assert.equal(product.productId, seeded.productId);
      assert.equal(product.revision, phaseOneRevision);
    });
  });

  it("retries retained staging on a repeated POST and reuses the workflow", async () => {
    await withStorage(async (storage) => {
      const seeded = await seedPhaseOne({ submissionId: "retry-submission", productId: "retry-product", operationId: "retry-add" });
      const app = mediaApplication(storageWithPublishFailure(storage, "ChecksumMismatch", true));
      const parts = [{ fieldName: `source:${seeded.operationId}`, bytes: seeded.source, clientMediaType: null }];
      const first = await app.upload.execute(context(), seeded.submissionId, parts);
      assert.equal(first.type, "Accepted");
      const workflowId = first.type === "Accepted" ? first.workflow.workflowId : "";
      const second = await app.upload.execute(context(), seeded.submissionId, []);
      assert.equal(second.type, "Completed");
      if (second.type === "Completed") {
        assert.equal(second.workflow.workflowId, workflowId);
        assert.equal(second.resumed, true);
      }
      assert.equal((await connection.database.select().from(catalogProductMediaWorkflows)).length, 1);
      assert.equal((await connection.database.select().from(catalogProductImages)).length, 1);
    });
  });

  it("persists ReconciliationRequired and leaves the Product unchanged on filesystem conflict", async () => {
    await withStorage(async (storage) => {
      const seeded = await seedPhaseOne({ submissionId: "reconcile-submission", productId: "reconcile-product", operationId: "reconcile-add" });
      const phaseOneRevision = (await connection.database.select().from(catalogProducts))[0].revision;
      const app = mediaApplication(storageWithPublishFailure(storage, "TargetConflict", false));
      const result = await app.upload.execute(context(), seeded.submissionId, [{ fieldName: `source:${seeded.operationId}`, bytes: seeded.source, clientMediaType: null }]);
      assert.equal(result.type, "Accepted");
      assert.equal((await connection.database.select().from(catalogProductMediaWorkflows))[0].status, "ReconciliationRequired");
      assert.equal((await connection.database.select().from(catalogProductEntrySubmissions))[0].status, "PartiallyCompleted");
      assert.equal((await connection.database.select().from(catalogProducts))[0].revision, phaseOneRevision);
    });
  });

  it("recovers linkage by idempotency key after a database failure following Media completion", async () => {
    await withStorage(async (storage) => {
      const seeded = await seedPhaseOne({ submissionId: "link-recovery", productId: "link-product", operationId: "link-add" });
      const app = mediaApplication(storage);
      await connection.database.execute(sql`
        CREATE OR REPLACE FUNCTION qsc_test_reject_media_link()
        RETURNS trigger LANGUAGE plpgsql AS $function$
        BEGIN
          IF NEW.media_workflow_id IS NOT NULL THEN RAISE EXCEPTION 'forced link failure'; END IF;
          RETURN NEW;
        END;
        $function$
      `);
      await connection.database.execute(sql`
        CREATE TRIGGER qsc_test_reject_media_link_trigger
        BEFORE UPDATE ON catalog_product_entry_submissions
        FOR EACH ROW EXECUTE FUNCTION qsc_test_reject_media_link()
      `);
      const parts = [{ fieldName: `source:${seeded.operationId}`, bytes: seeded.source, clientMediaType: null }];
      try {
        await assert.rejects(app.upload.execute(context(), seeded.submissionId, parts));
        assert.equal((await connection.database.select().from(catalogProductMediaWorkflows))[0].status, "Completed");
        assert.equal((await connection.database.select().from(catalogProductEntrySubmissions))[0].status, "ProductSaved");
      } finally {
        await connection.database.execute(sql`DROP TRIGGER IF EXISTS qsc_test_reject_media_link_trigger ON catalog_product_entry_submissions`);
        await connection.database.execute(sql`DROP FUNCTION IF EXISTS qsc_test_reject_media_link()`);
      }
      const recovered = await app.upload.execute(context(), seeded.submissionId, []);
      assert.equal(recovered.type, "Completed");
      assert.equal((await connection.database.select().from(catalogProductMediaWorkflows)).length, 1);
      assert.equal((await connection.database.select().from(catalogProductImages)).length, 1);
      assert.equal((await connection.database.select().from(catalogProductEntrySubmissions))[0].status, "Completed");
    });
  });
});
