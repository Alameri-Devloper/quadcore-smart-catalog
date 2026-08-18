import type { RecoveryDeliveryPort } from "../../application/ports";
import { DevelopmentRecoveryDeliveryAdapter } from "./development-recovery-delivery.adapter";
import { UnavailableRecoveryDeliveryAdapter } from "./unavailable-recovery-delivery.adapter";
import {
  EnvironmentRecoveryDeliveryConfiguration,
  WhatsAppRecoveryDeliveryAdapter,
  type WhatsAppProviderPort,
} from "./whatsapp-recovery-delivery.adapter";

export const recoveryDeliveryFromEnvironment = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
  productionProvider?: WhatsAppProviderPort,
): RecoveryDeliveryPort => {
  const mode = environment.QSC_RECOVERY_DELIVERY_MODE;
  if (mode === "development") {
    if (environment.NODE_ENV === "production") return new UnavailableRecoveryDeliveryAdapter();
    return new DevelopmentRecoveryDeliveryAdapter(environment.NODE_ENV);
  }
  if (mode === "production" && environment.NODE_ENV === "production" && productionProvider) {
    const configuration = new EnvironmentRecoveryDeliveryConfiguration(
      environment.QSC_RECOVERY_PROVIDER_WORKSPACES_JSON,
    );
    const timeout = environment.QSC_RECOVERY_PROVIDER_TIMEOUT_MS
      ? Number(environment.QSC_RECOVERY_PROVIDER_TIMEOUT_MS)
      : 8_000;
    return new WhatsAppRecoveryDeliveryAdapter(configuration, productionProvider, timeout);
  }
  return new UnavailableRecoveryDeliveryAdapter();
};
