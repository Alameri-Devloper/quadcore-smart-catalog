import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { Money, ProductPricing } from "./money.value-object";
import { ProductTypeId } from "./product-classification.value-object";
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

describe("Product Draft composition", () => {
  it("creates a structurally valid incomplete Draft", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
    });

    assert.equal(product.classification, undefined);
    assert.equal(product.commercialDetails?.productName, undefined);
    assert.equal(product.commercialDetails?.isHighlighted, false);
    assert.equal(product.commercialDetails?.pricing, undefined);
    assert.deepEqual(product.specificationValues, []);
    assert.deepEqual(product.images, []);
  });

  it("creates a Product with valid initial composition and copies collections", () => {
    const specificationValues = [
      { specificationFieldId: "ram", value: "16GB" },
    ];
    const images = [
      {
        productImageId: "image-001",
        storageReference: "products/product-001/main.webp",
        order: 0,
        isMain: true,
      },
    ];
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      classification: {
        categoryId: "category-001",
        deviceClassId: "device-class-001",
        conditionId: "condition-new",
        availabilityStatusId: "availability-configured-001",
      },
      commercialDetails: {
        productName: "Lenovo LOQ 15",
        productCode: "PROD-001",
        productModelId: "model-001",
        brandId: "brand-001",
        isHighlighted: true,
        pricing: {
          wholesalePrice: { amountMinor: 80000, currency: "USD" },
          retailPrice: { amountMinor: 87000, currency: "USD" },
        },
      },
      specificationValues,
      images,
    });

    specificationValues.length = 0;
    images.length = 0;

    assert.equal(product.classification?.categoryId, "category-001");
    assert.equal(product.commercialDetails?.productName, "Lenovo LOQ 15");
    assert.equal(
      product.commercialDetails?.pricing?.retailPrice?.amountMinor,
      87000,
    );
    assert.equal(product.specificationValues.length, 1);
    assert.equal(product.images.length, 1);
  });

  it("rejects empty classification references and freezes valid classification", () => {
    assert.throws(
      () =>
        Product.create({
          ...identity(),
          createdAt: new Date("2026-07-19T08:00:00.000Z"),
          classification: { categoryId: " " },
        }),
      /CategoryId cannot be empty/,
    );

    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      classification: { categoryId: "category-001" },
    });

    assert.equal(Object.isFrozen(product.classification), true);
  });
});

