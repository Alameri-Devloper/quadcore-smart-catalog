import type { RecoveryDeliveryPort, RecoveryDeliveryResult } from "../../application/ports";

export class UnavailableRecoveryDeliveryAdapter implements RecoveryDeliveryPort {
  readonly adapterName = "Unavailable";
  readonly available = false;

  async deliverCode(): Promise<RecoveryDeliveryResult> {
    return { ok: false, error: "ConfigurationMissing" };
  }
}

