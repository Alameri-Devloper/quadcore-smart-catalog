import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { IdentityApiClient } from "./identity-api.client";
import { translate } from "./identity-i18n";
import {
  apiFailureKindForStatus,
  authViewStateFromResult,
  communicationSettingsAfterConfirmedSave,
  createAsyncActionGate,
  generateTemporaryPassword,
  isLogoutSafelyConfirmed,
  isBranchScopeDraftValid,
  isWesternOtp,
  normalizeWesternOtpDraft,
  passwordValidationCode,
  safeReturnPath,
  secondsRemaining,
} from "./identity-presentation.utils";

describe("Identity Presentation utilities", () => {
  it("accepts only safe internal return paths", () => {
    assert.equal(safeReturnPath("/members?role=Owner"), "/members?role=Owner");
    assert.equal(safeReturnPath("https://evil.example/members"), "/");
    assert.equal(safeReturnPath("//evil.example/members"), "/");
    assert.equal(safeReturnPath("javascript:alert(1)"), "/");
    assert.equal(safeReturnPath("/\\evil.example"), "/");
  });

  it("preserves password spaces and enforces the shared UX metadata", () => {
    const password = "  permanent password  ";
    assert.equal(passwordValidationCode(password), null);
    assert.equal(password, "  permanent password  ");
    assert.equal(passwordValidationCode("            "), "PasswordAllSpace");
    assert.equal(passwordValidationCode("short"), "PasswordLength");
  });

  it("accepts eight Western OTP digits without converting Arabic-Indic digits", () => {
    assert.equal(isWesternOtp("12345678"), true);
    assert.equal(isWesternOtp("١٢٣٤٥٦٧٨"), false);
    assert.equal(normalizeWesternOtpDraft("12 34-567890"), "12345678");
    assert.equal(normalizeWesternOtpDraft("١٢٣٤٥٦٧٨"), "");
    assert.equal(secondsRemaining(61_000, 1_500), 60);
  });

  it("requires an explicit selected Branch and generates a non-space temporary password", () => {
    assert.equal(isBranchScopeDraftValid({ type: "SelectedBranches", branchIds: [] }), false);
    assert.equal(isBranchScopeDraftValid({ type: "SelectedBranches", branchIds: ["branch-a"] }), true);
    let counter = 0;
    const generated = generateTemporaryPassword({
      getRandomValues: <T extends ArrayBufferView | null>(array: T): T => {
        if (array instanceof Uint8Array) for (let index = 0; index < array.length; index += 1) array[index] = counter++ % 200;
        return array;
      },
    });
    assert.equal(Array.from(generated).length, 20);
    assert.equal(passwordValidationCode(generated), null);
  });

  it("centralizes HTTP and authenticated view-state mapping", () => {
    assert.equal(apiFailureKindForStatus(401), "Unauthorized");
    assert.equal(apiFailureKindForStatus(409), "Conflict");
    assert.equal(apiFailureKindForStatus(503), "Unavailable");
    assert.deepEqual(authViewStateFromResult({ ok: false, kind: "Unauthorized", code: "AuthenticationRequired", status: 401 }), { type: "Unauthenticated" });
    const actor = { actorId: "actor-a", workspaceDisplayName: "Workspace", username: "owner", displayName: "Owner", role: "Owner" as const, branchScope: "AllBranches" as const, passwordChangeRequired: true, sessionClass: "Restricted" as const };
    assert.equal(authViewStateFromResult({ ok: true, value: actor }).type, "Restricted");
    assert.equal(isLogoutSafelyConfirmed({ ok: true, value: null }), true);
    assert.equal(isLogoutSafelyConfirmed({ ok: false, kind: "Unauthorized", code: "AuthenticationRequired", status: 401 }), true);
    assert.equal(isLogoutSafelyConfirmed({ ok: false, kind: "Unavailable", code: "InfrastructureUnavailable", status: 0 }), false);
    assert.equal(isLogoutSafelyConfirmed({ ok: false, kind: "Unavailable", code: "AuthenticationServiceUnavailable", status: 503 }), false);
  });

  it("suppresses duplicate actions while the first request is active", async () => {
    const gate = createAsyncActionGate();
    let calls = 0;
    let release!: () => void;
    const blocker = new Promise<void>((resolve) => { release = resolve; });
    const first = gate.run(async () => { calls += 1; await blocker; return "confirmed"; });
    const duplicate = await gate.run(async () => { calls += 1; return "duplicate"; });
    assert.equal(duplicate, null);
    assert.equal(calls, 1);
    assert.equal(gate.isActive(), true);
    release();
    assert.equal(await first, "confirmed");
    assert.equal(gate.isActive(), false);
  });

  it("provides generic enumeration-safe authentication and bilingual recovery copy", () => {
    assert.equal(translate("en", "genericLoginFailure"), "Unable to sign in. Check your details and try again.");
    assert.match(translate("ar", "recoveryGeneric"), /إذا كان الحساب/);
  });
});

