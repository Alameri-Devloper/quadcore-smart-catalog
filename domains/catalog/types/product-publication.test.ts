import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductArchived } from "./product-archived.event";
import { ProductTypeId } from "./product-classification.value-object";
import { ProductId, WorkspaceId, CatalogId } from "./product-identity.value-object";
import { PRODUCT_LIFECYCLE_STATES } from "./product-lifecycle-state.value-object";
import {
  ProductPublicationPolicy,
  type ProductPublicationDecision,
} from "./product-publication-policy";
import { PRODUCT_PUBLICATION_REASON_CODES } from "./product-publication-reason.value-object";
import {
  PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS,
  PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS,
  PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS,
  ProductPublicationRequirements,
} from "./product-publication-requirements.value-object";
import { ProductPublished } from "./product-published.event";
import { ProductRestored } from "./product-restored.event";
import { Product } from "./product.aggregate";

const createdAt = new Date("2026-07-19T08:00:00.000Z");
const firstUpdate = new Date("2026-07-19T09:00:00.000Z");
const secondUpdate = new Date("2026-07-19T10:00:00.000Z");
const thirdUpdate = new Date("2026-07-19T11:00:00.000Z");

const productIdentity = (productId = "product-001") => ({
  productId: ProductId.create(productId),
  workspaceId: WorkspaceId.create("workspace-001"),
  catalogId: CatalogId.create("catalog-001"),
});

const completeComposition = () => ({
  classification: {
    categoryId: "category-001",
    productTypeId: ProductTypeId.create("product-type-001"),
    deviceClassId: "device-class-001",
    conditionId: "condition-001",
    availabilityStatusId: "availability-001",
  },
  commercialDetails: {
    productName: "Product name",
    productCode: "PRODUCT-001",
    productModelId: "model-001",
    brandId: "brand-001",
    pricing: {
      retailPrice: { amountMinor: 12000, currency: "USD" },
      wholesalePrice: { amountMinor: 10000, currency: "USD" },
    },
  },
  specificationValues: [
    { specificationFieldId: "field-a", value: "value-a" },
    { specificationFieldId: "field-b", value: false },
  ],
  images: [
    {
      productImageId: "image-001",
      storageReference: "products/image-001.webp",
      order: 0,
      isMain: true,
    },
  ],
});

const allRequirements = () =>
  ProductPublicationRequirements.create({
    classification: Object.values(
      PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS,
    ),
    commercial: Object.values(PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS),
    requiredSpecificationFieldIds: ["field-a", "field-b"],
    image: PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS.mainImageRequired,
  });

const createCompleteDraft = (productId = "product-001") =>
  Product.create({
    ...productIdentity(productId),
    ...completeComposition(),
    createdAt,
  });

const rehydrateCompleteProduct = (
  lifecycleState: (typeof PRODUCT_LIFECYCLE_STATES)[keyof typeof PRODUCT_LIFECYCLE_STATES],
  revision = 5,
  productId = "product-001",
) =>
  Product.rehydrate({
    ...productIdentity(productId),
    ...completeComposition(),
    lifecycleState,
    revision,
    createdAt,
    updatedAt: firstUpdate,
  });

const productSnapshot = (product: Product) => ({
  identity: {
    productId: product.identity.productId.value,
    workspaceId: product.identity.workspaceId.value,
    catalogId: product.identity.catalogId.value,
  },
  lifecycleState: product.lifecycleState.value,
  revision: product.revision.value,
  createdAt: product.createdAt.toISOString(),
  updatedAt: product.updatedAt.toISOString(),
  classification: product.classification
    ? {
        categoryId: product.classification.categoryId,
        productTypeId: product.classification.productTypeId?.value,
        deviceClassId: product.classification.deviceClassId,
        conditionId: product.classification.conditionId,
        availabilityStatusId: product.classification.availabilityStatusId,
      }
    : undefined,
  commercialDetails: product.commercialDetails
    ? {
        productName: product.commercialDetails.productName,
        productCode: product.commercialDetails.productCode?.value,
        productModelId: product.commercialDetails.productModelId,
        brandId: product.commercialDetails.brandId,
        retailPrice: product.commercialDetails.pricing?.retailPrice?.amountMinor,
        wholesalePrice:
          product.commercialDetails.pricing?.wholesalePrice?.amountMinor,
      }
    : undefined,
  specificationValues: product.specificationValues.map((value) => ({
    fieldId: value.specificationFieldId,
    value: value.value,
  })),
  images: product.images.map((image) => ({
    id: image.productImageId,
    storageReference: image.storageReference,
    order: image.order,
    isMain: image.isMain,
  })),
  events: product.events.map((event) => ({
    name: event.eventName,
    occurredAt: event.occurredAt.toISOString(),
  })),
});

