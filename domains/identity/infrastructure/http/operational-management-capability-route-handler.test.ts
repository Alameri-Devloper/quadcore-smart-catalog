import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AuthenticatedContextUnavailableError,
  RestrictedSessionContextError,
  type TrustedActorContext,
} from "../../../../shared/auth/trusted-actor-context";
import { GetOperationalManagementCapabilitiesUseCase } from "../../application/get-operational-management-capabilities.use-case";
import type { OperationalManagementCapabilityServerApplication } from "../operational-management-capability-server-runtime";
import { createOperationalManagementCapabilityRouteHandler } from "./operational-management-capability-route-handler";

const actor: TrustedActorContext = Object.freeze({
  workspaceId: "workspace-must-not-leak",
  actorId: "actor-must-not-leak",
  role: "Staff",
  permissions: Object.freeze([
    "catalog.product.edit",
    "pricing.manage",
    "referenceCost.view",
    "inventory.receive",
  ]),
  branchScope: Object.freeze({
    type: "SelectedBranches",
    branchIds: Object.freeze(["branch-must-not-leak"]),
  }),
  authorizationVersion: 11,
});

const open = (
  resolve: OperationalManagementCapabilityServerApplication["context"]["resolve"] = async () => actor,
) => () => Object.freeze({
  context: Object.freeze({ resolve }),
  capabilities: new GetOperationalManagementCapabilitiesUseCase(),
});

const request = (suffix = "") => new Request(`https://catalog.test/api/operations/capabilities${suffix}`);

const leafValues = (value: unknown): readonly unknown[] =>
  typeof value === "object" && value !== null && !Array.isArray(value)
    ? Object.values(value).flatMap(leafValues)
    : [value];

describe("Operational management capability HTTP route", () => {
  it("requires an authenticated full-session context", async () => {
    const unauthenticated = await createOperationalManagementCapabilityRouteHandler(open(async () => {
      throw new AuthenticatedContextUnavailableError();
    }))(request());
    assert.equal(unauthenticated.status, 401);
    assert.equal(unauthenticated.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await unauthenticated.json(), { type: "AuthenticationRequired" });

    const restricted = await createOperationalManagementCapabilityRouteHandler(open(async () => {
      throw new RestrictedSessionContextError();
    }))(request());
    assert.equal(restricted.status, 403);
    assert.deepEqual(await restricted.json(), { type: "ForbiddenForRestrictedSession" });
  });

  it("returns a private fixed semantic response", async () => {
    const response = await createOperationalManagementCapabilityRouteHandler(open())(request());
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "private, no-store");
    assert.deepEqual(await response.json(), {
      branches: { canView: false, canManage: false },
      listing: { canManage: true },
      inventory: {
        canViewAvailability: false,
        canViewQuantities: false,
        canReceive: true,
        canIssue: false,
        canReserve: false,
        canTransfer: false,
        canManageDamage: false,
        canAdjust: false,
      },
      pricing: {
        canView: false,
        canViewWholesale: false,
        canManageWorkspace: true,
        canManageBranchOverrides: false,
      },
      referenceCost: {
        canView: false,
        canManageWorkspace: false,
        canManageBranchOverrides: false,
      },
    });
  });

  it("does not disclose raw authority or resource data", async () => {
    const response = await createOperationalManagementCapabilityRouteHandler(open())(request());
    const body = await response.json() as Readonly<Record<string, unknown>>;
    const serialized = JSON.stringify(body);
    for (const forbidden of [
      "permissions",
      "PermissionCode",
      "role",
      "workspaceId",
      "actorId",
      "allowedBranchIds",
      "branchScope",
      "workspace-must-not-leak",
      "actor-must-not-leak",
      "branch-must-not-leak",
      "catalog.product.edit",
      "pricing.manage",
    ]) assert.equal(serialized.includes(forbidden), false, forbidden);
    const leaves = leafValues(body);
    assert.ok(leaves.length > 0);
    assert.ok(leaves.every((value) => typeof value === "boolean"));
  });

  it("rejects every query parameter, including tenant input, before context resolution", async () => {
    let resolved = false;
    const response = await createOperationalManagementCapabilityRouteHandler(open(async () => {
      resolved = true;
      return actor;
    }))(request("?workspaceId=foreign"));
    assert.equal(response.status, 400);
    assert.equal(resolved, false);
    assert.deepEqual(await response.json(), { type: "InvalidQuery" });
  });

  it("fails closed when trusted context or projection is unavailable", async () => {
    const response = await createOperationalManagementCapabilityRouteHandler(open(async () => {
      throw new Error("unavailable");
    }))(request());
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { type: "OperationalManagementCapabilityServiceUnavailable" });
  });
});
