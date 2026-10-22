export type PublicShareManagementOperation = "issue" | "copy" | "revoke" | "replace";
export type PublicShareManagementFailure = "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "PermissionDenied" | "BranchScopeDenied" | "NotFound" | "NoActiveGrant" | "IssueIneligible" | "ReplacementIneligible" | "ExpectedCurrentGrantConflict" | "InvalidInput" | "BodyTooLarge" | "KeyUnavailable" | "IntegrityFailure" | "ServiceUnavailable" | "OriginNotAllowed" | "AdmissionDenied";
export type PublicShareManagementResult =
  | { readonly ok: true; readonly type: "Created" | "Reused" | "Found" | "Replaced"; readonly grantId: string; readonly url: string }
  | { readonly ok: true; readonly type: "Revoked" | "AlreadyRevoked"; readonly grantId: string }
  | { readonly ok: false; readonly error: PublicShareManagementFailure };
export interface PublicShareManagementClientPort {
  execute(operation: PublicShareManagementOperation, input: { readonly productId: string; readonly branchId?: string; readonly grantId?: string }, signal: AbortSignal): Promise<PublicShareManagementResult>;
}
export interface PublicShareClipboardPort { writeText(value: string): Promise<void>; }
