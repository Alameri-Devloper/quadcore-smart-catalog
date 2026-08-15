import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { createIdentityMemberRouteHandlers } from "./identity-member-route-handlers";
import type { IdentityMemberServerApplication } from "../identity-member-server-runtime";

const context = (role: "Owner" | "Staff" = "Owner"): TrustedActorContext => ({
  workspaceId: "workspace-a",
  actorId: role === "Owner" ? "owner-a" : "staff-a",
  role,
  permissions: [],
  branchScope: { type: "AllBranches" },
  authorizationVersion: 3,
});

const request = (session?: string) => new Request("https://catalog.example/api/workspace/members", {
  headers: session ? { "x-test-session": session } : {},
});

const writeRequest = (path: string, body: unknown) => new Request(`https://catalog.example${path}`, {
  method: "PATCH",
  headers: { "x-test-session": "owner-session", "content-type": "application/json" },
  body: JSON.stringify(body),
});

const memberReadModel = Object.freeze({
  actorId: "staff-a",
  displayName: "Staff A",
  username: "staff.a",
  role: "Staff" as const,
  accountStatus: "Active" as const,
  passwordChangeRequired: false,
  whatsappPhoneE164: "+967711111111",
  locale: "en" as const,
  branchScope: "SelectedBranches" as const,
  branchIds: Object.freeze(["branch-a"]),
  permissionCodes: Object.freeze(["catalog.products.view"]),
  authorizationVersion: 5,
  recoveryContactVersion: 2,
  profileUpdatedAt: new Date("2026-08-16T10:00:00.000Z"),
  createdAt: new Date("2026-08-01T10:00:00.000Z"),
  lastSessionIssuedAt: new Date("2026-08-15T10:00:00.000Z"),
});

const application = (
  resolveResult: unknown,
  overrides: Partial<IdentityMemberServerApplication> = {},
): IdentityMemberServerApplication => ({
  cookie: { read: (value: Request) => value.headers.get("x-test-session") } as IdentityMemberServerApplication["cookie"],
  origin: { allows: () => true } as IdentityMemberServerApplication["origin"],
  resolve: { execute: async () => resolveResult } as IdentityMemberServerApplication["resolve"],
  listMembers: { execute: async () => ({ ok: true, value: [] }) },
  getMember: { execute: async () => ({ ok: false, error: "MemberNotFound" }) },
  close: async () => {},
  ...overrides,
} as unknown as IdentityMemberServerApplication);

const resolved = (trusted: TrustedActorContext) => ({
  ok: true,
  value: {
    context: trusted,
    workspaceDisplayName: "Workspace",
    username: "owner",
    displayName: "Owner",
    passwordChangeRequired: false,
    sessionClass: "Full",
  },
});