describe("Canonical Product Type classification", () => {
  it("creates a valid immutable ProductTypeId", () => {
    const productTypeId = ProductTypeId.create("product-type-standard-laptop");

    assert.equal(productTypeId.value, "product-type-standard-laptop");
    assert.equal(Object.isFrozen(productTypeId), true);
  });

  it("rejects an empty ProductTypeId", () => {
    assert.throws(
      () => ProductTypeId.create("   "),
      /ProductTypeId cannot be empty/,
    );
  });

  it("allows a Draft without ProductTypeId", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      classification: { categoryId: "category-laptops" },
    });

    assert.equal(product.classification?.productTypeId, undefined);
  });

  it("creates and rehydrates ProductTypeId without conflating Device Class", () => {
    const productTypeId = ProductTypeId.create("product-type-standard-laptop");
    const created = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      classification: {
        categoryId: "category-laptops",
        productTypeId,
        deviceClassId: "device-class-gaming",
      },
    });
    const rehydrated = Product.rehydrate({
      ...identity(),
      lifecycleState: PRODUCT_LIFECYCLE_STATES.draft,
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      updatedAt: new Date("2026-07-19T09:00:00.000Z"),
      classification: {
        categoryId: "category-cctv",
        productTypeId: ProductTypeId.create("product-type-camera"),
        deviceClassId: "device-class-commercial",
      },
    });

    assert.equal(created.classification?.productTypeId?.value, productTypeId.value);
    assert.equal(created.classification?.deviceClassId, "device-class-gaming");
    assert.equal(
      rehydrated.classification?.productTypeId?.value,
      "product-type-camera",
    );
    assert.equal(
      rehydrated.classification?.deviceClassId,
      "device-class-commercial",
    );
  });

  it("adds and changes ProductTypeId through controlled classification updates", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      classification: { categoryId: "category-laptops" },
    });

    assert.equal(
      product.updateClassification(
        {
          categoryId: "category-laptops",
          productTypeId: ProductTypeId.create("product-type-standard-laptop"),
        },
        new Date("2026-07-19T09:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      product.classification?.productTypeId?.value,
      "product-type-standard-laptop",
    );

    assert.equal(
      product.updateClassification(
        {
          categoryId: "category-laptops",
          productTypeId: ProductTypeId.create("product-type-convertible-laptop"),
        },
        new Date("2026-07-19T10:00:00.000Z"),
      ),
      true,
    );
    assert.equal(
      product.classification?.productTypeId?.value,
      "product-type-convertible-laptop",
    );
  });

  it("treats an equivalent ProductTypeId update as a no-op", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      classification: {
        categoryId: "category-laptops",
        productTypeId: ProductTypeId.create("product-type-standard-laptop"),
      },
    });
    const updatedAtBeforeNoOp = product.updatedAt.toISOString();

    const changed = product.updateClassification(
      {
        categoryId: "category-laptops",
        productTypeId: ProductTypeId.create("product-type-standard-laptop"),
      },
      new Date("2026-07-19T09:00:00.000Z"),
    );

    assert.equal(changed, false);
    assert.equal(product.updatedAt.toISOString(), updatedAtBeforeNoOp);
  });

  it("rejects an invalid ProductTypeId update without changing Product", () => {
    const originalProductTypeId = ProductTypeId.create(
      "product-type-standard-laptop",
    );
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      classification: {
        categoryId: "category-laptops",
        productTypeId: originalProductTypeId,
      },
    });
    const updatedAtBeforeUpdate = product.updatedAt.toISOString();

    assert.throws(
      () =>
        product.updateClassification(
          {
            categoryId: "category-laptops",
            productTypeId: " " as never,
          },
          new Date("2026-07-19T09:00:00.000Z"),
        ),
      /ProductTypeId must be a valid typed identifier/,
    );

    assert.equal(
      product.classification?.productTypeId?.value,
      originalProductTypeId.value,
    );
    assert.equal(product.updatedAt.toISOString(), updatedAtBeforeUpdate);
  });
});

describe("Product commercial details and pricing", () => {
  it("rejects empty provided commercial text", () => {
    assert.throws(
      () =>
        Product.create({
          ...identity(),
          createdAt: new Date("2026-07-19T08:00:00.000Z"),
          commercialDetails: { productName: "   " },
        }),
      /ProductName cannot be empty/,
    );
  });

  it("accepts valid Money and optional Product pricing", () => {
    const money = Money.create({ amountMinor: 1250, currency: "USD" });
    const emptyPricing = ProductPricing.create();
    const wholesaleOnly = ProductPricing.create({
      wholesalePrice: { amountMinor: 1000, currency: "USD" },
    });
    const retailOnly = ProductPricing.create({
      retailPrice: { amountMinor: 1250, currency: "USD" },
    });

    assert.equal(money.amountMinor, 1250);
    assert.equal(money.currency, "USD");
    assert.equal(emptyPricing.wholesalePrice, undefined);
    assert.equal(emptyPricing.retailPrice, undefined);
    assert.equal(wholesaleOnly.retailPrice, undefined);
    assert.equal(retailOnly.wholesalePrice, undefined);
  });

  it("rejects negative or floating-point Money", () => {
    assert.throws(
      () => Money.create({ amountMinor: -1, currency: "USD" }),
      /non-negative safe integer/,
    );
    assert.throws(
      () => Money.create({ amountMinor: 10.5, currency: "USD" }),
      /non-negative safe integer/,
    );
  });

  it("rejects empty or non-normalized currency", () => {
    assert.throws(
      () => Money.create({ amountMinor: 100, currency: "" }),
      /currency must be non-empty and normalized/,
    );
    assert.throws(
      () => Money.create({ amountMinor: 100, currency: "usd" }),
      /currency must be non-empty and normalized/,
    );
  });

  it("exposes frozen commercial and pricing values", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      commercialDetails: {
        productName: "Product",
        pricing: { retailPrice: { amountMinor: 100, currency: "USD" } },
      },
    });

    assert.equal(Object.isFrozen(product.commercialDetails), true);
    assert.equal(Object.isFrozen(product.commercialDetails?.pricing), true);
    assert.equal(
      Object.isFrozen(product.commercialDetails?.pricing?.retailPrice),
      true,
    );
  });
});

