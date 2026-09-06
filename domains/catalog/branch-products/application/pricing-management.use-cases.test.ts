import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { BranchPriceOverride, PriceType, PriceValue } from "../domain/branch-product";
import type {
  BranchProductTransactionContext,
  BranchProductUnitOfWork,
  ProductPricingRepository,
} from "../ports/branch-product-unit-of-work.port";
import {
  GetBranchPricingManagementUseCase,
  GetBranchProductPricingUseCase,
  GetWorkspacePricingManagementUseCase,
  SetWorkspaceBasePriceUseCase,
} from "./branch-product.use-cases";

const actor = (
  permissions: readonly string[],
  workspaceId = "workspace-a",
  branchIds?: readonly string[],
): TrustedActorContext => ({
  workspaceId,
  actorId: `actor-${workspaceId}`,
  role: "Staff",
  permissions,
  branchScope: branchIds
    ? { type: "SelectedBranches", branchIds }
    : { type: "AllBranches" },
  authorizationVersion: 1,
});

const productKey = (workspaceId: string, productId: string) => `${workspaceId}:${productId}`;
const baseKey = (workspaceId: string, productId: string, priceType: PriceType) =>
  `${workspaceId}:${productId}:${priceType}`;
const overrideKey = (
  workspaceId: string,
  branchId: string,
  productId: string,
  priceType: PriceType,
) => `${workspaceId}:${branchId}:${productId}:${priceType}`;

type ProductState = { lifecycleState: "Published" | "Archived"; revision: number };

class MemoryPricing implements ProductPricingRepository {
  readonly base = new Map<string, PriceValue>();
  readonly overrides = new Map<string, BranchPriceOverride>();

  constructor(private readonly products: Map<string, ProductState>) {}

  getBase(workspaceId: string, productId: string, priceType: PriceType) {
    const value = this.base.get(baseKey(workspaceId, productId, priceType));
    if (!value || priceType === "ReferenceCost") return Promise.resolve(value ?? null);
    const product = this.products.get(productKey(workspaceId, productId));
    return Promise.resolve(product ? { ...value, revision: product.revision } : null);
  }

  setBase(input: {
    workspaceId: string;
    productId: string;
    priceType: PriceType;
    amountMinor: bigint;
    currency: string;
    expectedRevision: number;
    now: Date;
  }) {
    const key = baseKey(input.workspaceId, input.productId, input.priceType);
    if (input.priceType === "ReferenceCost") {
      const current = this.base.get(key);
      if ((current?.revision ?? 0) !== input.expectedRevision) return Promise.resolve(null);
      const value = {
        amountMinor: input.amountMinor,
        currency: input.currency,
        revision: input.expectedRevision + 1,
      };
      this.base.set(key, value);
      return Promise.resolve(value);
    }

    const product = this.products.get(productKey(input.workspaceId, input.productId));
    if (!product || product.revision !== input.expectedRevision) return Promise.resolve(null);
    product.revision += 1;
    const value = {
      amountMinor: input.amountMinor,
      currency: input.currency,
      revision: product.revision,
    };
    this.base.set(key, value);
    return Promise.resolve(value);
  }

  clearBase(input: {
    workspaceId: string;
    productId: string;
    priceType: PriceType;
    expectedRevision: number;
  }) {
    const key = baseKey(input.workspaceId, input.productId, input.priceType);
    if (input.priceType === "ReferenceCost") {
      const current = this.base.get(key);
      if (!current || current.revision !== input.expectedRevision) return Promise.resolve(false);
      this.base.delete(key);
      return Promise.resolve(true);
    }
    const product = this.products.get(productKey(input.workspaceId, input.productId));
    if (!product || product.revision !== input.expectedRevision) return Promise.resolve(false);
    product.revision += 1;
    this.base.delete(key);
    return Promise.resolve(true);
  }

