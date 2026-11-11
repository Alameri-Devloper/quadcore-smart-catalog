export type PublicShareManagementReadiness = "Ready" | "KeyUnavailable" | "IntegrityFailure" | "ServiceUnavailable";
/** Internal statement-snapshot evidence, never a durable readiness certificate. */
export interface PublicShareManagementReadinessPort { check(): Promise<PublicShareManagementReadiness>; }
