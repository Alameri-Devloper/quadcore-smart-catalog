import type { RecoveryDeliveryFailureCode, RecoveryDeliveryPort, RecoveryDeliveryResult } from "../../application/ports";

export interface WorkspaceRecoveryDeliveryConfiguration {
  readonly enabled: boolean;
  readonly providerAccountReference: string;
  readonly senderReference: string;
  readonly templateReference: string;
}

export interface RecoveryDeliveryConfigurationPort {
  findForWorkspace(workspaceId: string): Promise<WorkspaceRecoveryDeliveryConfiguration | null>;
}

export type WhatsAppProviderResult =
  | { readonly ok: true; readonly providerReference?: string }
  | { readonly ok: false; readonly error: Exclude<RecoveryDeliveryFailureCode, "ConfigurationMissing"> };

export interface WhatsAppProviderPort {
  readonly providerName: string;
  send(input: {
    readonly providerAccountReference: string;
    readonly senderReference: string;
    readonly templateReference: string;
    readonly destination: string;
    readonly idempotencyKey: string;
    readonly locale: "ar" | "en";
    readonly message: string;
    readonly signal: AbortSignal;
  }): Promise<WhatsAppProviderResult>;
}

export const composeRecoveryMessage = (input: {
  readonly locale: "ar" | "en";
  readonly workspaceDisplayName: string;
  readonly code: string;
}): string => input.locale === "ar"
  ? `رمز استعادة حسابك في ${input.workspaceDisplayName}: ${input.code}\nينتهي الرمز خلال 10 دقائق.\nإذا لم تطلب هذا الرمز فتجاهل الرسالة.`
  : `Your ${input.workspaceDisplayName} account recovery code is: ${input.code}\nThis code expires in 10 minutes.\nIf you did not request it, ignore this message.`;

export class WhatsAppRecoveryDeliveryAdapter implements RecoveryDeliveryPort {
  readonly available = true;
  readonly adapterName: string;

  constructor(
    private readonly configuration: RecoveryDeliveryConfigurationPort,
    private readonly provider: WhatsAppProviderPort,
    private readonly timeoutMs = 8_000,
  ) {
    if (!Number.isSafeInteger(timeoutMs) || timeoutMs < 100 || timeoutMs > 60_000) {
      throw new Error("RecoveryDeliveryTimeoutInvalid");
    }
    this.adapterName = `WhatsApp:${provider.providerName}`;
  }

  async deliverCode(input: Parameters<RecoveryDeliveryPort["deliverCode"]>[0]): Promise<RecoveryDeliveryResult> {
    const configuration = await this.configuration.findForWorkspace(input.workspaceId);
    if (!configuration?.enabled) return { ok: false, error: "ConfigurationMissing" };
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout> | undefined;
    try {
      const providerCall = this.provider.send({
        providerAccountReference: configuration.providerAccountReference,
        senderReference: configuration.senderReference,
        templateReference: configuration.templateReference,
        destination: input.destination,
        idempotencyKey: input.idempotencyKey,
        locale: input.locale,
        message: composeRecoveryMessage(input),
        signal: controller.signal,
      });
      const timeout = new Promise<WhatsAppProviderResult>((resolve) => {
        timer = setTimeout(() => {
          controller.abort();
          resolve({ ok: false, error: "Timeout" });
        }, this.timeoutMs);
      });
      return await Promise.race([providerCall, timeout]);
    } catch {
      return { ok: false, error: controller.signal.aborted ? "Timeout" : "ProviderUnavailable" };
    } finally {
      if (timer) clearTimeout(timer);
    }
  }
}

export class EnvironmentRecoveryDeliveryConfiguration implements RecoveryDeliveryConfigurationPort {
  private readonly configurations: ReadonlyMap<string, WorkspaceRecoveryDeliveryConfiguration>;

  constructor(value: string | undefined) {
    let parsed: unknown;
    try { parsed = JSON.parse(value ?? ""); }
    catch { throw new Error("RecoveryDeliveryConfigurationInvalid"); }
    if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
      throw new Error("RecoveryDeliveryConfigurationInvalid");
    }
    const configurations = new Map<string, WorkspaceRecoveryDeliveryConfiguration>();
    for (const [workspaceId, candidate] of Object.entries(parsed)) {
      if (!candidate || Array.isArray(candidate) || typeof candidate !== "object") {
        throw new Error("RecoveryDeliveryConfigurationInvalid");
      }
      const record = candidate as Readonly<Record<string, unknown>>;
      const allowedKeys = ["enabled", "providerAccountReference", "senderReference", "templateReference"];
      if (
        Object.keys(record).length !== allowedKeys.length
        || Object.keys(record).some((key) => !allowedKeys.includes(key))
        ||
        typeof record.enabled !== "boolean"
        || typeof record.providerAccountReference !== "string"
        || typeof record.senderReference !== "string"
        || typeof record.templateReference !== "string"
        || !record.providerAccountReference
        || !record.senderReference
        || !record.templateReference
      ) throw new Error("RecoveryDeliveryConfigurationInvalid");
      configurations.set(workspaceId, Object.freeze({
        enabled: record.enabled,
        providerAccountReference: record.providerAccountReference,
        senderReference: record.senderReference,
        templateReference: record.templateReference,
      }));
    }
    this.configurations = configurations;
  }

  async findForWorkspace(workspaceId: string): Promise<WorkspaceRecoveryDeliveryConfiguration | null> {
    return this.configurations.get(workspaceId) ?? null;
  }
}
