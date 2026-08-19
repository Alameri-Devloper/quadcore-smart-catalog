import type { RecoveryDeliveryPort, RecoveryDeliveryResult } from "../../application/ports";

interface CapturedDevelopmentDelivery {
  readonly workspaceId: string;
  readonly recoveryReference: string;
  readonly locale: "ar" | "en";
  readonly expiresAt: Date;
  readonly code: string;
}

export interface DevelopmentDeliveryMetadata {
  readonly workspaceId: string;
  readonly recoveryReference: string;
  readonly locale: "ar" | "en";
  readonly expiresAt: Date;
}

export class DevelopmentRecoveryDeliveryAdapter implements RecoveryDeliveryPort {
  readonly adapterName = "DevelopmentCapture";
  readonly available = true;
  private readonly captured = new Map<string, CapturedDevelopmentDelivery>();

  constructor(environment: string | undefined = process.env.NODE_ENV) {
    if (environment === "production") throw new Error("DevelopmentRecoveryDeliveryForbiddenInProduction");
  }

  async deliverCode(input: Parameters<RecoveryDeliveryPort["deliverCode"]>[0]): Promise<RecoveryDeliveryResult> {
    this.captured.set(input.recoveryReference, Object.freeze({
      workspaceId: input.workspaceId,
      recoveryReference: input.recoveryReference,
      locale: input.locale,
      expiresAt: new Date(input.expiresAt),
      code: input.code,
    }));
    return { ok: true };
  }

  listMetadataForTest(): readonly DevelopmentDeliveryMetadata[] {
    return Object.freeze([...this.captured.values()].map((delivery) => Object.freeze({
      workspaceId: delivery.workspaceId,
      recoveryReference: delivery.recoveryReference,
      locale: delivery.locale,
      expiresAt: new Date(delivery.expiresAt),
    })));
  }

  takeCodeForTest(recoveryReference: string): string | null {
    const delivery = this.captured.get(recoveryReference);
    if (!delivery) return null;
    this.captured.delete(recoveryReference);
    return delivery.code;
  }
}