  getOverride(workspaceId: string, branchId: string, productId: string, priceType: PriceType) {
    return Promise.resolve(
      this.overrides.get(overrideKey(workspaceId, branchId, productId, priceType)) ?? null,
    );
  }

  setOverride(input: {
    workspaceId: string;
    branchId: string;
    productId: string;
    priceType: PriceType;
    amountMinor: bigint;
    currency: string;
    expectedRevision: number;
    now: Date;
  }) {
    const key = overrideKey(input.workspaceId, input.branchId, input.productId, input.priceType);
    const current = this.overrides.get(key);
    if ((current?.revision ?? 0) !== input.expectedRevision) return Promise.resolve(null);
    const value = {
      workspaceId: input.workspaceId,
      branchId: input.branchId,
      productId: input.productId,
      priceType: input.priceType,
      amountMinor: input.amountMinor,
      currency: input.currency,
      revision: input.expectedRevision + 1,
      createdAt: current?.createdAt ?? input.now,
      updatedAt: input.now,
    };
    this.overrides.set(key, value);
    return Promise.resolve(value);
  }

  clearOverride(input: {
    workspaceId: string;
    branchId: string;
    productId: string;
    priceType: PriceType;
    expectedRevision: number;
  }) {
    const key = overrideKey(input.workspaceId, input.branchId, input.productId, input.priceType);
    const current = this.overrides.get(key);
    if (!current || current.revision !== input.expectedRevision) return Promise.resolve(false);
    this.overrides.delete(key);
    return Promise.resolve(true);
  }
}

const fixture = () => {
  const products = new Map<string, ProductState>([
    [productKey("workspace-a", "product-a"), { lifecycleState: "Published", revision: 7 }],
    [productKey("workspace-a", "archived"), { lifecycleState: "Archived", revision: 3 }],
    [productKey("workspace-b", "foreign-product"), { lifecycleState: "Published", revision: 11 }],
  ]);
  const branches = new Map([
    ["workspace-a:branch-a", { status: "Active" as const }],
    ["workspace-a:inactive", { status: "Inactive" as const }],
    ["workspace-b:foreign-branch", { status: "Active" as const }],
  ]);
  const pricing = new MemoryPricing(products);
  const transaction: BranchProductTransactionContext = {
    scope: {
      findBranch: async (workspaceId, branchId) =>
        branches.get(`${workspaceId}:${branchId}`) ?? null,
      findProduct: async (workspaceId, productId) =>
        products.get(productKey(workspaceId, productId)) ?? null,
      isCurrencyEnabled: async (workspaceId, currency) =>
        workspaceId === "workspace-a" && currency === "USD",
    },
    pricing,
    listings: { get: async () => null, set: async () => null },
    inventory: { getBalance: async () => null },
    audit: { append: async () => undefined },
  };
  const unitOfWork: BranchProductUnitOfWork = { execute: (work) => work(transaction) };
  const dependencies = {
    unitOfWork,
    clock: { now: () => new Date("2026-09-05T10:00:00.000Z") },
  };
  return {
    pricing,
    products,
    workspace: new GetWorkspacePricingManagementUseCase(unitOfWork),
    branch: new GetBranchPricingManagementUseCase(unitOfWork),
    ordinary: new GetBranchProductPricingUseCase(unitOfWork),
    setBase: new SetWorkspaceBasePriceUseCase(dependencies),
  };
};

const seedBase = (
  app: ReturnType<typeof fixture>,
  priceType: PriceType,
  amountMinor: bigint,
  revision = priceType === "ReferenceCost" ? 4 : 7,
) => app.pricing.base.set(
  baseKey("workspace-a", "product-a", priceType),
  { amountMinor, currency: "USD", revision },
);

