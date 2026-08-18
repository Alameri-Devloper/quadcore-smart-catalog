import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { IdentityRecoveryServerApplication } from "../identity-recovery-server-runtime";
import { createIdentityRecoveryRouteHandlers } from "./identity-recovery-route-handlers";
import { SameOriginRequestPolicy } from "./same-origin-request-policy";

const reference = "00000000-0000-4000-8000-000000000001";

const application = (overrides: Partial<IdentityRecoveryServerApplication> = {}): IdentityRecoveryServerApplication => ({
  recovery: {
    available: true,
    request: async () => ({ type: "RecoveryRequestAccepted", recoveryReference: reference, retryAfterSeconds: 60 }),
    resend: async () => ({ type: "RecoveryResendAccepted", recoveryReference: reference, retryAfterSeconds: 60 }),
    verify: async () => ({ type: "RecoveryCodeVerified", recoveryReference: reference }),
    reset: async () => ({ type: "RecoveryResetCompleted" }),
  },
  origin: new SameOriginRequestPolicy(),
  close: async () => undefined,
  ...overrides,
});

const writeRequest = (path: string, body: unknown, origin = "https://qsc.example") => new Request(`https://qsc.example${path}`, {
  method: "POST",
  headers: { "content-type": "application/json", origin, host: "qsc.example" },
  body: JSON.stringify(body),
});

describe("Identity recovery HTTP boundary", () => {
  it("returns the same accepted request envelope without internal account diagnostics", async () => {
    const handlers = createIdentityRecoveryRouteHandlers(() => application());
    const response = await handlers.request(writeRequest("/api/auth/recovery/request", { workspaceCode: "store-01", username: "owner" }));
    assert.equal(response.status, 202);
    const body = await response.text();
    assert.match(body, /RecoveryRequestAccepted/);
    assert.equal(/WorkspaceNotFound|AccountNotFound|AccountSuspended|RecoveryNotAllowed/.test(body), false);
    assert.equal(response.headers.get("cache-control"), "no-store");
  });

  it("maps resend throttling and verification failures to safe public states", async () => {
    const handlers = createIdentityRecoveryRouteHandlers(() => application({
      recovery: {
        ...application().recovery,
        resend: async () => ({ type: "RecoveryResendThrottled", retryAfterSeconds: 60 }),
        verify: async () => ({ type: "RecoveryCodeInvalidOrExpired" }),
      },
    }));
    const resend = await handlers.resend(writeRequest("/api/auth/recovery/resend", { recoveryReference: reference }));
    assert.equal(resend.status, 429);
    assert.equal((await resend.json() as { type: string }).type, "RecoveryResendThrottled");
    const verify = await handlers.verify(writeRequest("/api/auth/recovery/verify", { recoveryReference: reference, otp: "00148293" }));
    assert.equal(verify.status, 400);
    assert.deepEqual(await verify.json(), { type: "RecoveryCodeInvalidOrExpired" });
  });

  it("rejects malformed DTOs and cross-origin writes without opening account-specific behavior", async () => {
    const handlers = createIdentityRecoveryRouteHandlers(() => application());
    assert.equal((await handlers.verify(writeRequest("/api/auth/recovery/verify", { recoveryReference: reference, otp: "١٢٣٤٥٦٧٨" }))).status, 400);
    assert.equal((await handlers.request(writeRequest("/api/auth/recovery/request", { workspaceCode: "store-01", username: "owner", actorId: "actor-1" }))).status, 400);
    assert.equal((await handlers.request(writeRequest("/api/auth/recovery/request", { workspaceCode: "store-01", username: "owner" }, "https://evil.example"))).status, 403);
  });

  it("fails closed for globally unavailable delivery before identity lookup", async () => {
    let called = false;
    const base = application();
    const handlers = createIdentityRecoveryRouteHandlers(() => application({
      recovery: {
        ...base.recovery,
        available: false,
        request: async () => { called = true; return { type: "RecoveryUnavailable" }; },
      },
    }));
    const response = await handlers.request(writeRequest("/api/auth/recovery/request", { workspaceCode: "store-01", username: "owner" }));
    assert.equal(response.status, 503);
    assert.equal(called, false);
  });
});
