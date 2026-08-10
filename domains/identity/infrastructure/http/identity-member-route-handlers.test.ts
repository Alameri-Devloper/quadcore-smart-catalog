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
  it("allows a full Owner session and keeps the response redacted", async () => {
    const response = await createIdentityMemberRouteHandlers(() => application(resolved(context()))).list(request("owner-session"));
    assert.equal(response.status, 200);
    const body = await response.text();
    assert.equal(body.includes("passwordHash"), false);
    assert.equal(body.includes("sessionDigest"), false);
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
});