describe("Product specification values", () => {
  it("accepts unique values and rejects duplicate Field IDs", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      specificationValues: [
        { specificationFieldId: "ram", value: "16GB" },
        { specificationFieldId: "touch", value: false },
      ],
    });

    assert.equal(product.specificationValues.length, 2);
    assert.throws(
      () =>
        product.replaceSpecificationValues(
          [
            { specificationFieldId: "ram", value: "16GB" },
            { specificationFieldId: "ram", value: "32GB" },
          ],
          new Date("2026-07-19T09:00:00.000Z"),
        ),
      /Duplicate SpecificationFieldId/,
    );
    assert.equal(product.specificationValues.length, 2);
  });

  it("does not expose its internal specification array", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      specificationValues: [{ specificationFieldId: "ram", value: "16GB" }],
    });
    const exposedValues = product.specificationValues as unknown[];

    exposedValues.length = 0;

    assert.equal(product.specificationValues.length, 1);
    assert.equal(Object.isFrozen(product.specificationValues[0]), true);
  });

  it("rejects an empty SpecificationFieldId", () => {
    assert.throws(
      () =>
        Product.create({
          ...identity(),
          createdAt: new Date("2026-07-19T08:00:00.000Z"),
          specificationValues: [{ specificationFieldId: "", value: true }],
        }),
      /SpecificationFieldId cannot be empty/,
    );
  });
});

describe("Product images", () => {
  const mainImage = {
    productImageId: "image-001",
    storageReference: "products/product-001/main.webp",
    order: 0,
    isMain: true,
  };

  it("accepts no images or a valid one-Main-image collection", () => {
    const withoutImages = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
    });
    const withImages = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      images: [mainImage],
    });

    assert.deepEqual(withoutImages.images, []);
    assert.equal(withImages.images[0].isMain, true);
  });

  it("rejects duplicate image IDs and conflicting orders", () => {
    const productInput = {
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
    };

    assert.throws(
      () =>
        Product.create({
          ...productInput,
          images: [
            mainImage,
            { ...mainImage, storageReference: "second.webp", order: 1 },
          ],
        }),
      /Duplicate ProductImageId/,
    );
    assert.throws(
      () =>
        Product.create({
          ...productInput,
          images: [
            mainImage,
            {
              ...mainImage,
              productImageId: "image-002",
              storageReference: "second.webp",
              isMain: false,
            },
          ],
        }),
      /Conflicting Product Image order/,
    );
  });

  it("rejects zero or multiple Main Images", () => {
    const productInput = {
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
    };

    assert.throws(
      () => Product.create({ ...productInput, images: [{ ...mainImage, isMain: false }] }),
      /exactly one Main Image/,
    );
    assert.throws(
      () =>
        Product.create({
          ...productInput,
          images: [
            mainImage,
            {
              ...mainImage,
              productImageId: "image-002",
              storageReference: "second.webp",
              order: 1,
            },
          ],
        }),
      /exactly one Main Image/,
    );
  });

  it("rejects an empty StorageReference", () => {
    assert.throws(
      () =>
        Product.create({
          ...identity(),
          createdAt: new Date("2026-07-19T08:00:00.000Z"),
          images: [{ ...mainImage, storageReference: " " }],
        }),
      /StorageReference cannot be empty/,
    );
  });

  it("does not expose its internal image array", () => {
    const product = Product.create({
      ...identity(),
      createdAt: new Date("2026-07-19T08:00:00.000Z"),
      images: [mainImage],
    });
    const exposedImages = product.images as unknown[];

    exposedImages.length = 0;

    assert.equal(product.images.length, 1);
    assert.equal(Object.isFrozen(product.images[0]), true);
  });
});

