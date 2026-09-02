import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import { permittedReservationManagementActions } from "./operational-management-authorization-policy";

const context = (permissions: readonly string[]): TrustedActorContext => ({
  workspaceId: "workspace-a",
  actorId: "actor-a",
  role: "Staff",
  permissions,
  branchScope: { type: "AllBranches" },
  authorizationVersion: 1,
});

describe("Inventory operational authorization policy", () => {
  it("projects potential Reservation actions from reserve authority only", () => {
    assert.deepEqual(permittedReservationManagementActions(context(["inventory.reserve"])), ["Release", "Fulfill"]);
    assert.deepEqual(permittedReservationManagementActions(context(["inventory.quantity.view"])), []);
  });
});
