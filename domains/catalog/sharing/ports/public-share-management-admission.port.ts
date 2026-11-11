export type PublicShareManagementOperation = "Issue" | "Copy" | "Replace" | "Revoke";
export interface PublicShareManagementAdmissionPolicy {
  readonly budgets: Readonly<Record<PublicShareManagementOperation, { readonly user: number; readonly workspace: number }>>;
  readonly windowSeconds: 60;
  readonly cleanupGraceSeconds: 900;
  readonly lockTimeoutMs: 250;
  readonly statementTimeoutMs: 1000;
}
export interface PublicShareManagementAdmissionInput {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly operation: PublicShareManagementOperation;
}
export type PublicShareManagementAdmissionResult =
  | { readonly type: "Allowed" }
  | { readonly type: "Denied"; readonly retryAfterSeconds: number }
  | { readonly type: "Unavailable" };
/** Identities come only from the freshly resolved Full session. */
export interface PublicShareManagementAdmissionPort {
  admit(input: PublicShareManagementAdmissionInput): Promise<PublicShareManagementAdmissionResult>;
}
