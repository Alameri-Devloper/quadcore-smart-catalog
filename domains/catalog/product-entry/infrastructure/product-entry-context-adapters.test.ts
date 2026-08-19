import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CatalogId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductEntryRestrictedSessionError, ProductEntryTrustedContextUnavailableError } from "../ports/product-entry-trusted-context.port";
import { RestrictedSessionContextError, type TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { ConfiguredProductPublicationRequirementsResolver } from "./configured-product-publication-requirements-resolver";
import {
  DevelopmentEnvironmentProductEntryTrustedContextResolver,
  productEntryTrustedContextResolverForEnvironment,
} from "./environment-product-entry-trusted-context";
import { FallbackUuidProductEntryProductCodeAllocator } from "./product-entry-random-identity-allocator";
import { createProductEntryServerRuntime } from "./product-entry-server-runtime";
import { TrustedActorProductEntryContextAdapter } from "./trusted-actor-product-entry-context.adapter";

const validDevelopmentEnvironment = Object.freeze({
  NODE_ENV: "development",
  QSC_TRUSTED_WORKSPACE_ID: "trusted-workspace",
  QSC_TRUSTED_ACTOR_ID: "trusted-actor",
  QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS: "catalog.product.create,catalog.product-entry-submission.read,catalog.product-entry-media.upload",
});

const request = new Request("http://localhost/api/catalog/product-entry-submissions");

describe("Product Entry trusted context adapters", () => {
  it("resolves development identity and permissions only from trusted server configuration", async () => {
    const context = await new DevelopmentEnvironmentProductEntryTrustedContextResolver(validDevelopmentEnvironment).resolve(request);
    assert.equal(context.workspaceId.value, "trusted-workspace");
    assert.equal(context.actorId.value, "trusted-actor");
    assert.deepEqual([...context.permissions], [
      "catalog.product.create",
      "catalog.product-entry-submission.read",
      "catalog.product-entry-media.upload",
    ]);
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
        () => new DevelopmentEnvironmentProductEntryTrustedContextResolver(configuration).resolve(request),
        ProductEntryTrustedContextUnavailableError,
      );
    }
  });

  it("never accepts the environment-backed actor in Production runtime composition", async () => {
    const productionEnvironment = { ...validDevelopmentEnvironment, NODE_ENV: "production" };
    await assert.rejects(
      () => new DevelopmentEnvironmentProductEntryTrustedContextResolver(productionEnvironment).resolve(request),
      ProductEntryTrustedContextUnavailableError,
    );

    const runtime = createProductEntryServerRuntime(productEntryTrustedContextResolverForEnvironment(productionEnvironment));
    await assert.rejects(
      () => runtime.trustedContextResolver.resolve(request),
      ProductEntryTrustedContextUnavailableError,
    );
  });

  it("maps only server-resolved actor authority and ignores browser-supplied identity claims", async () => {
    const trusted: TrustedActorContext = {
      workspaceId: "trusted-workspace",
      actorId: "trusted-actor",
      role: "Owner",
      permissions: [
        "catalog.product.create",
        "catalog.product.edit",
        "catalog.product-entry-submission.read",
        "catalog.product-entry-media.upload",
        "catalog.productMedia.source.replace",
        "catalog.product.reference-cost.read",
      ],
      branchScope: { type: "AllBranches" },
      authorizationVersion: 4,
    };
    const adapter = new TrustedActorProductEntryContextAdapter({ resolve: async () => trusted });
    const supplied = new Request("http://localhost/api/catalog/product-entry-submissions?workspaceId=foreign", {
      method: "POST",
      headers: { "content-type": "application/json", "x-actor-id": "foreign-actor" },
      body: JSON.stringify({ workspaceId: "foreign-workspace", actorId: "foreign-actor", role: "Owner" }),
    });
    const context = await adapter.resolve(supplied);
    assert.equal(context.workspaceId.value, "trusted-workspace");
    assert.equal(context.actorId.value, "trusted-actor");
    assert.deepEqual([...context.permissions], [
      "catalog.product.create",
      "catalog.product.edit",
      "catalog.product-entry-submission.read",
      "catalog.product-entry-media.upload",
      "catalog.productMedia.source.replace",
      "catalog.product.reference-cost.read",
    ]);
  });

  it("prevents restricted sessions from reaching a Catalog execution context", async () => {
    const adapter = new TrustedActorProductEntryContextAdapter({
      resolve: async () => { throw new RestrictedSessionContextError(); },
    });
    await assert.rejects(() => adapter.resolve(request), ProductEntryRestrictedSessionError);
  });

  it("maps real persisted Staff permissions and selected Branch IDs", async () => {
    const adapter = new TrustedActorProductEntryContextAdapter({ resolve: async () => ({
      workspaceId: "trusted-workspace",
      actorId: "staff-actor",
      role: "Staff",
      permissions: ["catalog.product.create"],
      branchScope: { type: "SelectedBranches", branchIds: ["branch-a"] },
      authorizationVersion: 2,
    }) });
    const context = await adapter.resolve(request);
    assert.deepEqual([...context.permissions], ["catalog.product.create"]);
    assert.deepEqual([...(context.branchScope?.branchIds ?? [])], ["branch-a"]);
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
