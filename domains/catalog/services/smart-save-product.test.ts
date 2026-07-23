import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ProductRepository } from "../repositories/product.repository.interface";
import { ProductCreateResult, ProductUpdateResult } from "../repositories/product-repository-results";
import { PRODUCT_ARCHIVE_REASONS, ProductArchiveReason } from "../types/product-archive-reason.value-object";
import { ProductTypeId } from "../types/product-classification.value-object";
import { CatalogId, ProductId, WorkspaceId } from "../types/product-identity.value-object";
import { ProductPublicationRequirements } from "../types/product-publication-requirements.value-object";
import { ProductRevision } from "../types/product-revision.value-object";
import { Product } from "../types/product.aggregate";
import type { ProductPublicationRequirementsResolver } from "./product-publication-requirements-resolver.port";
import { SMART_SAVE_PRODUCT_OUTCOMES, SmartSaveProduct, type SmartSaveProductCommand, type UpdateSmartSaveProductCommand } from "./smart-save-product";

const workspaceId = WorkspaceId.create("workspace-trusted");
const catalogId = CatalogId.create("catalog-1");
const productId = ProductId.create("product-1");
const time = new Date("2026-07-22T08:00:00Z");
const emptyRequirements = ProductPublicationRequirements.create();
const nameRequirements = ProductPublicationRequirements.create({ commercial: ["ProductName"] });

const editable = (name: string | null = "Ready") => ({
  productId,
  classification: { productTypeId: ProductTypeId.create("type-1") },
  commercialDetails: { productName: name ?? undefined, productCode: "CODE-1" },
  specificationValues: [],
  images: [],
  effectiveTime: time,
});

class MemoryRepository implements ProductRepository {
  product: Product | null = null;
  createConflict?: "id" | "code";
  updateConflict?: "revision" | "code";
  creates = 0;
  updates = 0;
  async findById() { return this.product; }
  async create(product: Product) {
    this.creates += 1;
    this.product = product;
    if (this.createConflict === "id") return ProductCreateResult.productIdConflict(workspaceId, productId);
    if (this.createConflict === "code") return ProductCreateResult.productCodeConflict(workspaceId, productId, product.commercialDetails!.productCode!);
    return ProductCreateResult.created(workspaceId, productId, product.revision);
  }
  async update(product: Product, expected: ProductRevision) {
    this.updates += 1;
    this.product = product;
    if (this.updateConflict === "revision") return ProductUpdateResult.revisionConflict(workspaceId, productId, expected, expected.next());
    if (this.updateConflict === "code") return ProductUpdateResult.productCodeConflict(workspaceId, productId, product.commercialDetails!.productCode!);
    return ProductUpdateResult.updated(workspaceId, productId, product.revision);
  }
}

const useCase = (repository: MemoryRepository, requirements = emptyRequirements) => {
  let resolutions = 0;
  const resolver: ProductPublicationRequirementsResolver = {
    async resolve(input) {
      resolutions += 1;
      assert.equal(input.workspaceId.value, workspaceId.value);
      assert.equal(input.catalogId.value, repository.product?.identity.catalogId.value ?? catalogId.value);
      return requirements;
    },
  };
  return {
    save: new SmartSaveProduct(repository, { getCurrentWorkspaceId: () => workspaceId }, resolver),
    resolutions: () => resolutions,
  };
};

const updateCommand = (revision: number, name: string | null = "Ready"): SmartSaveProductCommand => ({
  operation: "Update",
  ...editable(name),
  expectedPersistedRevision: ProductRevision.rehydrate(revision),
});

const stored = (state: "Draft" | "Published" | "Archived", archiveReason?: "Manual" | "PublicationRequirementsNotMet") => {
  const values = editable();
  return Product.rehydrate({
    workspaceId, catalogId, productId, lifecycleState: state, archiveReason,
    revision: 4, createdAt: new Date("2026-07-20T00:00:00Z"), updatedAt: new Date("2026-07-21T00:00:00Z"),
    classification: values.classification,
    commercialDetails: values.commercialDetails,
    specificationValues: values.specificationValues,
    images: values.images,
  });
};

describe("Smart Save Product create", () => {
  it("preserves an incomplete Product as Draft and returns every missing reason", async () => {
    const repository = new MemoryRepository();
    const execution = await useCase(repository, nameRequirements).save.execute({ operation: "Create", catalogId, ...editable(null) });
    assert.equal(execution.result.outcome, SMART_SAVE_PRODUCT_OUTCOMES.savedAsDraft);
    assert.equal(execution.committedEvents.length, 1);
    assert.equal(repository.product?.lifecycleState.value, "Draft");
    assert.equal("missingPublicationReasons" in execution.result && execution.result.missingPublicationReasons.length, 1);
  });

  it("publishes a ready Product and extracts events only after successful create", async () => {
    const repository = new MemoryRepository();
    const execution = await useCase(repository).save.execute({ operation: "Create", catalogId, ...editable() });
    assert.equal(execution.result.outcome, SMART_SAVE_PRODUCT_OUTCOMES.savedAndPublished);
    assert.deepEqual(execution.committedEvents.map((event) => event.eventName), ["ProductCreated", "ProductPublished"]);
    assert.deepEqual(repository.product?.events, []);
  });

  for (const conflict of ["id", "code"] as const) {
    it(`maps ${conflict} create conflict without committed events`, async () => {
      const repository = new MemoryRepository(); repository.createConflict = conflict;
      const execution = await useCase(repository).save.execute({ operation: "Create", catalogId, ...editable() });
      assert.equal(execution.result.outcome, conflict === "id" ? "ProductIdConflict" : "ProductCodeConflict");
      assert.deepEqual(execution.committedEvents, []);
      assert.ok(repository.product!.events.length > 0);
    });
  }
});

