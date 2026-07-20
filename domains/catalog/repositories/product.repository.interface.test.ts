import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ProductCode } from "../types/product-code.value-object";
import { ProductCommercialDetails } from "../types/product-commercial-details.value-object";
import {
  ProductId,
  WorkspaceId,
} from "../types/product-identity.value-object";
import { ProductRevision } from "../types/product-revision.value-object";
import type { Product } from "../types/product.aggregate";
import type { ProductRepository } from "./product.repository.interface";
import {
  PRODUCT_CREATE_OUTCOMES,
  PRODUCT_UPDATE_OUTCOMES,
  ProductCreateResult,
  ProductUpdateResult,
} from "./product-repository-results";

type Equal<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends
  <Value>() => Value extends Right ? 1 : 2
    ? true
    : false;
type Assert<Condition extends true> = Condition;

type FindByIdContract = Assert<
  Equal<
    ProductRepository["findById"],
    (
      workspaceId: WorkspaceId,
      productId: ProductId,
    ) => Promise<Product | null>
  >
>;
type CreateContract = Assert<
  Equal<
    ProductRepository["create"],
    (product: Product) => Promise<ProductCreateResult>
  >
>;
type UpdateContract = Assert<
  Equal<
    ProductRepository["update"],
    (
      product: Product,
      expectedPersistedRevision: ProductRevision,
    ) => Promise<ProductUpdateResult>
  >
>;
type RepositoryMethodSet = Assert<
  Equal<keyof ProductRepository, "findById" | "create" | "update">
>;

const compileTimeContractChecks: readonly [
  FindByIdContract,
  CreateContract,
  UpdateContract,
  RepositoryMethodSet,
] = [true, true, true, true];

const workspaceId = WorkspaceId.create("workspace-001");
const productId = ProductId.create("product-001");
const revision = ProductRevision.rehydrate(7);
const productCode = ProductCode.create("QC-LAP-001");

describe("ProductCode", () => {
  it("accepts and canonicalizes a valid code", () => {
    const code = ProductCode.create("  qc-lap-001  ");

    assert.equal(code.value, "QC-LAP-001");
    assert.equal(Object.isFrozen(code), true);
  });

  it("compares case and surrounding-whitespace variants equally", () => {
    const first = ProductCode.create("QC-LAP-001");
    const second = ProductCode.create(" qc-lap-001 ");

    assert.equal(first.equals(second), true);
  });

  it("rejects empty and whitespace-only codes", () => {
    assert.throws(() => ProductCode.create(""), /cannot be empty/);
    assert.throws(() => ProductCode.create("   "), /cannot be empty/);
  });

  it("canonicalizes ProductCode in commercial details while keeping it optional", () => {
    const withoutCode = ProductCommercialDetails.create();
    const withCode = ProductCommercialDetails.create({
      productCode: " qc-lap-001 ",
    });

    assert.equal(withoutCode.productCode, undefined);
    assert.equal(withCode.productCode?.value, "QC-LAP-001");
  });
});

describe("Product create results", () => {
  it("creates an immutable scoped Created result", () => {
    const result = ProductCreateResult.created(
      workspaceId,
      productId,
      revision,
    );

    assert.equal(result.outcome, PRODUCT_CREATE_OUTCOMES.created);
    assert.equal(result.workspaceId.value, "workspace-001");
    assert.equal(result.productId.value, "product-001");
    assert.equal(result.persistedRevision.value, 7);
    assert.equal(Object.isFrozen(result), true);
  });

  it("creates an immutable scoped ProductId conflict", () => {
    const result = ProductCreateResult.productIdConflict(
      workspaceId,
      productId,
    );

    assert.equal(result.outcome, PRODUCT_CREATE_OUTCOMES.productIdConflict);
    assert.equal(result.workspaceId.value, "workspace-001");
    assert.equal(result.productId.value, "product-001");
    assert.equal(Object.isFrozen(result), true);
  });

  it("creates an immutable scoped ProductCode conflict", () => {
    const result = ProductCreateResult.productCodeConflict(
      workspaceId,
      productId,
      productCode,
    );

    assert.equal(result.outcome, PRODUCT_CREATE_OUTCOMES.productCodeConflict);
    assert.equal(result.workspaceId.value, "workspace-001");
    assert.equal(result.productId.value, "product-001");
    assert.equal(result.productCode.value, "QC-LAP-001");
    assert.equal(Object.isFrozen(result), true);
  });
});

describe("Product update results", () => {
  it("creates an immutable scoped Updated result", () => {
    const result = ProductUpdateResult.updated(
      workspaceId,
      productId,
      revision,
    );

    assert.equal(result.outcome, PRODUCT_UPDATE_OUTCOMES.updated);
    assert.equal(result.persistedRevision.value, 7);
    assert.equal(Object.isFrozen(result), true);
  });

  it("creates an immutable scoped Product-not-found result", () => {
    const result = ProductUpdateResult.productNotFound(workspaceId, productId);

    assert.equal(result.outcome, PRODUCT_UPDATE_OUTCOMES.productNotFound);
    assert.equal(result.workspaceId.value, "workspace-001");
    assert.equal(result.productId.value, "product-001");
    assert.equal(Object.isFrozen(result), true);
  });

  it("creates a structured immutable Revision conflict", () => {
    const expectedRevision = ProductRevision.rehydrate(5);
    const actualPersistedRevision = ProductRevision.rehydrate(6);
    const result = ProductUpdateResult.revisionConflict(
      workspaceId,
      productId,
      expectedRevision,
      actualPersistedRevision,
    );

    assert.equal(result.outcome, PRODUCT_UPDATE_OUTCOMES.revisionConflict);
    assert.equal(result.productId.value, "product-001");
    assert.equal(result.expectedRevision.value, 5);
    assert.equal(result.actualPersistedRevision.value, 6);
    assert.equal(Object.isFrozen(result), true);
  });

  it("creates an immutable scoped ProductCode conflict", () => {
    const result = ProductUpdateResult.productCodeConflict(
      workspaceId,
      productId,
      productCode,
    );

    assert.equal(result.outcome, PRODUCT_UPDATE_OUTCOMES.productCodeConflict);
    assert.equal(result.productCode.value, "QC-LAP-001");
    assert.equal(Object.isFrozen(result), true);
  });
});

describe("ProductRepository compile-time contract", () => {
  it("contains only scoped retrieval and explicit create/update persistence methods", () => {
    assert.deepEqual(compileTimeContractChecks, [true, true, true, true]);
  });
});