describe("Product Revision", () => {
  it("starts new Products and their initial composition at Revision 0", () => {
    const emptyProduct = Product.create({ ...productIdentity(), createdAt });
    const completeProduct = createCompleteDraft();

    assert.equal(emptyProduct.revision.value, 0);
    assert.equal(completeProduct.revision.value, 0);
  });

  it("rehydrates an explicit persisted Revision", () => {
    const product = rehydrateCompleteProduct(
      PRODUCT_LIFECYCLE_STATES.published,
      42,
    );

    assert.equal(product.revision.value, 42);
  });

  for (const revision of [-1, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
    it(`rejects invalid persisted Revision ${revision}`, () => {
      assert.throws(
        () =>
          Product.rehydrate({
            ...productIdentity(),
            lifecycleState: PRODUCT_LIFECYCLE_STATES.draft,
            revision,
            createdAt,
            updatedAt: createdAt,
          }),
        /non-negative safe integer/,
      );
    });
  }

  it("increments once for each effective content update", () => {
    const product = Product.create({ ...productIdentity(), createdAt });

    product.updateClassification(
      { categoryId: "category-001" },
      firstUpdate,
    );
    product.updateCommercialDetails(
      { productName: "Product name" },
      secondUpdate,
    );
    product.replaceSpecificationValues(
      [{ specificationFieldId: "field-a", value: 0 }],
      thirdUpdate,
    );
    product.replaceImages(
      [
        {
          productImageId: "image-001",
          storageReference: "products/image-001.webp",
          order: 0,
          isMain: true,
        },
      ],
      thirdUpdate,
    );

    assert.equal(product.revision.value, 4);
  });

  it("does not increment for a no-op, a failed update, or event pulling", () => {
    const product = createCompleteDraft();
    const revision = product.revision.value;

    assert.equal(
      product.updateClassification(completeComposition().classification, firstUpdate),
      false,
    );
    assert.throws(
      () =>
        product.replaceImages(
          [
            {
              productImageId: "invalid-image",
              storageReference: " ",
              order: 0,
              isMain: true,
            },
          ],
          firstUpdate,
        ),
      /StorageReference cannot be empty/,
    );
    product.pullDomainEvents();

    assert.equal(product.revision.value, revision);
  });

  it("rejects revision overflow before changing content", () => {
    const product = rehydrateCompleteProduct(
      PRODUCT_LIFECYCLE_STATES.draft,
      Number.MAX_SAFE_INTEGER,
    );
    const before = productSnapshot(product);

    assert.throws(
      () =>
        product.updateCommercialDetails(
          { productName: "Changed" },
          secondUpdate,
        ),
      /safe integer limit/,
    );
    assert.deepEqual(productSnapshot(product), before);
  });
});

describe("Product publication requirements", () => {
  it("accepts an empty immutable requirements set", () => {
    const requirements = ProductPublicationRequirements.create();

    assert.deepEqual(requirements.classification, []);
    assert.deepEqual(requirements.commercial, []);
    assert.deepEqual(requirements.requiredSpecificationFieldIds, []);
    assert.equal(requirements.image, PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS.none);
    assert.equal(Object.isFrozen(requirements), true);
  });

  it("accepts configured requirements and orders them deterministically", () => {
    const requirements = ProductPublicationRequirements.create({
      classification: [
        PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.condition,
        PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.category,
      ],
      commercial: [
        PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.wholesalePrice,
        PRODUCT_PUBLICATION_COMMERCIAL_REQUIREMENTS.productName,
      ],
      requiredSpecificationFieldIds: ["field-z", "field-a"],
      image: PRODUCT_PUBLICATION_IMAGE_REQUIREMENTS.mainImageRequired,
    });

    assert.deepEqual(requirements.classification, ["Category", "Condition"]);
    assert.deepEqual(requirements.commercial, [
      "ProductName",
      "WholesalePrice",
    ]);
    assert.deepEqual(requirements.requiredSpecificationFieldIds, [
      "field-a",
      "field-z",
    ]);
  });

  it("rejects empty and duplicate required Specification Field IDs", () => {
    assert.throws(
      () =>
        ProductPublicationRequirements.create({
          requiredSpecificationFieldIds: [" "],
        }),
      /cannot be empty/,
    );
    assert.throws(
      () =>
        ProductPublicationRequirements.create({
          requiredSpecificationFieldIds: ["field-a", "field-a"],
        }),
      /Duplicate required SpecificationFieldId/,
    );
  });

  it("rejects duplicate typed requirements", () => {
    assert.throws(
      () =>
        ProductPublicationRequirements.create({
          classification: [
            PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.category,
            PRODUCT_PUBLICATION_CLASSIFICATION_REQUIREMENTS.category,
          ],
        }),
      /Duplicate publication classification requirement/,
    );
  });

  it("defensively exposes requirement collections", () => {
    const requirements = allRequirements();
    const classification = requirements.classification as string[];
    const commercial = requirements.commercial as string[];
    const specificationIds = requirements.requiredSpecificationFieldIds as string[];

    classification.length = 0;
    commercial.length = 0;
    specificationIds.length = 0;

    assert.equal(requirements.classification.length, 5);
    assert.equal(requirements.commercial.length, 6);
    assert.equal(requirements.requiredSpecificationFieldIds.length, 2);
  });
});

describe("Product Publication Policy", () => {
  it("approves a complete Product without mutating it or raising an event", () => {
    const product = createCompleteDraft();
    product.pullDomainEvents();
    const before = productSnapshot(product);

    const decision = ProductPublicationPolicy.evaluate(product, allRequirements());

    assert.equal(decision.allowed, true);
    assert.equal(decision.productId.value, "product-001");
    assert.equal(decision.evaluatedRevision.value, 0);
    assert.deepEqual(decision.reasons, []);
    assert.deepEqual(productSnapshot(product), before);
  });

  it("returns every configured missing reason in deterministic order", () => {
    const product = Product.create({ ...productIdentity(), createdAt });
    const decision = ProductPublicationPolicy.evaluate(product, allRequirements());

    assert.equal(decision.allowed, false);
    assert.deepEqual(
      decision.reasons.map((reason) => reason.code),
      [
        PRODUCT_PUBLICATION_REASON_CODES.missingCategory,
        PRODUCT_PUBLICATION_REASON_CODES.missingProductType,
        PRODUCT_PUBLICATION_REASON_CODES.missingDeviceClass,
        PRODUCT_PUBLICATION_REASON_CODES.missingCondition,
        PRODUCT_PUBLICATION_REASON_CODES.missingAvailabilityStatus,
        PRODUCT_PUBLICATION_REASON_CODES.missingProductName,
        PRODUCT_PUBLICATION_REASON_CODES.missingProductCode,
        PRODUCT_PUBLICATION_REASON_CODES.missingProductModel,
        PRODUCT_PUBLICATION_REASON_CODES.missingBrand,
        PRODUCT_PUBLICATION_REASON_CODES.missingRetailPrice,
        PRODUCT_PUBLICATION_REASON_CODES.missingWholesalePrice,
        PRODUCT_PUBLICATION_REASON_CODES.missingRequiredSpecification,
        PRODUCT_PUBLICATION_REASON_CODES.missingRequiredSpecification,
        PRODUCT_PUBLICATION_REASON_CODES.missingMainImage,
      ],
    );
    assert.deepEqual(
      decision.reasons
        .filter(
          (reason) =>
            reason.code ===
            PRODUCT_PUBLICATION_REASON_CODES.missingRequiredSpecification,
        )
        .map((reason) => reason.specificationFieldId),
      ["field-a", "field-b"],
    );
  });

  it("defensively exposes immutable decisions and reasons", () => {
    const product = Product.create({ ...productIdentity(), createdAt });
    const decision = ProductPublicationPolicy.evaluate(product, allRequirements());
    const reasons = decision.reasons as unknown[];

    reasons.length = 0;

    assert.equal(Object.isFrozen(decision), true);
    assert.equal(Object.isFrozen(decision.reasons[0]), true);
    assert.equal(decision.reasons.length, 14);
  });
});

describe("Product publish transition", () => {
  it("publishes a Draft atomically with a current approved decision", () => {
    const product = createCompleteDraft();
    const compositionBefore = productSnapshot(product);
    const decision = ProductPublicationPolicy.evaluate(product, allRequirements());
    product.pullDomainEvents();

    product.publish(decision, firstUpdate);

    assert.equal(product.lifecycleState.value, PRODUCT_LIFECYCLE_STATES.published);
    assert.equal(product.revision.value, 1);
    assert.equal(product.createdAt.toISOString(), compositionBefore.createdAt);
    assert.equal(product.updatedAt.toISOString(), firstUpdate.toISOString());
    assert.equal(product.events.length, 1);
    assert.ok(product.events[0] instanceof ProductPublished);
    const event = product.events[0] as ProductPublished;
    assert.equal(event.previousLifecycleState, PRODUCT_LIFECYCLE_STATES.draft);
    assert.equal(event.currentLifecycleState, PRODUCT_LIFECYCLE_STATES.published);
    assert.equal(event.resultingRevision, 1);
    assert.deepEqual(product.specificationValues, createCompleteDraft().specificationValues);
    assert.deepEqual(product.images, createCompleteDraft().images);
  });

  it("rejects a denied decision without changing the Draft", () => {
    const product = createCompleteDraft();
    const denied = ProductPublicationPolicy.evaluate(
      product,
      ProductPublicationRequirements.create({
        requiredSpecificationFieldIds: ["missing-field"],
      }),
    );
    const before = productSnapshot(product);

    assert.throws(() => product.publish(denied, firstUpdate), /decision is denied/);
    assert.deepEqual(productSnapshot(product), before);
  });

  it("rejects wrong-Product, stale, and fabricated decisions atomically", () => {
    const product = createCompleteDraft();
    const otherProduct = createCompleteDraft("product-002");
    const wrongProductDecision = ProductPublicationPolicy.evaluate(
      otherProduct,
      allRequirements(),
    );
    const beforeWrongProduct = productSnapshot(product);

    assert.throws(
      () => product.publish(wrongProductDecision, firstUpdate),
      /another Product/,
    );
    assert.deepEqual(productSnapshot(product), beforeWrongProduct);

    const staleDecision = ProductPublicationPolicy.evaluate(product, allRequirements());
    product.updateCommercialDetails(
      { ...completeComposition().commercialDetails, productName: "Changed" },
      firstUpdate,
    );
    const beforeStale = productSnapshot(product);
    assert.throws(
      () => product.publish(staleDecision, secondUpdate),
      /decision is stale/,
    );
    assert.deepEqual(productSnapshot(product), beforeStale);

    const fabricated = {
      allowed: true,
      productId: product.identity.productId,
      evaluatedRevision: product.revision,
      reasons: [],
    } as ProductPublicationDecision;
    const beforeFabricated = productSnapshot(product);
    assert.throws(
      () => product.publish(fabricated, secondUpdate),
      /not issued by ProductPublicationPolicy/,
    );
    assert.deepEqual(productSnapshot(product), beforeFabricated);
  });

  it("rejects an explicit Published to Published transition", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.published);
    const decision = ProductPublicationPolicy.evaluate(product, allRequirements());
    const before = productSnapshot(product);

    assert.throws(() => product.publish(decision, secondUpdate), /Only a Draft/);
    assert.deepEqual(productSnapshot(product), before);
  });
});

