import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createEnvironmentPublicRecoveryTiming, MinimumPublicRecoveryTiming } from "../public-recovery-timing";

describe("public recovery response timing", () => {
  it("uses non-busy asynchronous floors for send and probe operations", async () => {
    const timing = new MinimumPublicRecoveryTiming(10, 5);
    const sendStarted = new Date(Date.now());
    await timing.waitForMinimum("Request", sendStarted);
    assert.ok(Date.now() - sendStarted.getTime() >= 8);
    const probeStarted = new Date(Date.now());
    await timing.waitForMinimum("Verify", probeStarted);
    assert.ok(Date.now() - probeStarted.getTime() >= 3);
  });

  it("rejects a send floor below the bounded provider timeout", () => {
    assert.throws(() => createEnvironmentPublicRecoveryTiming({
      QSC_RECOVERY_PROVIDER_TIMEOUT_MS: "1000",
      QSC_RECOVERY_PUBLIC_SEND_FLOOR_MS: "1000",
    }), /PublicRecoveryTimingFloorBelowProviderTimeout/);
    assert.doesNotThrow(() => createEnvironmentPublicRecoveryTiming({
      QSC_RECOVERY_PROVIDER_TIMEOUT_MS: "1000",
      QSC_RECOVERY_PUBLIC_SEND_FLOOR_MS: "1250",
      QSC_RECOVERY_PUBLIC_PROBE_FLOOR_MS: "100",
    }));
  });
});
