import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductCreated } from "./product-created.event";
import { CatalogId, ProductId, WorkspaceId } from "./product-identity.value-object";
import { Product } from "./product.aggregate";
import { PRODUCT_LIFECYCLE_STATES } from "./product-lifecycle-state.value-object";

const identity = () => ({
  productId: ProductId.create("product-001"),
  workspaceId: WorkspaceId.create("workspace-001"),
  catalogId: CatalogId.create("catalog-001"),
});

describe("Product identity", () => {
  it("accepts valid typed identity values", () => {
    const values = identity();

    assert.equal(values.productId.value, "product-001");
    assert.equal(values.workspaceId.value, "workspace-001");
    assert.equal(values.catalogId.value, "catalog-001");
  });

  it("rejects empty ProductId", () => {
    assert.throws(() => ProductId.create("  "), /ProductId cannot be empty/);
  });

  it("rejects empty WorkspaceId", () => {
    assert.throws(() => WorkspaceId.create(""), /WorkspaceId cannot be empty/);
  });

  it("rejects empty CatalogId", () => {
    assert.throws(() => CatalogId.create("\t"), /CatalogId cannot be empty/);
  });
});

describe("Product creation", () => {
  it("creates a Draft Product with supplied identity and deterministic timestamps", () => {
    const createdAt = new Date("2026-07-19T08:00:00.000Z");
    const product = Product.create({ ...identity(), createdAt });

    assert.equal(product.identity.productId.value, "product-001");
    assert.equal(product.identity.workspaceId.value, "workspace-001");
    assert.equal(product.identity.catalogId.value, "catalog-001");
    assert.equal(product.lifecycleState.value, PRODUCT_LIFECYCLE_STATES.draft);
    assert.equal(product.createdAt.toISOString(), createdAt.toISOString());
    assert.equal(product.updatedAt.toISOString(), createdAt.toISOString());
  });

  it("records ProductCreated exactly once with the Product scope", () => {
    const createdAt = new Date("2026-07-19T08:00:00.000Z");
    const product = Product.create({ ...identity(), createdAt });

    assert.equal(product.events.length, 1);
    assert.ok(product.events[0] instanceof ProductCreated);

    const event = product.events[0] as ProductCreated;
    assert.equal(event.eventName, "ProductCreated");
    assert.equal(event.productId.value, "product-001");
    assert.equal(event.workspaceId.value, "workspace-001");
    assert.equal(event.catalogId.value, "catalog-001");
    assert.equal(event.occurredAt.toISOString(), createdAt.toISOString());
  });

  it("protects createdAt and updatedAt from external Date mutation", () => {
    const createdAt = new Date("2026-07-19T08:00:00.000Z");
    const product = Product.create({ ...identity(), createdAt });
    const exposedCreatedAt = product.createdAt;
    const exposedUpdatedAt = product.updatedAt;

    exposedCreatedAt.setUTCFullYear(2030);
    exposedUpdatedAt.setUTCFullYear(2031);

    assert.equal(product.createdAt.toISOString(), createdAt.toISOString());
    assert.equal(product.updatedAt.toISOString(), createdAt.toISOString());
  });

  it("protects ProductCreated occurredAt from external Date mutation", () => {
    const createdAt = new Date("2026-07-19T08:00:00.000Z");
    const product = Product.create({ ...identity(), createdAt });
    const event = product.events[0] as ProductCreated;
    const exposedOccurredAt = event.occurredAt;

    exposedOccurredAt.setUTCFullYear(2032);

    assert.equal(event.occurredAt.toISOString(), createdAt.toISOString());
  });
});

describe("Product rehydration", () => {
  const createdAt = new Date("2026-07-18T08:00:00.000Z");
  const updatedAt = new Date("2026-07-19T09:30:00.000Z");

  for (const lifecycleState of Object.values(PRODUCT_LIFECYCLE_STATES)) {
    it(`preserves ${lifecycleState} lifecycle, identity, and timestamps`, () => {
      const product = Product.rehydrate({
        ...identity(),
        lifecycleState,
        createdAt,
        updatedAt,
      });

      assert.equal(product.identity.productId.value, "product-001");
      assert.equal(product.identity.workspaceId.value, "workspace-001");
      assert.equal(product.identity.catalogId.value, "catalog-001");
      assert.equal(product.lifecycleState.value, lifecycleState);
      assert.equal(product.createdAt.toISOString(), createdAt.toISOString());
      assert.equal(product.updatedAt.toISOString(), updatedAt.toISOString());
      assert.deepEqual(product.events, []);
    });
  }

  it("rejects an invalid persisted lifecycle state", () => {
    assert.throws(
      () =>
        Product.rehydrate({
          ...identity(),
          lifecycleState: "Deleted" as never,
          createdAt,
          updatedAt,
        }),
      /Invalid Product lifecycle state/,
    );
  });

  it("rejects timestamps where CreatedAt is later than UpdatedAt", () => {
    assert.throws(
      () =>
        Product.rehydrate({
          ...identity(),
          lifecycleState: PRODUCT_LIFECYCLE_STATES.draft,
          createdAt: updatedAt,
          updatedAt: createdAt,
        }),
      /CreatedAt cannot be later than UpdatedAt/,
    );
  });

  it("protects rehydrated timestamps from external Date mutation", () => {
    const product = Product.rehydrate({
      ...identity(),
      lifecycleState: PRODUCT_LIFECYCLE_STATES.published,
      createdAt,
      updatedAt,
    });
    const exposedCreatedAt = product.createdAt;
    const exposedUpdatedAt = product.updatedAt;

    exposedCreatedAt.setTime(0);
    exposedUpdatedAt.setTime(0);

    assert.equal(product.createdAt.toISOString(), createdAt.toISOString());
    assert.equal(product.updatedAt.toISOString(), updatedAt.toISOString());
  });
});

describe("Product Domain Events", () => {
  it("does not expose its mutable internal event collection", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
    });
    const exposedEvents = product.events as ProductCreated[];

    exposedEvents.length = 0;

    assert.equal(product.events.length, 1);
  });

  it("pulls events without changing Product business state", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
    });
    const productIdBeforePull = product.identity.productId.value;
    const workspaceIdBeforePull = product.identity.workspaceId.value;
    const catalogIdBeforePull = product.identity.catalogId.value;
    const lifecycleBeforePull = product.lifecycleState.value;
    const createdAtBeforePull = product.createdAt.toISOString();
    const updatedAtBeforePull = product.updatedAt.toISOString();

    const pulledEvents = product.pullDomainEvents();
    const secondPull = product.pullDomainEvents();

    assert.equal(pulledEvents.length, 1);
    assert.deepEqual(secondPull, []);
    assert.deepEqual(product.events, []);
    assert.equal(product.identity.productId.value, productIdBeforePull);
    assert.equal(product.identity.workspaceId.value, workspaceIdBeforePull);
    assert.equal(product.identity.catalogId.value, catalogIdBeforePull);
    assert.equal(product.lifecycleState.value, lifecycleBeforePull);
    assert.equal(product.createdAt.toISOString(), createdAtBeforePull);
    assert.equal(product.updatedAt.toISOString(), updatedAtBeforePull);
  });
});

// @ts-expect-error Product construction is intentionally controlled by factories.
const constructProductDirectly = () => new Product({});

const assignLifecycleDirectly = (product: Product) => {
  // @ts-expect-error Product lifecycle has no public setter.
  product.lifecycleState = PRODUCT_LIFECYCLE_STATES.published;
};

void constructProductDirectly;
void assignLifecycleDirectly;