const seedOverride = (
  app: ReturnType<typeof fixture>,
  priceType: PriceType,
  amountMinor: bigint,
  revision = 9,
) => app.pricing.overrides.set(
  overrideKey("workspace-a", "branch-a", "product-a", priceType),
  {
    workspaceId: "workspace-a",
    branchId: "branch-a",
    productId: "product-a",
    priceType,
    amountMinor,
    currency: "USD",
    revision,
    createdAt: new Date("2026-09-05T09:00:00.000Z"),
    updatedAt: new Date("2026-09-05T10:00:00.000Z"),
  },
);

describe("Workspace pricing management read", () => {
  it("applies the exact independent field-visibility and action matrix", async () => {
    const app = fixture();
    seedBase(app, "Retail", BigInt(100));
    seedBase(app, "Wholesale", BigInt(80));
    seedBase(app, "ReferenceCost", BigInt(60));

    const retailViewer = await app.workspace.execute({
      context: actor(["pricing.view"]), productId: "product-a",
    });
    assert.ok(retailViewer.ok);
    if (retailViewer.ok) {
      assert.deepEqual(Object.keys(retailViewer.value), ["productId", "productRevision", "retail"]);
      assert.deepEqual(retailViewer.value.retail?.allowedActions, []);
    }

    const wholesaleViewer = await app.workspace.execute({
      context: actor(["pricing.view", "pricing.wholesale.view"]), productId: "product-a",
    });
    assert.ok(wholesaleViewer.ok);
    if (wholesaleViewer.ok) {
      assert.ok(wholesaleViewer.value.retail);
      assert.deepEqual(wholesaleViewer.value.wholesale?.allowedActions, []);
      assert.equal(wholesaleViewer.value.referenceCost, undefined);
    }

    const pricingManager = await app.workspace.execute({
      context: actor(["pricing.manage"]), productId: "product-a",
    });
    assert.ok(pricingManager.ok);
    if (pricingManager.ok) {
      assert.deepEqual(pricingManager.value.retail?.allowedActions, ["Set", "Clear"]);
      assert.deepEqual(pricingManager.value.wholesale?.allowedActions, ["Set", "Clear"]);
      assert.equal(pricingManager.value.referenceCost, undefined);
    }

    const referenceViewer = await app.workspace.execute({
      context: actor(["pricing.view", "referenceCost.view"]), productId: "product-a",
    });
    assert.ok(referenceViewer.ok);
    if (referenceViewer.ok) {
      assert.deepEqual(referenceViewer.value.referenceCost?.allowedActions, []);
      assert.equal(referenceViewer.value.wholesale, undefined);
    }

    const referenceManager = await app.workspace.execute({
      context: actor(["referenceCost.manage"]), productId: "product-a",
    });
    assert.ok(referenceManager.ok);
    if (referenceManager.ok) {
      assert.deepEqual(Object.keys(referenceManager.value), [
        "productId", "productRevision", "referenceCost",
      ]);
      assert.deepEqual(referenceManager.value.referenceCost?.allowedActions, ["Set", "Clear"]);
    }

    for (const permissions of [
      [],
      ["pricing.wholesale.view"],
      ["referenceCost.view"],
      ["pricing.branchOverride.manage"],
      ["referenceCost.branchOverride.manage"],
    ]) {
      assert.deepEqual(
        await app.workspace.execute({ context: actor(permissions), productId: "product-a" }),
        { ok: false, error: "Forbidden" },
      );
    }
  });

  it("distinguishes configured zero from absence and projects only transport Money", async () => {
    const app = fixture();
    seedBase(app, "Retail", BigInt(0));
    seedBase(app, "ReferenceCost", BigInt(1234), 6);
    const result = await app.workspace.execute({
      context: actor(["pricing.manage", "referenceCost.manage"]),
      productId: "product-a",
    });
    assert.ok(result.ok);
    if (!result.ok) return;
    assert.equal(result.value.productRevision, 7);
    assert.deepEqual(result.value.retail, {
      state: "Configured",
      value: { amountMinor: "0", currency: "USD" },
      allowedActions: ["Set", "Clear"],
    });
    assert.deepEqual(result.value.wholesale, {
      state: "NotConfigured", value: null, allowedActions: ["Set", "Clear"],
    });
    assert.deepEqual(result.value.referenceCost, {
      state: "Configured",
      value: { amountMinor: "1234", currency: "USD" },
      allowedActions: ["Set", "Clear"],
      referenceCostRevision: 6,
    });

    app.pricing.base.delete(baseKey("workspace-a", "product-a", "ReferenceCost"));
    const missing = await app.workspace.execute({
      context: actor(["referenceCost.manage"]), productId: "product-a",
    });
    assert.ok(missing.ok);
    if (missing.ok) assert.equal(missing.value.referenceCost?.referenceCostRevision, 0);
  });

  it("validates Product tenancy and suppresses actions for an Archived Product", async () => {
    const app = fixture();
    const manager = actor(["pricing.manage", "referenceCost.manage"]);
    assert.deepEqual(
      await app.workspace.execute({ context: manager, productId: "missing" }),
      { ok: false, error: "ProductNotFound" },
    );
    assert.deepEqual(
      await app.workspace.execute({ context: manager, productId: "foreign-product" }),
      { ok: false, error: "ProductNotFound" },
    );
    const archived = await app.workspace.execute({ context: manager, productId: "archived" });
    assert.ok(archived.ok);
    if (archived.ok) {
      assert.deepEqual(archived.value.retail?.allowedActions, []);
      assert.deepEqual(archived.value.referenceCost?.allowedActions, []);
    }
  });

  it("keeps Retail and Wholesale on one Product revision and Reference Cost independent", async () => {
    const app = fixture();
    const manager = actor(["pricing.manage", "referenceCost.manage"]);
    assert.ok((await app.setBase.execute({
      context: manager, productId: "product-a", priceType: "Retail",
      amountMinor: "100", currency: "USD", expectedRevision: 7,
    })).ok);
    let read = await app.workspace.execute({ context: manager, productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) assert.equal(read.value.productRevision, 8);
    assert.deepEqual(await app.setBase.execute({
      context: manager, productId: "product-a", priceType: "Wholesale",
      amountMinor: "80", currency: "USD", expectedRevision: 7,
    }), { ok: false, error: "Conflict" });
    assert.ok((await app.setBase.execute({
      context: manager, productId: "product-a", priceType: "Wholesale",
      amountMinor: "80", currency: "USD", expectedRevision: 8,
    })).ok);

    assert.ok((await app.setBase.execute({
      context: manager, productId: "product-a", priceType: "ReferenceCost",
      amountMinor: "60", currency: "USD", expectedRevision: 0,
    })).ok);
    read = await app.workspace.execute({ context: manager, productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) {
      assert.equal(read.value.productRevision, 9);
      assert.equal(read.value.referenceCost?.referenceCostRevision, 1);
    }

    assert.ok((await app.setBase.execute({
      context: manager, productId: "product-a", priceType: "Retail",
      amountMinor: "101", currency: "USD", expectedRevision: 9,
    })).ok);
    read = await app.workspace.execute({ context: manager, productId: "product-a" });
    assert.ok(read.ok);
    if (read.ok) {
      assert.equal(read.value.productRevision, 10);
      assert.equal(read.value.referenceCost?.referenceCostRevision, 1);
    }
  });
});

describe("Branch pricing management read", () => {
  it("authorizes Retail/Wholesale and Reference Cost independently", async () => {
    const app = fixture();
    const pricing = await app.branch.execute({
      context: actor(["pricing.branchOverride.manage"]),
      branchId: "branch-a", productId: "product-a",
    });
    assert.ok(pricing.ok);
    if (pricing.ok) {
      assert.deepEqual(Object.keys(pricing.value.prices), ["Retail", "Wholesale"]);
      assert.equal(pricing.value.baseProductRevision, 7);
      assert.equal(pricing.value.baseReferenceCostRevision, undefined);
    }

    const referenceCost = await app.branch.execute({
      context: actor(["referenceCost.branchOverride.manage"]),
      branchId: "branch-a", productId: "product-a",
    });
    assert.ok(referenceCost.ok);
    if (referenceCost.ok) {
      assert.deepEqual(Object.keys(referenceCost.value.prices), ["ReferenceCost"]);
      assert.equal(referenceCost.value.baseProductRevision, undefined);
      assert.equal(referenceCost.value.baseReferenceCostRevision, 0);
    }

    const both = await app.branch.execute({
      context: actor(["pricing.branchOverride.manage", "referenceCost.branchOverride.manage"]),
      branchId: "branch-a", productId: "product-a",
    });
    assert.ok(both.ok);
    if (both.ok) assert.deepEqual(Object.keys(both.value.prices), [
      "Retail", "Wholesale", "ReferenceCost",
    ]);

    for (const permissions of [[], ["pricing.view"], ["pricing.manage"], ["referenceCost.view"]]) {
      assert.deepEqual(await app.branch.execute({
        context: actor(permissions), branchId: "branch-a", productId: "product-a",
      }), { ok: false, error: "Forbidden" });
    }
  });

  it("resolves base, override, effective, source, and independent revisions for every type", async () => {
    for (const priceType of ["Retail", "Wholesale", "ReferenceCost"] as const) {
      const permissions = ["pricing.branchOverride.manage", "referenceCost.branchOverride.manage"];

      const inheritedApp = fixture();
      seedBase(inheritedApp, priceType, BigInt(100));
      const inherited = await inheritedApp.branch.execute({
        context: actor(permissions), branchId: "branch-a", productId: "product-a",
      });
      assert.ok(inherited.ok, priceType);
      if (inherited.ok) {
        assert.deepEqual(inherited.value.prices[priceType], {
          base: { state: "Configured", value: { amountMinor: "100", currency: "USD" }, allowedActions: [] },
          override: { state: "NotConfigured", value: null, allowedActions: [] },
          overrideRevision: 0,
          effective: { amountMinor: "100", currency: "USD" },
          source: "WorkspaceBase",
          allowedActions: ["SetOverride"],
        });
        if (priceType === "ReferenceCost") {
          assert.equal(inherited.value.baseReferenceCostRevision, 4);
        } else {
          assert.equal(inherited.value.baseProductRevision, 7);
        }
      }

      const overriddenApp = fixture();
      seedBase(overriddenApp, priceType, BigInt(100));
      seedOverride(overriddenApp, priceType, BigInt(90));
      const overridden = await overriddenApp.branch.execute({
        context: actor(permissions), branchId: "branch-a", productId: "product-a",
      });
      assert.ok(overridden.ok, priceType);
      if (overridden.ok) {
        assert.equal(overridden.value.prices[priceType]?.source, "BranchOverride");
        assert.deepEqual(overridden.value.prices[priceType]?.effective, {
          amountMinor: "90", currency: "USD",
        });
        assert.equal(overridden.value.prices[priceType]?.overrideRevision, 9);
        assert.deepEqual(overridden.value.prices[priceType]?.allowedActions, [
          "SetOverride", "ClearOverride",
        ]);
      }

      const absentApp = fixture();
      const absent = await absentApp.branch.execute({
        context: actor(permissions), branchId: "branch-a", productId: "product-a",
      });
      assert.ok(absent.ok, priceType);
      if (absent.ok) {
        assert.equal(absent.value.prices[priceType]?.source, "NotConfigured");
        assert.equal(absent.value.prices[priceType]?.effective, null);
        assert.equal(absent.value.prices[priceType]?.overrideRevision, 0);
        assert.deepEqual(absent.value.prices[priceType]?.allowedActions, ["SetOverride"]);
      }

      const overrideOnlyApp = fixture();
      seedOverride(overrideOnlyApp, priceType, BigInt(0));
      const overrideOnly = await overrideOnlyApp.branch.execute({
        context: actor(permissions), branchId: "branch-a", productId: "product-a",
      });
      assert.ok(overrideOnly.ok, priceType);
      if (overrideOnly.ok) {
        assert.equal(overrideOnly.value.prices[priceType]?.base.state, "NotConfigured");
        assert.equal(overrideOnly.value.prices[priceType]?.override.state, "Configured");
        assert.deepEqual(overrideOnly.value.prices[priceType]?.effective, {
          amountMinor: "0", currency: "USD",
        });
      }
    }
  });

  it("enforces Branch scope and same-Workspace Branch/Product lookup", async () => {
    const app = fixture();
    const permissions = ["pricing.branchOverride.manage"];
    assert.deepEqual(await app.branch.execute({
      context: actor(permissions, "workspace-a", ["branch-a"]),
      branchId: "branch-b", productId: "product-a",
    }), { ok: false, error: "BranchNotFound" });
    assert.deepEqual(await app.branch.execute({
      context: actor(permissions), branchId: "missing", productId: "product-a",
    }), { ok: false, error: "BranchNotFound" });
    assert.deepEqual(await app.branch.execute({
      context: actor(permissions), branchId: "branch-a", productId: "missing",
    }), { ok: false, error: "ProductNotFound" });
    assert.deepEqual(await app.branch.execute({
      context: actor(permissions), branchId: "branch-a", productId: "foreign-product",
    }), { ok: false, error: "ProductNotFound" });
    assert.deepEqual(await app.branch.execute({
      context: actor(permissions), branchId: "foreign-branch", productId: "product-a",
    }), { ok: false, error: "BranchNotFound" });
  });

  it("returns current state but no write actions for inactive Branches or Archived Products", async () => {
    const app = fixture();
    seedOverride(app, "Retail", BigInt(50));
    const context = actor(["pricing.branchOverride.manage", "referenceCost.branchOverride.manage"]);
    for (const command of [
      { context, branchId: "inactive", productId: "product-a" },
      { context, branchId: "branch-a", productId: "archived" },
    ]) {
      const result = await app.branch.execute(command);
      assert.ok(result.ok);
      if (result.ok) {
        for (const slot of Object.values(result.value.prices)) {
          assert.deepEqual(slot?.allowedActions, []);
        }
      }
    }
  });

  it("does not widen the ordinary pricing read", async () => {
    const app = fixture();
    seedBase(app, "Retail", BigInt(100));
    seedBase(app, "Wholesale", BigInt(80));
    seedBase(app, "ReferenceCost", BigInt(60));
    const retail = await app.ordinary.execute({
      context: actor(["pricing.view"]), branchId: "branch-a", productId: "product-a",
    });
    assert.ok(retail.ok);
    if (retail.ok) assert.deepEqual(Object.keys(retail.value.prices as object), ["Retail"]);
    const wholesale = await app.ordinary.execute({
      context: actor(["pricing.view", "pricing.wholesale.view"]),
      branchId: "branch-a", productId: "product-a",
    });
    assert.ok(wholesale.ok);
    if (wholesale.ok) assert.deepEqual(Object.keys(wholesale.value.prices as object), [
      "Retail", "Wholesale",
    ]);
    const referenceCost = await app.ordinary.execute({
      context: actor(["pricing.view", "referenceCost.view"]),
      branchId: "branch-a", productId: "product-a",
    });
    assert.ok(referenceCost.ok);
    if (referenceCost.ok) assert.deepEqual(Object.keys(referenceCost.value.prices as object), [
      "Retail", "ReferenceCost",
    ]);
    for (const permissions of [
      ["referenceCost.view"], ["pricing.manage"], ["pricing.branchOverride.manage"],
    ]) {
      assert.deepEqual(await app.ordinary.execute({
        context: actor(permissions), branchId: "branch-a", productId: "product-a",
      }), { ok: false, error: "Forbidden" });
    }
  });
});
