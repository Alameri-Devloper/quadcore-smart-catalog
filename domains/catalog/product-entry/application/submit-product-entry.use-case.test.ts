import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProductRepository } from "../../repositories/product.repository.interface";
import { ProductCreateResult, ProductUpdateResult } from "../../repositories/product-repository-results";
import { ProductPublicationRequirements } from "../../types/product-publication-requirements.value-object";
import { ProductRevision } from "../../types/product-revision.value-object";
import { CatalogId, ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { Product } from "../../types/product.aggregate";
import { ProductCode } from "../../types/product-code.value-object";
import type { ProductEntryMediaOperation } from "../domain/product-entry-media-plan";
import { ProductEntrySubmission, type ProductEntrySubmissionId } from "../domain/product-entry-submission";
import type { ProductEntryAuditRecord, ProductEntryAuditRepository } from "../repositories/product-entry-audit.repository";
import type { ProductEntrySubmissionMediaPlanRepository } from "../repositories/product-entry-media-plan.repository";
import type { ClaimProductEntrySubmission, MarkProductEntrySubmissionMediaOutcome, MarkProductEntrySubmissionProductSaved, ProductEntrySaveReceipt, ProductEntrySubmissionClaimResult, ProductEntrySubmissionRepository } from "../repositories/product-entry-submission.repository";
import type { ProductEntryTransactionDecision, ProductEntryTransactionalContext, ProductEntryUnitOfWork } from "../ports/product-entry-unit-of-work.port";
import { GetProductEntrySubmissionUseCase } from "./get-product-entry-submission.use-case";
import { ProductEntryActorId, PRODUCT_ENTRY_PERMISSIONS, type ProductEntryExecutionContext, type ProductEntryPermission } from "./product-entry-execution-context";
import { SubmitProductEntryUseCase } from "./submit-product-entry.use-case";

interface MemoryState {
  products: Map<string, Product>;
  submissions: Map<string, ProductEntrySubmission>;
  receipts: Map<string, ProductEntrySaveReceipt>;
  plans: Map<string, readonly ProductEntryMediaOperation[]>;
  audits: ProductEntryAuditRecord[];
}

interface FailureControls {
  audit: boolean;
  mediaPlan: boolean;
  product: boolean;
}

interface Metrics {
  transactions: number;
  productCreates: number;
  productUpdates: number;
}

const scoped = (workspace: string, id: string) => `${workspace}\u0000${id}`;

const cloneProduct = (product: Product): Product => Product.rehydrate({
  workspaceId: product.identity.workspaceId,
  productId: product.identity.productId,
  catalogId: product.identity.catalogId,
  lifecycleState: product.lifecycleState.value,
  archiveReason: product.archiveReason?.value,
  revision: product.revision.value,
  createdAt: product.createdAt,
  updatedAt: product.updatedAt,
  classification: product.classification ? {
    categoryId: product.classification.categoryId,
    productTypeId: product.classification.productTypeId,
    deviceClassId: product.classification.deviceClassId,
    conditionId: product.classification.conditionId,
    availabilityStatusId: product.classification.availabilityStatusId,
  } : undefined,
  commercialDetails: product.commercialDetails ? {
    productName: product.commercialDetails.productName,
    productCode: product.commercialDetails.productCode,
    productModelId: product.commercialDetails.productModelId,
    brandId: product.commercialDetails.brandId,
    isHighlighted: product.commercialDetails.isHighlighted,
    pricing: product.commercialDetails.pricing ? {
      wholesalePrice: product.commercialDetails.pricing.wholesalePrice ? {
        amountMinor: product.commercialDetails.pricing.wholesalePrice.amountMinor,
        currency: product.commercialDetails.pricing.wholesalePrice.currency,
      } : undefined,
      retailPrice: product.commercialDetails.pricing.retailPrice ? {
        amountMinor: product.commercialDetails.pricing.retailPrice.amountMinor,
        currency: product.commercialDetails.pricing.retailPrice.currency,
      } : undefined,
    } : undefined,
  } : undefined,
  specificationValues: product.specificationValues.map((value) => ({ specificationFieldId: value.specificationFieldId, value: value.value })),
  images: product.images.map((image) => ({
    productImageId: image.productImageId,
    storageReference: image.storageReference,
    order: image.order,
    isMain: image.isMain,
    altText: image.altText,
  })),
});

const cloneSubmission = (submission: ProductEntrySubmission): ProductEntrySubmission => ProductEntrySubmission.rehydrate({
  workspaceId: submission.workspaceId,
  submissionId: submission.submissionId,
  requestFingerprint: submission.requestFingerprint,
  mode: submission.mode,
  productId: submission.productId,
  productRevision: submission.productRevision,
  mediaWorkflowId: submission.mediaWorkflowId,
  status: submission.status,
  createdAt: submission.createdAt,
  updatedAt: submission.updatedAt,
});

const cloneState = (state: MemoryState): MemoryState => ({
  products: new Map([...state.products].map(([key, product]) => [key, cloneProduct(product)])),
  submissions: new Map([...state.submissions].map(([key, submission]) => [key, cloneSubmission(submission)])),
  receipts: new Map(state.receipts),
  plans: new Map([...state.plans].map(([key, plan]) => [key, [...plan]])),
  audits: [...state.audits],
});

class MemoryProductRepository implements ProductRepository {
  constructor(private readonly state: MemoryState, private readonly failures: FailureControls, private readonly metrics: Metrics) {}

  async findById(workspaceId: WorkspaceId, productId: ProductId): Promise<Product | null> {
    const product = this.state.products.get(scoped(workspaceId.value, productId.value));
    return product ? cloneProduct(product) : null;
  }

  async create(product: Product) {
    this.metrics.productCreates += 1;
    if (this.failures.product) throw new Error("forced product persistence failure");
    const key = scoped(product.identity.workspaceId.value, product.identity.productId.value);
    if (this.state.products.has(key)) return ProductCreateResult.productIdConflict(product.identity.workspaceId, product.identity.productId);
    const code = product.commercialDetails?.productCode;
    if (code && [...this.state.products.values()].some((candidate) =>
      candidate.identity.workspaceId.value === product.identity.workspaceId.value && candidate.commercialDetails?.productCode?.equals(code),
    )) return ProductCreateResult.productCodeConflict(product.identity.workspaceId, product.identity.productId, code);
    this.state.products.set(key, cloneProduct(product));
    return ProductCreateResult.created(product.identity.workspaceId, product.identity.productId, product.revision);
  }

  async update(product: Product, expectedPersistedRevision: ProductRevision) {
    this.metrics.productUpdates += 1;
    if (this.failures.product) throw new Error("forced product persistence failure");
    const key = scoped(product.identity.workspaceId.value, product.identity.productId.value);
    const existing = this.state.products.get(key);
    if (!existing) return ProductUpdateResult.productNotFound(product.identity.workspaceId, product.identity.productId);
    if (!existing.revision.equals(expectedPersistedRevision)) {
      return ProductUpdateResult.revisionConflict(product.identity.workspaceId, product.identity.productId, expectedPersistedRevision, existing.revision);
    }
    const code = product.commercialDetails?.productCode;
    if (code && [...this.state.products.values()].some((candidate) =>
      candidate.identity.workspaceId.value === product.identity.workspaceId.value &&
      candidate.identity.productId.value !== product.identity.productId.value &&
      candidate.commercialDetails?.productCode?.equals(code),
    )) return ProductUpdateResult.productCodeConflict(product.identity.workspaceId, product.identity.productId, code);
    this.state.products.set(key, cloneProduct(product));
    return ProductUpdateResult.updated(product.identity.workspaceId, product.identity.productId, product.revision);
  }
}

class MemorySubmissionRepository implements ProductEntrySubmissionRepository {
  constructor(private readonly state: MemoryState) {}
  async findById(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId) {
    return this.state.submissions.get(scoped(workspaceId.value, submissionId.value)) ?? null;
  }
  async findSaveReceipt(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId) {
    return this.state.receipts.get(scoped(workspaceId.value, submissionId.value)) ?? null;
  }
  async claim(command: ClaimProductEntrySubmission): Promise<ProductEntrySubmissionClaimResult> {
    const key = scoped(command.workspaceId.value, command.submissionId.value);
    const existing = this.state.submissions.get(key);
    if (existing) return existing.requestFingerprint.equals(command.requestFingerprint)
      ? { type: "Existing", submission: existing }
      : { type: "FingerprintConflict", submission: existing };
    const submission = ProductEntrySubmission.claim(command);
    this.state.submissions.set(key, submission);
    return { type: "Claimed", submission };
  }
  async markProductSaved(command: MarkProductEntrySubmissionProductSaved) {
    const key = scoped(command.workspaceId.value, command.submissionId.value);
    const submission = this.state.submissions.get(key);
    if (!submission) throw new Error("missing submission");
    submission.markProductSaved(command.productId, command.productRevision, command.savedAt);
    this.state.receipts.set(key, command.receipt);
  }
  async markMediaOutcome(command: MarkProductEntrySubmissionMediaOutcome) {
    const submission = this.state.submissions.get(scoped(command.workspaceId.value, command.submissionId.value));
    if (!submission) return { type: "Conflict" as const };
    if (submission.mediaWorkflowId === command.mediaWorkflowId && submission.status === command.status) {
      return { type: "Existing" as const };
    }
    try {
      submission.markMediaOutcome(command.status, command.mediaWorkflowId, command.updatedAt);
      return { type: "Linked" as const };
    } catch {
      return { type: "Conflict" as const };
    }
  }
}

class MemoryMediaPlanRepository implements ProductEntrySubmissionMediaPlanRepository {
  constructor(private readonly state: MemoryState, private readonly failures: FailureControls) {}
  async save(operations: readonly ProductEntryMediaOperation[]) {
    if (this.failures.mediaPlan) throw new Error("forced media-plan failure");
    if (operations.length) this.state.plans.set(scoped(operations[0].workspaceId.value, operations[0].submissionId.value), [...operations]);
  }
  async findBySubmission(workspaceId: WorkspaceId, submissionId: ProductEntrySubmissionId) {
    return this.state.plans.get(scoped(workspaceId.value, submissionId.value)) ?? [];
  }
}

class MemoryAuditRepository implements ProductEntryAuditRepository {
  constructor(private readonly state: MemoryState, private readonly failures: FailureControls) {}
  async append(records: readonly ProductEntryAuditRecord[]) {
    if (this.failures.audit) throw new Error("forced audit failure");
    this.state.audits.push(...records);
  }
}

class MemoryUnitOfWork implements ProductEntryUnitOfWork {
  state: MemoryState = { products: new Map(), submissions: new Map(), receipts: new Map(), plans: new Map(), audits: [] };
  readonly failures: FailureControls = { audit: false, mediaPlan: false, product: false };
  readonly metrics: Metrics = { transactions: 0, productCreates: 0, productUpdates: 0 };

  async execute<T>(work: (context: ProductEntryTransactionalContext) => Promise<ProductEntryTransactionDecision<T>>): Promise<T> {
    this.metrics.transactions += 1;
    const transactionalState = cloneState(this.state);
    const context: ProductEntryTransactionalContext = {
      productRepository: new MemoryProductRepository(transactionalState, this.failures, this.metrics),
      submissionRepository: new MemorySubmissionRepository(transactionalState),
      mediaPlanRepository: new MemoryMediaPlanRepository(transactionalState, this.failures),
      auditRepository: new MemoryAuditRepository(transactionalState, this.failures),
      productIdAllocator: { allocate: async () => ProductId.create("allocated-product") },
      productCodeAllocator: { allocate: async () => ProductCode.create("GENERATED-CODE") },
    };
    const decision = await work(context);
    if (decision.type === "Commit") this.state = transactionalState;
    return decision.result;
  }
}

const workspaceId = WorkspaceId.create("workspace-a");
const now = new Date("2026-08-03T10:00:00.000Z");
const context = (permissions: readonly ProductEntryPermission[] = [PRODUCT_ENTRY_PERMISSIONS.create, PRODUCT_ENTRY_PERMISSIONS.edit, PRODUCT_ENTRY_PERMISSIONS.read]): ProductEntryExecutionContext => ({
  workspaceId,
  actorId: ProductEntryActorId.create("actor-a"),
  permissions: new Set(permissions),
});

const command = (overrides: Record<string, unknown> = {}) => ({
  submissionId: "submission-a",
  mode: "Create",
  productId: null,
  expectedProductRevision: null,
  draft: { catalogId: "catalog-a", commercialDetails: {}, specificationValues: [] },
  mediaOperations: [{
    operationId: "add-a", operationType: "Add", sequence: 0, mediaId: null,
    requestedDisplayOrder: 0, selectedAsCover: true, expectedSourceSha256: "a".repeat(64),
    expectedSourceByteLength: 10, finalOrder: 0,
  }],
  ...overrides,
});

const seedProduct = (unitOfWork: MemoryUnitOfWork, input: { workspace?: string; id?: string; lifecycle?: "Draft" | "Published"; revision?: number; name?: string; code?: string; wholesale?: number; retail?: number } = {}) => {
  const product = Product.rehydrate({
    workspaceId: WorkspaceId.create(input.workspace ?? "workspace-a"),
    productId: ProductId.create(input.id ?? "existing-product"),
    catalogId: CatalogId.create("catalog-a"),
    lifecycleState: input.lifecycle ?? "Draft",
    revision: input.revision ?? 0,
    createdAt: now,
    updatedAt: now,
    commercialDetails: {
      productName: input.name,
      productCode: input.code,
      pricing: input.wholesale === undefined && input.retail === undefined ? undefined : {
        wholesalePrice: input.wholesale === undefined ? undefined : { amountMinor: input.wholesale, currency: "USD" },
        retailPrice: input.retail === undefined ? undefined : { amountMinor: input.retail, currency: "USD" },
      },
    },
  });
  unitOfWork.state.products.set(scoped(product.identity.workspaceId.value, product.identity.productId.value), product);
};

const setup = (requirements = ProductPublicationRequirements.create({ commercial: ["ProductName"] })) => {
  const unitOfWork = new MemoryUnitOfWork();
  const useCase = new SubmitProductEntryUseCase({
    unitOfWork,
    requirementsResolver: { resolve: async () => requirements },
    clock: { now: () => new Date(now) },
  });
  return { unitOfWork, useCase };
};

describe("SubmitProductEntryUseCase", () => {
  it("saves an incomplete Create as Draft in one committed transaction", async () => {
    const { unitOfWork, useCase } = setup();
    const result = await useCase.execute(context(), command());
    assert.equal(result.type, "Accepted");
    if (result.type === "Accepted") assert.equal(result.productSaveResult.outcome, "SavedAsDraft");
    assert.equal(unitOfWork.state.submissions.size, 1);
    assert.equal(unitOfWork.state.plans.size, 1);
    assert.equal(unitOfWork.state.audits.length, 4);
  });

  it("publishes a ready Create and allocates ProductCode when current requirements need it", async () => {
    const { unitOfWork, useCase } = setup(ProductPublicationRequirements.create({ commercial: ["ProductName", "ProductCode"] }));
    const result = await useCase.execute(context(), command({ draft: { catalogId: "catalog-a", commercialDetails: { productName: "Ready" }, specificationValues: [] } }));
    assert.equal(result.type, "Accepted");
    if (result.type === "Accepted") assert.equal(result.productSaveResult.outcome, "SavedAndPublished");
    assert.equal(unitOfWork.state.products.get(scoped("workspace-a", "allocated-product"))?.commercialDetails?.productCode?.value, "GENERATED-CODE");
  });

  it("edits a ready Product while preserving Media-owned image metadata", async () => {
    const { unitOfWork, useCase } = setup();
    seedProduct(unitOfWork, { name: "Old" });
    const result = await useCase.execute(context(), command({
      mode: "Edit", productId: "existing-product", expectedProductRevision: 0,
      draft: { catalogId: null, commercialDetails: { productName: "Ready" }, specificationValues: [] },
    }));
    assert.equal(result.type, "Accepted");
    if (result.type === "Accepted") assert.equal(result.productSaveResult.outcome, "SavedAndPublished");
  });

  it("auto-archives an incomplete Published Product", async () => {
    const { useCase, unitOfWork } = setup();
    seedProduct(unitOfWork, { lifecycle: "Published", revision: 1, name: "Ready" });
    const result = await useCase.execute(context(), command({
      mode: "Edit", productId: "existing-product", expectedProductRevision: 1,
      draft: { catalogId: null, commercialDetails: {}, specificationValues: [] },
    }));
    assert.equal(result.type, "Accepted");
    if (result.type === "Accepted") assert.equal(result.productSaveResult.outcome, "SavedAndAutoArchived");
  });

  it("returns the same logical result idempotently without creating another Product", async () => {
    const { useCase, unitOfWork } = setup();
    const request = command();
    const first = await useCase.execute(context(), request);
    const second = await useCase.execute(context(), request);
    assert.equal(first.type, "Accepted");
    assert.equal(second.type, "Accepted");
    if (second.type === "Accepted") assert.equal(second.idempotentReplay, true);
    assert.equal(unitOfWork.metrics.productCreates, 1);
    assert.equal(unitOfWork.state.products.size, 1);
  });

  it("returns a fingerprint conflict without modifying persisted state", async () => {
    const { useCase, unitOfWork } = setup();
    await useCase.execute(context(), command());
    const before = cloneState(unitOfWork.state);
    const result = await useCase.execute(context(), command({ draft: { catalogId: "catalog-a", commercialDetails: { productName: "Different" }, specificationValues: [] } }));
    assert.equal(result.type, "SubmissionFingerprintConflict");
    assert.equal(unitOfWork.state.products.size, before.products.size);
    assert.equal(unitOfWork.state.audits.length, before.audits.length);
  });

  it("rolls back claim and media plan on Product Revision conflict", async () => {
    const { useCase, unitOfWork } = setup();
    seedProduct(unitOfWork, { lifecycle: "Published", revision: 2, name: "Ready" });
    const result = await useCase.execute(context(), command({
      mode: "Edit", productId: "existing-product", expectedProductRevision: 1,
      draft: { catalogId: null, commercialDetails: { productName: "Changed" }, specificationValues: [] },
    }));
    assert.equal(result.type, "ProductRevisionConflict");
    assert.equal(unitOfWork.state.submissions.size, 0);
    assert.equal(unitOfWork.state.plans.size, 0);
  });

  it("rolls back claim and media plan on ProductCode or ProductId conflict", async () => {
    const codeConflict = setup();
    seedProduct(codeConflict.unitOfWork, { id: "other", code: "DUPLICATE" });
    let result = await codeConflict.useCase.execute(context(), command({ draft: { catalogId: "catalog-a", commercialDetails: { productName: "New", productCode: "DUPLICATE" }, specificationValues: [] } }));
    assert.equal(result.type, "ProductCodeConflict");
    assert.equal(codeConflict.unitOfWork.state.submissions.size, 0);

    const idConflict = setup();
    seedProduct(idConflict.unitOfWork, { id: "allocated-product" });
    result = await idConflict.useCase.execute(context(), command());
    assert.equal(result.type, "ProductIdConflict");
    assert.equal(idConflict.unitOfWork.state.submissions.size, 0);
  });

  it("rolls back every write when Audit, media-plan, or Product persistence fails", async () => {
    for (const failure of ["audit", "mediaPlan", "product"] as const) {
      const { useCase, unitOfWork } = setup();
      unitOfWork.failures[failure] = true;
      await assert.rejects(useCase.execute(context(), command()), /forced/);
      assert.equal(unitOfWork.state.products.size, 0);
      assert.equal(unitOfWork.state.submissions.size, 0);
      assert.equal(unitOfWork.state.plans.size, 0);
      assert.equal(unitOfWork.state.audits.length, 0);
    }
  });

  it("performs no repository transaction for unauthorized requests", async () => {
    const { useCase, unitOfWork } = setup();
    const result = await useCase.execute(context([]), command());
    assert.equal(result.type, "Forbidden");
    assert.equal(unitOfWork.metrics.transactions, 0);
  });

  it("rejects request-body Workspace and actor identity before any audit-capable transaction", async () => {
    const { useCase, unitOfWork } = setup();
    const result = await useCase.execute(context(), command({ workspaceId: "invented-workspace", actorId: "invented-actor" }));
    assert.equal(result.type, "InvalidRequest");
    if (result.type === "InvalidRequest") assert.equal(result.reasons[0]?.code, "UnsupportedField");
    assert.equal(unitOfWork.metrics.transactions, 0);
    assert.equal(unitOfWork.state.audits.length, 0);
  });

  it("returns media descriptor failures as validation without opening a transaction", async () => {
    const { useCase, unitOfWork } = setup();
    const result = await useCase.execute(context(), command({
      mediaOperations: [{
        operationId: "invalid-sequence", operationType: "Add", sequence: 1, mediaId: null,
        expectedSourceSha256: "a".repeat(64), expectedSourceByteLength: 10,
      }],
    }));
    assert.equal(result.type, "InvalidRequest");
    if (result.type === "InvalidRequest") assert.equal(result.reasons[0]?.code, "InvalidMediaPlan");
    assert.equal(unitOfWork.metrics.transactions, 0);
  });

  it("rejects unsupported canonical request values before fingerprint calculation", async () => {
    const { unitOfWork } = setup();
    let fingerprintCalled = false;
    const useCase = new SubmitProductEntryUseCase({
      unitOfWork,
      requirementsResolver: { resolve: async () => ProductPublicationRequirements.create({ commercial: [] }) },
      clock: { now: () => new Date(now) },
      fingerprintService: {
        calculate: () => {
          fingerprintCalled = true;
          throw new Error("fingerprint must not run for unsupported request input");
        },
      },
    });
    const result = await useCase.execute(context(), command({
      draft: {
        catalogId: "catalog-a",
        commercialDetails: {},
        specificationValues: [{ specificationFieldId: "unsupported-number", value: -0 }],
      },
    }));
    assert.equal(result.type, "InvalidRequest");
    assert.equal(fingerprintCalled, false);
    assert.equal(unitOfWork.metrics.transactions, 0);
  });

  it("propagates Clock and fingerprint/Crypto failures as unexpected application failures", async () => {
    const clockFailure = setup();
    const clockUseCase = new SubmitProductEntryUseCase({
      unitOfWork: clockFailure.unitOfWork,
      requirementsResolver: { resolve: async () => ProductPublicationRequirements.create({ commercial: [] }) },
      clock: { now: () => { throw new Error("forced Clock failure"); } },
    });
    await assert.rejects(() => clockUseCase.execute(context(), command()), /forced Clock failure/);
    assert.equal(clockFailure.unitOfWork.metrics.transactions, 0);

    const cryptoFailure = setup();
    const fingerprintUseCase = new SubmitProductEntryUseCase({
      unitOfWork: cryptoFailure.unitOfWork,
      requirementsResolver: { resolve: async () => ProductPublicationRequirements.create({ commercial: [] }) },
      clock: { now: () => new Date(now) },
      fingerprintService: { calculate: () => { throw new Error("forced Crypto failure"); } },
    });
    await assert.rejects(() => fingerprintUseCase.execute(context(), command()), /forced Crypto failure/);
    assert.equal(cryptoFailure.unitOfWork.metrics.transactions, 0);
  });

  it("rejects cross-Workspace Edit without exposing the foreign Product", async () => {
    const { useCase, unitOfWork } = setup();
    seedProduct(unitOfWork, { workspace: "workspace-b", id: "foreign" });
    const result = await useCase.execute(context(), command({
      mode: "Edit", productId: "foreign", expectedProductRevision: 0,
      draft: { catalogId: null, commercialDetails: {}, specificationValues: [] },
    }));
    assert.deepEqual(result, { type: "ProductNotFound", productId: "foreign" });
    assert.equal(unitOfWork.state.submissions.size, 0);
  });

  it("preserves hidden Wholesale during an otherwise authorized Edit", async () => {
    const { useCase, unitOfWork } = setup();
    seedProduct(unitOfWork, { wholesale: 100, retail: 150 });
    const result = await useCase.execute(
      context([PRODUCT_ENTRY_PERMISSIONS.edit, PRODUCT_ENTRY_PERMISSIONS.pricingView]),
      command({ mode: "Edit", productId: "existing-product", expectedProductRevision: 0, draft: { catalogId: null, commercialDetails: { productName: "Updated", pricing: { retailPrice: { amountMinor: 160, currency: "USD" } } }, specificationValues: [] } }),
    );
    assert.equal(result.type, "Accepted");
    const saved = unitOfWork.state.products.get(scoped("workspace-a", "existing-product"));
    assert.equal(saved?.commercialDetails?.pricing?.wholesalePrice?.amountMinor, 100);
    assert.equal(saved?.commercialDetails?.pricing?.retailPrice?.amountMinor, 160);
  });

  it("never depends on Media Workflow execution or file storage in Phase 1", async () => {
    const { useCase } = setup();
    const result = await useCase.execute(context(), command());
    assert.equal(result.type, "Accepted");
    if (result.type === "Accepted") assert.equal(result.mediaUploadState, "PendingUpload");
  });
});

describe("GetProductEntrySubmissionUseCase", () => {
  it("returns Workspace-scoped Product truth and sequence-ordered media plan", async () => {
    const { useCase, unitOfWork } = setup();
    await useCase.execute(context(), command());
    const get = new GetProductEntrySubmissionUseCase(unitOfWork);
    const result = await get.execute(context([PRODUCT_ENTRY_PERMISSIONS.read]), "submission-a");
    assert.equal(result.type, "Found");
    if (result.type === "Found") {
      assert.equal(result.submission.product?.productId, "allocated-product");
      assert.deepEqual(result.submission.mediaOperations.map((operation) => operation.sequence), [0]);
    }
  });

  it("preserves wholesale and retail selling prices without fabricating Reference Purchase Cost", async () => {
    const { useCase, unitOfWork } = setup();
    await useCase.execute(context([PRODUCT_ENTRY_PERMISSIONS.create, PRODUCT_ENTRY_PERMISSIONS.pricingView, PRODUCT_ENTRY_PERMISSIONS.wholesaleView]), command({ draft: { catalogId: "catalog-a", commercialDetails: { productName: "Priced", pricing: { wholesalePrice: { amountMinor: 100, currency: "USD" }, retailPrice: { amountMinor: 150, currency: "USD" } } }, specificationValues: [] } }));
    const get = new GetProductEntrySubmissionUseCase(unitOfWork);
    const withoutSensitivePricePermissions = await get.execute(context([PRODUCT_ENTRY_PERMISSIONS.read]), "submission-a");
    const withPricePermissions = await get.execute(context([PRODUCT_ENTRY_PERMISSIONS.read, PRODUCT_ENTRY_PERMISSIONS.pricingView, PRODUCT_ENTRY_PERMISSIONS.wholesaleView]), "submission-a");
    assert.equal(withoutSensitivePricePermissions.type, "Found");
    assert.equal(withPricePermissions.type, "Found");
    if (withoutSensitivePricePermissions.type === "Found" && withPricePermissions.type === "Found") {
      const hidden = withoutSensitivePricePermissions.submission.product?.commercialDetails;
      const visible = withPricePermissions.submission.product?.commercialDetails;
      assert.equal(hidden?.wholesalePrice, null);
      assert.equal(hidden?.retailPrice, null);
      assert.deepEqual(visible?.wholesalePrice, { amountMinor: 100, currency: "USD" });
      assert.deepEqual(visible?.retailPrice, { amountMinor: 150, currency: "USD" });
      assert.equal(visible ? "referenceCost" in visible : true, false);
    }
  });

  it("returns NotFound for missing and foreign-Workspace submissions", async () => {
    const { useCase, unitOfWork } = setup();
    await useCase.execute(context(), command());
    const get = new GetProductEntrySubmissionUseCase(unitOfWork);
    assert.equal((await get.execute(context([PRODUCT_ENTRY_PERMISSIONS.read]), "missing")).type, "NotFound");
    const foreignContext: ProductEntryExecutionContext = { ...context([PRODUCT_ENTRY_PERMISSIONS.read]), workspaceId: WorkspaceId.create("workspace-b") };
    assert.equal((await get.execute(foreignContext, "submission-a")).type, "NotFound");
  });
});