describe("Smart Save Product lifecycle matrix", () => {
  const cases = [
    ["Draft", undefined, nameRequirements, null, "SavedAsDraft", "Draft"],
    ["Draft", undefined, emptyRequirements, "Ready", "SavedAndPublished", "Published"],
    ["Published", undefined, emptyRequirements, "Ready", "SavedPublishedUpdate", "Published"],
    ["Published", undefined, nameRequirements, null, "SavedAndAutoArchived", "Archived"],
    ["Archived", PRODUCT_ARCHIVE_REASONS.publicationRequirementsNotMet, nameRequirements, null, "SavedArchivedUpdate", "Archived"],
    ["Archived", PRODUCT_ARCHIVE_REASONS.publicationRequirementsNotMet, emptyRequirements, "Ready", "SavedAndAutoRestored", "Published"],
    ["Archived", PRODUCT_ARCHIVE_REASONS.manual, nameRequirements, null, "SavedArchivedUpdate", "Archived"],
    ["Archived", PRODUCT_ARCHIVE_REASONS.manual, emptyRequirements, "Ready", "SavedArchivedUpdate", "Archived"],
  ] as const;
  for (const [state, reason, requirements, name, outcome, resultingState] of cases) {
    it(`${state}/${reason ?? "None"}/${name ? "ready" : "incomplete"} -> ${outcome}`, async () => {
      const repository = new MemoryRepository(); repository.product = stored(state, reason);
      const context = useCase(repository, requirements);
      const execution = await context.save.execute(updateCommand(4, name));
      assert.equal(execution.result.outcome, outcome);
      assert.equal(repository.product.lifecycleState.value, resultingState);
      assert.equal(context.resolutions(), 1);
      if (reason === PRODUCT_ARCHIVE_REASONS.manual) assert.equal(repository.product.archiveReason?.value, reason);
    });
  }
});

describe("Smart Save Product expected conflicts", () => {
  it("returns ProductNotFound without resolving requirements or writing", async () => {
    const repository = new MemoryRepository(); const context = useCase(repository);
    const result = await context.save.execute(updateCommand(4));
    assert.equal(result.result.outcome, "ProductNotFound"); assert.equal(context.resolutions(), 0); assert.equal(repository.updates, 0);
  });
  it("returns command RevisionConflict details without retry", async () => {
    const repository = new MemoryRepository(); repository.product = stored("Draft");
    const result = await useCase(repository).save.execute(updateCommand(3));
    assert.equal(result.result.outcome, "RevisionConflict"); assert.equal(repository.updates, 0);
  });
  for (const conflict of ["revision", "code"] as const) {
    it(`maps repository ${conflict} update conflict once and commits no events`, async () => {
      const repository = new MemoryRepository(); repository.product = stored("Draft"); repository.updateConflict = conflict;
      const result = await useCase(repository).save.execute(updateCommand(4));
      assert.equal(result.result.outcome, conflict === "revision" ? "RevisionConflict" : "ProductCodeConflict");
      assert.equal(repository.updates, 1); assert.deepEqual(result.committedEvents, []);
    });
  }
});

describe("Smart Save Product Catalog identity contract", () => {
  it("requires CatalogId for create and excludes it from update", () => {
    const updateContainsCatalogId: "catalogId" extends keyof UpdateSmartSaveProductCommand ? true : false = false;
    assert.equal(updateContainsCatalogId, false);
    const create: SmartSaveProductCommand = { operation: "Create", catalogId, ...editable() };
    assert.equal(create.catalogId.value, catalogId.value);
  });

  it("resolves update requirements with the loaded immutable CatalogId", async () => {
    const repository = new MemoryRepository();
    const loadedCatalogId = CatalogId.create("catalog-loaded");
    repository.product = Product.rehydrate({
      workspaceId, catalogId: loadedCatalogId, productId, lifecycleState: "Draft",
      revision: 4, createdAt: new Date("2026-07-20T00:00:00Z"), updatedAt: new Date("2026-07-21T00:00:00Z"),
      classification: editable().classification, commercialDetails: editable().commercialDetails,
    });
    const result = await useCase(repository).save.execute(updateCommand(4));
    assert.equal(result.result.outcome, "SavedAndPublished");
    assert.equal(repository.product.identity.catalogId.value, loadedCatalogId.value);
  });
});

describe("ProductArchiveReason", () => {
  it("supports only immutable Manual and PublicationRequirementsNotMet values", () => {
    const manual = ProductArchiveReason.manual();
    assert.equal(manual.value, "Manual");
    assert.ok(manual.equals(ProductArchiveReason.rehydrate("Manual")));
    assert.equal(ProductArchiveReason.publicationRequirementsNotMet().value, "PublicationRequirementsNotMet");
    assert.ok(Object.isFrozen(manual));
    assert.throws(() => ProductArchiveReason.rehydrate("Other" as never), /Unsupported/);
  });
});
