import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CatalogId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductEntryTrustedContextUnavailableError } from "../ports/product-entry-trusted-context.port";
import { ConfiguredProductPublicationRequirementsResolver } from "./configured-product-publication-requirements-resolver";
import {
  DevelopmentEnvironmentProductEntryTrustedContextResolver,
  productEntryTrustedContextResolverForEnvironment,
} from "./environment-product-entry-trusted-context";
import { FallbackUuidProductEntryProductCodeAllocator } from "./product-entry-random-identity-allocator";
import { createProductEntryServerRuntime } from "./product-entry-server-runtime";

const validDevelopmentEnvironment = Object.freeze({
  NODE_ENV: "development",
  QSC_TRUSTED_WORKSPACE_ID: "trusted-workspace",
  QSC_TRUSTED_ACTOR_ID: "trusted-actor",
  QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS: "catalog.product.create,catalog.product-entry-submission.read",
});

describe("Product Entry trusted context adapters", () => {
  it("resolves development identity and permissions only from trusted server configuration", async () => {
    const context = await new DevelopmentEnvironmentProductEntryTrustedContextResolver(validDevelopmentEnvironment).resolve();
    assert.equal(context.workspaceId.value, "trusted-workspace");
    assert.equal(context.actorId.value, "trusted-actor");
    assert.deepEqual([...context.permissions], ["catalog.product.create", "catalog.product-entry-submission.read"]);
  });

  it("fails closed for missing, empty, duplicate, or unsupported development configuration", async () => {
    const invalidConfigurations = [
      { ...validDevelopmentEnvironment, QSC_TRUSTED_ACTOR_ID: undefined },
      { ...validDevelopmentEnvironment, QSC_TRUSTED_WORKSPACE_ID: " " },
      { ...validDevelopmentEnvironment, QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS: "" },
      { ...validDevelopmentEnvironment, QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS: "catalog.product.create,,catalog.product.edit" },
      { ...validDevelopmentEnvironment, QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS: "catalog.product.create,catalog.product.create" },
      { ...validDevelopmentEnvironment, QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS: "catalog.product.unknown" },
    ];
    for (const configuration of invalidConfigurations) {
      await assert.rejects(
        () => new DevelopmentEnvironmentProductEntryTrustedContextResolver(configuration).resolve(),
        ProductEntryTrustedContextUnavailableError,
      );
    }
  });

  it("never accepts the environment-backed actor in Production runtime composition", async () => {
    const productionEnvironment = { ...validDevelopmentEnvironment, NODE_ENV: "production" };
    await assert.rejects(
      () => new DevelopmentEnvironmentProductEntryTrustedContextResolver(productionEnvironment).resolve(),
      ProductEntryTrustedContextUnavailableError,
    );

    const runtime = createProductEntryServerRuntime(productEntryTrustedContextResolverForEnvironment(productionEnvironment));
    await assert.rejects(
      () => runtime.trustedContextResolver.resolve(),
      ProductEntryTrustedContextUnavailableError,
    );
  });

  it("requires an exact Workspace and Catalog publication-policy scope", async () => {
    const resolver = new ConfiguredProductPublicationRequirementsResolver([{
      workspaceId: "workspace-a",
      catalogId: "catalog-a",
      requirements: { commercial: ["ProductName"] },
    }]);
    const requirements = await resolver.resolve({
      workspaceId: WorkspaceId.create("workspace-a"),
      catalogId: CatalogId.create("catalog-a"),
      classification: undefined,
    });
    assert.deepEqual(requirements.commercial, ["ProductName"]);
    await assert.rejects(resolver.resolve({
      workspaceId: WorkspaceId.create("workspace-b"),
      catalogId: CatalogId.create("catalog-a"),
      classification: undefined,
    }), /not configured/);
  });

  it("documents the UUID Product Code adapter as a collision-safe fallback", async () => {
    const allocator = new FallbackUuidProductEntryProductCodeAllocator();
    const first = await allocator.allocate(WorkspaceId.create("workspace-a"));
    const second = await allocator.allocate(WorkspaceId.create("workspace-a"));
    assert.match(first.value, /^QSC-[0-9A-F-]{36}$/);
    assert.notEqual(first.value, second.value);
  });
});