describe("Identity API client", () => {
  it("sends credentials through the HTTP boundary without token handling", async () => {
    let captured: RequestInit | undefined;
    const client = new IdentityApiClient(async (_input, init) => {
      captured = init;
      return Response.json({ type: "LoginSucceeded", sessionClass: "Full", passwordChangeRequired: false });
    });
    const result = await client.login({ workspaceCode: "store-01", username: "owner", password: "  permanent password  " });
    assert.equal(result.ok, true);
    assert.equal(captured?.credentials, "same-origin");
    assert.equal(captured?.body, JSON.stringify({ workspaceCode: "store-01", username: "owner", password: "  permanent password  " }));
    assert.equal(JSON.stringify(result).includes("permanent password"), false);
  });

  it("maps conflicts and session expiry without replaying a mutation", async () => {
    let calls = 0;
    let captured: RequestInit | undefined;
    const client = new IdentityApiClient(async (_input, init) => {
      calls += 1;
      captured = init;
      return Response.json({ type: "AuthorizationConflict" }, { status: 409 });
    });
    const result = await client.updatePermissions("actor-a", ["catalog.products.view"], 5);
    assert.deepEqual(result, { ok: false, kind: "Conflict", code: "AuthorizationConflict", status: 409 });
    assert.equal(calls, 1);
    assert.equal(captured?.body, JSON.stringify({ permissionCodes: ["catalog.products.view"], expectedAuthorizationRevision: 5 }));
  });

  it("adopts only confirmed server settings revisions and uses the new revision on the next save", async () => {
    const revisionsSent: string[] = [];
    const responses: Array<Response | Error> = [
      Response.json({ type: "Success", value: {
        defaultWhatsAppPhoneE164: "+967722222222",
        passwordRecoveryPolicy: "OwnerManagedOnly",
        settingsRevision: "2026-08-16T10:00:01.000Z",
      } }),
      Response.json({ type: "Success", value: {
        defaultWhatsAppPhoneE164: "+967733333333",
        passwordRecoveryPolicy: "WhatsAppOtpWithOwnerFallback",
        settingsRevision: "2026-08-16T10:00:02.000Z",
      } }),
      new Error("network down"),
      Response.json({ type: "AuthenticationServiceUnavailable" }, { status: 503 }),
    ];
    const client = new IdentityApiClient(async (_input, init) => {
      const body = JSON.parse(String(init?.body)) as { expectedSettingsRevision: string };
      revisionsSent.push(body.expectedSettingsRevision);
      const response = responses.shift()!;
      if (response instanceof Error) throw response;
      return response;
    });
    const initial = {
      defaultWhatsAppPhoneE164: "+967711111111",
      passwordRecoveryPolicy: "WhatsAppOtpWithOwnerFallback" as const,
      settingsRevision: "2026-08-16T10:00:00.000Z",
    };

    const firstResult = await client.updateCommunicationSettings({
      ...initial,
      defaultWhatsAppPhoneE164: "+967722222222",
      passwordRecoveryPolicy: "OwnerManagedOnly",
    });
    const afterFirst = communicationSettingsAfterConfirmedSave(initial, firstResult);
    assert.equal(afterFirst.settingsRevision, "2026-08-16T10:00:01.000Z");

    const secondResult = await client.updateCommunicationSettings({
      ...afterFirst,
      defaultWhatsAppPhoneE164: "+967733333333",
      passwordRecoveryPolicy: "WhatsAppOtpWithOwnerFallback",
    });
    const afterSecond = communicationSettingsAfterConfirmedSave(afterFirst, secondResult);
    assert.equal(afterSecond.settingsRevision, "2026-08-16T10:00:02.000Z");

    const networkResult = await client.updateCommunicationSettings(afterSecond);
    const afterNetworkFailure = communicationSettingsAfterConfirmedSave(afterSecond, networkResult);
    const unavailableResult = await client.updateCommunicationSettings(afterSecond);
    const afterUnavailable = communicationSettingsAfterConfirmedSave(afterSecond, unavailableResult);
    assert.equal(afterNetworkFailure, afterSecond);
    assert.equal(afterUnavailable, afterSecond);
    assert.deepEqual(revisionsSent, [
      "2026-08-16T10:00:00.000Z",
      "2026-08-16T10:00:01.000Z",
      "2026-08-16T10:00:02.000Z",
      "2026-08-16T10:00:02.000Z",
    ]);
  });

  it("distinguishes confirmed, already-invalid, network-failed, and unavailable logout outcomes", async () => {
    const responses: Array<Response | Error> = [
      new Response(null, { status: 204 }),
      Response.json({ type: "AuthenticationRequired" }, { status: 401 }),
      new Error("network down"),
      Response.json({ type: "AuthenticationServiceUnavailable" }, { status: 503 }),
    ];
    const client = new IdentityApiClient(async () => {
      const response = responses.shift()!;
      if (response instanceof Error) throw response;
      return response;
    });
    const success = await client.logout();
    const invalid = await client.logout();
    const network = await client.logout();
    const unavailable = await client.logout();
    assert.equal(isLogoutSafelyConfirmed(success), true);
    assert.equal(isLogoutSafelyConfirmed(invalid), true);
    assert.equal(isLogoutSafelyConfirmed(network), false);
    assert.equal(isLogoutSafelyConfirmed(unavailable), false);
  });

  it("maps an expired change-password session once without replaying the password mutation", async () => {
    let calls = 0;
    const client = new IdentityApiClient(async () => {
      calls += 1;
      return Response.json({ type: "AuthenticationRequired" }, { status: 401 });
    });
    const result = await client.changePassword({ currentPassword: "Current password 123", newPassword: "New password 12345" });
    assert.deepEqual(result, { ok: false, kind: "Unauthorized", code: "AuthenticationRequired", status: 401 });
    assert.equal(calls, 1);
  });
});
