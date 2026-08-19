import type { PublicRecoveryOperation, PublicRecoveryTimingPort } from "../application/ports";

const DEFAULT_PROVIDER_TIMEOUT_MS = 8_000;
const PROVIDER_TIMEOUT_MARGIN_MS = 250;
const DEFAULT_PROBE_FLOOR_MS = 250;

export class MinimumPublicRecoveryTiming implements PublicRecoveryTimingPort {
  constructor(private readonly sendFloorMs: number, private readonly probeFloorMs: number) {
    if (
      !Number.isSafeInteger(sendFloorMs) || sendFloorMs < 0 || sendFloorMs > 120_000
      || !Number.isSafeInteger(probeFloorMs) || probeFloorMs < 0 || probeFloorMs > 120_000
    ) throw new Error("PublicRecoveryTimingConfigurationInvalid");
  }

  async waitForMinimum(operation: PublicRecoveryOperation, startedAt: Date): Promise<void> {
    const floor = operation === "Request" || operation === "Resend" ? this.sendFloorMs : this.probeFloorMs;
    const remaining = floor - (Date.now() - startedAt.getTime());
    if (remaining <= 0) return;
    await new Promise<void>((resolve) => setTimeout(resolve, remaining));
  }
}

const readDuration = (value: string | undefined, fallback: number): number => {
  if (value === undefined) return fallback;
  const parsed = Number(value);
  if (!Number.isSafeInteger(parsed) || parsed < 0 || parsed > 120_000) {
    throw new Error("PublicRecoveryTimingEnvironmentInvalid");
  }
  return parsed;
};

export const createEnvironmentPublicRecoveryTiming = (
  environment: Readonly<Record<string, string | undefined>> = process.env,
): MinimumPublicRecoveryTiming => {
  const providerTimeout = readDuration(environment.QSC_RECOVERY_PROVIDER_TIMEOUT_MS, DEFAULT_PROVIDER_TIMEOUT_MS);
  const configuredSendFloor = readDuration(
    environment.QSC_RECOVERY_PUBLIC_SEND_FLOOR_MS,
    providerTimeout + PROVIDER_TIMEOUT_MARGIN_MS,
  );
  const probeFloor = readDuration(environment.QSC_RECOVERY_PUBLIC_PROBE_FLOOR_MS, DEFAULT_PROBE_FLOOR_MS);
  if (configuredSendFloor < providerTimeout + PROVIDER_TIMEOUT_MARGIN_MS) {
    throw new Error("PublicRecoveryTimingFloorBelowProviderTimeout");
  }
  return new MinimumPublicRecoveryTiming(configuredSendFloor, probeFloor);
};