describe("Product archive transition", () => {
  it("archives a Published Product and records one event", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.published);

    product.archive(secondUpdate);

    assert.equal(product.lifecycleState.value, PRODUCT_LIFECYCLE_STATES.archived);
    assert.equal(product.revision.value, 6);
    assert.equal(product.updatedAt.toISOString(), secondUpdate.toISOString());
    assert.equal(product.events.length, 1);
    assert.ok(product.events[0] instanceof ProductArchived);
    const event = product.events[0] as ProductArchived;
    assert.equal(event.previousLifecycleState, PRODUCT_LIFECYCLE_STATES.published);
    assert.equal(event.currentLifecycleState, PRODUCT_LIFECYCLE_STATES.archived);
    assert.equal(event.resultingRevision, 6);
  });

  for (const lifecycleState of [
    PRODUCT_LIFECYCLE_STATES.draft,
    PRODUCT_LIFECYCLE_STATES.archived,
  ]) {
    it(`rejects ${lifecycleState} to Archived without mutation`, () => {
      const product = rehydrateCompleteProduct(lifecycleState);
      const before = productSnapshot(product);

      assert.throws(() => product.archive(secondUpdate), /Only a Published/);
      assert.deepEqual(productSnapshot(product), before);
    });
  }
});

describe("Product restore transition", () => {
  it("restores an Archived Product with a new current approval", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.archived);
    const decision = ProductPublicationPolicy.evaluate(product, allRequirements());

    product.restore(decision, secondUpdate);

    assert.equal(product.lifecycleState.value, PRODUCT_LIFECYCLE_STATES.published);
    assert.equal(product.revision.value, 6);
    assert.equal(product.createdAt.toISOString(), createdAt.toISOString());
    assert.equal(product.updatedAt.toISOString(), secondUpdate.toISOString());
    assert.equal(product.events.length, 1);
    assert.ok(product.events[0] instanceof ProductRestored);
  });

  it("rejects an old pre-archive approval", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.published);
    const preArchiveDecision = ProductPublicationPolicy.evaluate(
      product,
      allRequirements(),
    );
    product.archive(secondUpdate);
    product.pullDomainEvents();
    const before = productSnapshot(product);

    assert.throws(
      () => product.restore(preArchiveDecision, thirdUpdate),
      /decision is stale/,
    );
    assert.deepEqual(productSnapshot(product), before);
  });

  it("rejects denied, wrong-Product, and stale decisions atomically", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.archived);
    const denied = ProductPublicationPolicy.evaluate(
      product,
      ProductPublicationRequirements.create({
        requiredSpecificationFieldIds: ["missing-field"],
      }),
    );
    const beforeDenied = productSnapshot(product);
    assert.throws(() => product.restore(denied, secondUpdate), /decision is denied/);
    assert.deepEqual(productSnapshot(product), beforeDenied);

    const otherProduct = rehydrateCompleteProduct(
      PRODUCT_LIFECYCLE_STATES.archived,
      product.revision.value,
      "product-002",
    );
    const wrongProduct = ProductPublicationPolicy.evaluate(
      otherProduct,
      allRequirements(),
    );
    const beforeWrongProduct = productSnapshot(product);
    assert.throws(
      () => product.restore(wrongProduct, secondUpdate),
      /another Product/,
    );
    assert.deepEqual(productSnapshot(product), beforeWrongProduct);

    const stale = ProductPublicationPolicy.evaluate(product, allRequirements());
    product.updateCommercialDetails(
      { ...completeComposition().commercialDetails, productName: "Changed" },
      secondUpdate,
    );
    const beforeStale = productSnapshot(product);
    assert.throws(() => product.restore(stale, thirdUpdate), /decision is stale/);
    assert.deepEqual(productSnapshot(product), beforeStale);
  });

  for (const lifecycleState of [
    PRODUCT_LIFECYCLE_STATES.draft,
    PRODUCT_LIFECYCLE_STATES.published,
  ]) {
    it(`rejects ${lifecycleState} to Published restoration`, () => {
      const product = rehydrateCompleteProduct(lifecycleState);
      const decision = ProductPublicationPolicy.evaluate(product, allRequirements());
      const before = productSnapshot(product);

      assert.throws(() => product.restore(decision, secondUpdate), /Only an Archived/);
      assert.deepEqual(productSnapshot(product), before);
    });
  }
});

describe("Product lifecycle event integrity", () => {
  it("protects event timestamps and immutable event data", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.published);
    product.archive(secondUpdate);
    const event = product.events[0] as ProductArchived;
    const exposedTime = event.occurredAt;

    exposedTime.setTime(0);

    assert.equal(event.occurredAt.toISOString(), secondUpdate.toISOString());
    assert.equal(Object.isFrozen(event), true);
  });

  it("pulls transition events once without changing business state or Revision", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.published);
    product.archive(secondUpdate);
    const before = productSnapshot(product);

    const events = product.pullDomainEvents();
    const secondPull = product.pullDomainEvents();

    assert.equal(events.length, 1);
    assert.ok(events[0] instanceof ProductArchived);
    assert.deepEqual(secondPull, []);
    assert.equal(product.revision.value, before.revision);
    assert.equal(product.lifecycleState.value, before.lifecycleState);
    assert.equal(product.updatedAt.toISOString(), before.updatedAt);
  });

  it("rehydration records no lifecycle event", () => {
    const product = rehydrateCompleteProduct(PRODUCT_LIFECYCLE_STATES.archived);

    assert.deepEqual(product.events, []);
  });
});
