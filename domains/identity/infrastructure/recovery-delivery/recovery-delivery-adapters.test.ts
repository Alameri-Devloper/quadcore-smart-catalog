import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DevelopmentRecoveryDeliveryAdapter } from "./development-recovery-delivery.adapter";
import { recoveryDeliveryFromEnvironment } from "./environment-recovery-delivery";
import {
  EnvironmentRecoveryDeliveryConfiguration,
  WhatsAppRecoveryDeliveryAdapter,
  composeRecoveryMessage,
  type WhatsAppProviderPort,
} from "./whatsapp-recovery-delivery.adapter";

const input = {
  workspaceId: "workspace-1",
  workspaceDisplayName: "Store One",
  recoveryReference: "00000000-0000-4000-8000-000000000001",
  idempotencyKey: "identity-recovery-delivery:00000000-0000-4000-8000-000000000001",
  channel: "PrimaryRecoveryContact" as const,
  destination: "+967711234567",
  locale: "en" as const,
  code: "00148293",
  expiresAt: new Date("2026-08-17T00:10:00.000Z"),
};

describe("recovery delivery adapters", () => {
  it("captures plaintext only behind the explicit test interface and cannot activate in Production", async () => {
    assert.throws(() => new DevelopmentRecoveryDeliveryAdapter("production"), /DevelopmentRecoveryDeliveryForbiddenInProduction/);
    const adapter = new DevelopmentRecoveryDeliveryAdapter("test");
    assert.deepEqual(await adapter.deliverCode(input), { ok: true });
    assert.equal(JSON.stringify(adapter.listMetadataForTest()).includes(input.code), false);
    assert.equal(adapter.takeCodeForTest(input.recoveryReference), input.code);
    assert.equal(adapter.takeCodeForTest(input.recoveryReference), null);
  });

  it("fails closed unless an explicit mode and production provider are supplied", () => {
    assert.equal(recoveryDeliveryFromEnvironment({ NODE_ENV: "production" }).available, false);
    assert.equal(recoveryDeliveryFromEnvironment({ NODE_ENV: "production", QSC_RECOVERY_DELIVERY_MODE: "development" }).available, false);
    assert.equal(recoveryDeliveryFromEnvironment({ NODE_ENV: "test", QSC_RECOVERY_DELIVERY_MODE: "development" }).available, true);
    assert.equal(recoveryDeliveryFromEnvironment({ NODE_ENV: "production", QSC_RECOVERY_DELIVERY_MODE: "production" }).available, false);
  });

  it("uses Workspace configuration, locale-aware content, and a bounded provider timeout", async () => {
    const configuration = new EnvironmentRecoveryDeliveryConfiguration(JSON.stringify({
      "workspace-1": {
        enabled: true,
        providerAccountReference: "account-ref",
        senderReference: "sender-ref",
        templateReference: "template-ref",
      },
    }));
    let observedMessage = "";
    let observedIdempotencyKey = "";
    const provider: WhatsAppProviderPort = {
      providerName: "ContractTest",
      send: async (request) => {
        observedMessage = request.message;
        observedIdempotencyKey = request.idempotencyKey;
        return { ok: true, providerReference: "provider-ref" };
      },
    };
    const adapter = new WhatsAppRecoveryDeliveryAdapter(configuration, provider, 100);
    assert.deepEqual(await adapter.deliverCode(input), { ok: true, providerReference: "provider-ref" });
    assert.match(observedMessage, /00148293/);
    assert.equal(observedIdempotencyKey, input.idempotencyKey);
    assert.equal(observedIdempotencyKey.includes(input.code), false);
    assert.match(composeRecoveryMessage({ ...input, locale: "ar" }), /رمز استعادة/);

    const hangingProvider: WhatsAppProviderPort = {
      providerName: "Hanging",
      send: async () => new Promise(() => undefined),
    };
    const timed = new WhatsAppRecoveryDeliveryAdapter(configuration, hangingProvider, 100);
    assert.deepEqual(await timed.deliverCode(input), { ok: false, error: "Timeout" });
  });

  it("rejects secret-like or unapproved extra Workspace configuration fields", () => {
    assert.throws(() => new EnvironmentRecoveryDeliveryConfiguration(JSON.stringify({
      "workspace-1": {
        enabled: true,
        providerAccountReference: "account-ref",
        senderReference: "sender-ref",
        templateReference: "template-ref",
        unexpectedField: "unexpected-value",
      },
    })), /RecoveryDeliveryConfigurationInvalid/);
  });
});