describe("Product composition rehydration and updates", () => {
  const createdAt = new Date("2026-07-18T08:00:00.000Z");
  const updatedAt = new Date("2026-07-19T08:00:00.000Z");

  it("rehydrates valid composition without normalization", () => {
    const product = Product.rehydrate({
      ...identity(),
      lifecycleState: PRODUCT_LIFECYCLE_STATES.archived,
      createdAt,
      updatedAt,
      classification: { categoryId: "category-001" },
      commercialDetails: { productName: "Stored Product", isHighlighted: true },
      specificationValues: [{ specificationFieldId: "ram", value: "16GB" }],
      images: [
        {
          productImageId: "image-001",
          storageReference: "stored/main.webp",
          order: 7,
          isMain: true,
          altText: "Stored image",
        },
      ],
    });

    assert.equal(product.classification?.categoryId, "category-001");
    assert.equal(product.commercialDetails?.productName, "Stored Product");
    assert.equal(product.commercialDetails?.isHighlighted, true);
    assert.equal(product.specificationValues[0].value, "16GB");
    assert.equal(product.images[0].order, 7);
    assert.equal(product.images[0].altText, "Stored image");
    assert.deepEqual(product.events, []);
  });

  it("updates content deterministically while preserving Aggregate foundations", () => {
    const product = Product.create({ ...identity(), createdAt });
    const productId = product.identity.productId.value;
    const lifecycle = product.lifecycleState.value;
    const effectiveUpdateTime = new Date("2026-07-19T09:00:00.000Z");

    assert.equal(
      product.updateClassification(
        { categoryId: "category-001" },
        effectiveUpdateTime,
      ),
      true,
    );
    assert.equal(
      product.updateCommercialDetails(
        { productName: "Updated Product", isHighlighted: true },
        effectiveUpdateTime,
      ),
      true,
    );
    assert.equal(
      product.replaceSpecificationValues(
        [{ specificationFieldId: "ram", value: "32GB" }],
        effectiveUpdateTime,
      ),
      true,
    );
    assert.equal(
      product.replaceImages(
        [
          {
            productImageId: "image-001",
            storageReference: "updated/main.webp",
            order: 0,
            isMain: true,
          },
        ],
        effectiveUpdateTime,
      ),
      true,
    );

    assert.equal(product.updatedAt.toISOString(), effectiveUpdateTime.toISOString());
    assert.equal(product.createdAt.toISOString(), createdAt.toISOString());
    assert.equal(product.identity.productId.value, productId);
    assert.equal(product.lifecycleState.value, lifecycle);
  });

  it("treats equivalent replacement as a no-op", () => {
    const product = Product.create({
      ...identity(),
      createdAt,
      specificationValues: [{ specificationFieldId: "ram", value: "16GB" }],
    });
    const timestampBeforeNoOp = product.updatedAt.toISOString();

    const changed = product.replaceSpecificationValues(
      [{ specificationFieldId: "ram", value: "16GB" }],
      updatedAt,
    );

    assert.equal(changed, false);
    assert.equal(product.updatedAt.toISOString(), timestampBeforeNoOp);
  });

  it("leaves Product state unchanged after an invalid update", () => {
    const product = Product.create({
      ...identity(),
      createdAt,
      images: [
        {
          productImageId: "image-001",
          storageReference: "original/main.webp",
          order: 0,
          isMain: true,
        },
      ],
    });
    const timestampBeforeUpdate = product.updatedAt.toISOString();

    assert.throws(
      () =>
        product.replaceImages(
          [
            {
              productImageId: "image-001",
              storageReference: "invalid.webp",
              order: 0,
              isMain: false,
            },
          ],
          updatedAt,
        ),
      /exactly one Main Image/,
    );

    assert.equal(product.images[0].storageReference, "original/main.webp");
    assert.equal(product.updatedAt.toISOString(), timestampBeforeUpdate);
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