describe("Identity member-management HTTP boundary", () => {
  it("maps the member list to an explicit redacted HTTP DTO", async () => {
    const response = await createIdentityMemberRouteHandlers(() => application(resolved(context()), {
      listMembers: { execute: async () => ({ ok: true, value: [memberReadModel] }) },
    })).list(request("owner-session"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { type: "Success", value: [{
      actorId: "staff-a",
      displayName: "Staff A",
      username: "staff.a",
      role: "Staff",
      accountStatus: "Active",
      passwordChangeRequired: false,
      whatsappPhoneE164: "+967711111111",
      locale: "en",
      branchScope: "SelectedBranches",
      branchIds: ["branch-a"],
      createdAt: "2026-08-01T10:00:00.000Z",
    }] });
  });

  it("maps member details to edit tokens without exposing internal version or session fields", async () => {
    const response = await createIdentityMemberRouteHandlers(() => application(resolved(context()), {
      getMember: { execute: async () => ({ ok: true, value: memberReadModel }) },
    })).details(request("owner-session"), "staff-a");
    assert.equal(response.status, 200);
    const body = await response.json() as { value: Record<string, unknown> };
    assert.equal(body.value.authorizationRevision, 5);
    assert.equal(body.value.profileRevision, "2026-08-16T10:00:00.000Z");
    assert.equal(body.value.recoveryContactRevision, 2);
    assert.deepEqual(body.value.permissionCodes, ["catalog.products.view"]);
    assert.equal("authorizationVersion" in body.value, false);
    assert.equal("recoveryContactVersion" in body.value, false);
    assert.equal("lastSessionIssuedAt" in body.value, false);
  });

  it("requires and forwards the observed authorization revision and maps stale edits to 409", async () => {
    let observedRevision: number | undefined;
    const handlers = createIdentityMemberRouteHandlers(() => application(resolved(context()), {
      updatePermissions: { execute: async (command) => {
        observedRevision = command.expectedAuthorizationRevision;
        return { ok: false, error: "AuthorizationConflict" };
      } },
    }));
    const response = await handlers.permissions(writeRequest("/api/workspace/members/staff-a/permissions", {
      permissionCodes: ["catalog.products.view"],
      expectedAuthorizationRevision: 5,
    }), "staff-a");
    assert.equal(response.status, 409);
    assert.equal(observedRevision, 5);
    const missing = await handlers.permissions(writeRequest("/api/workspace/members/staff-a/permissions", {
      permissionCodes: ["catalog.products.view"],
    }), "staff-a");
    assert.equal(missing.status, 400);
  });

  it("returns the committed communication-settings DTO and its server-authored revision", async () => {
    let observedRevision: string | undefined;
    const handlers = createIdentityMemberRouteHandlers(() => application(resolved(context()), {
      updateCommunicationSettings: { execute: async (command) => {
        observedRevision = command.expectedSettingsRevision;
        return {
          ok: true,
          value: {
            defaultWhatsAppPhoneE164: "+967722222222",
            passwordRecoveryPolicy: "OwnerManagedOnly",
            settingsRevision: "2026-08-16T10:00:01.000Z",
          },
        };
      } },
    }));
    const response = await handlers.updateCommunicationSettings(writeRequest(
      "/api/workspace/communication-settings",
      {
        defaultWhatsAppPhoneE164: "+967722222222",
        passwordRecoveryPolicy: "OwnerManagedOnly",
        expectedSettingsRevision: "2026-08-16T10:00:00.000Z",
      },
    ));
    assert.equal(response.status, 200);
    assert.equal(observedRevision, "2026-08-16T10:00:00.000Z");
    assert.deepEqual(await response.json(), {
      type: "Success",
      value: {
        defaultWhatsAppPhoneE164: "+967722222222",
        passwordRecoveryPolicy: "OwnerManagedOnly",
        settingsRevision: "2026-08-16T10:00:01.000Z",
      },
    });
  });

  it("returns 401 for unauthenticated and stale sessions", async () => {
    const noSession = await createIdentityMemberRouteHandlers(() => application(resolved(context()))).list(request());
    assert.equal(noSession.status, 401);
    const stale = await createIdentityMemberRouteHandlers(() => application({ ok: false, error: "SessionStaleAuthorizationVersion" }))
      .list(request("stale-session"));
    assert.equal(stale.status, 401);
  });

  it("forbids restricted sessions and full Staff sessions", async () => {
    const restricted = await createIdentityMemberRouteHandlers(() => application({ ok: false, error: "ForbiddenForRestrictedSession" }))
      .list(request("restricted-session"));
    assert.equal(restricted.status, 403);
    const staff = await createIdentityMemberRouteHandlers(() => application(resolved(context("Staff"))))
      .list(request("staff-session"));
    assert.equal(staff.status, 403);
  });

  it("maps a foreign Workspace target to scoped NotFound", async () => {
    const response = await createIdentityMemberRouteHandlers(() => application(resolved(context())))
      .details(request("owner-session"), "foreign-actor");
    assert.equal(response.status, 404);
    assert.deepEqual(await response.json(), { type: "MemberNotFound" });
  });

  it("returns only the owner-scoped active Branch-reference read model", async () => {
    const response = await createIdentityMemberRouteHandlers(() => application(resolved(context()), {
      branchReferences: { execute: async () => ({ ok: true, value: [{ branchId: "branch-a", status: "Active" }] }) },
    })).branchReferences(request("owner-session"));
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), { type: "Success", value: [{ branchId: "branch-a", status: "Active" }] });
  });
});
