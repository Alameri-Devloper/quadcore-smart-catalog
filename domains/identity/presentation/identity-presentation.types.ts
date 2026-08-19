export type Locale = "ar" | "en";
export type WorkspaceRole = "Owner" | "Staff";
export type AccountStatus = "PendingActivation" | "Active" | "Suspended";
export type BranchScopeType = "AllBranches" | "SelectedBranches";

export interface BranchScopeDraft {
  readonly type: BranchScopeType;
  readonly branchIds: readonly string[];
}

export interface SafeActorView {
  readonly actorId: string;
  readonly workspaceDisplayName: string;
  readonly username: string;
  readonly displayName: string;
  readonly role: WorkspaceRole;
  readonly branchScope: BranchScopeType;
  readonly passwordChangeRequired: boolean;
  readonly sessionClass: "Restricted" | "Full";
}

export type AuthViewState =
  | { readonly type: "Loading" }
  | { readonly type: "Unauthenticated" }
  | { readonly type: "Restricted"; readonly actor: SafeActorView }
  | { readonly type: "Authenticated"; readonly actor: SafeActorView }
  | { readonly type: "Unavailable" };

export interface MemberListView {
  readonly actorId: string;
  readonly displayName: string;
  readonly username: string;
  readonly role: WorkspaceRole;
  readonly accountStatus: AccountStatus;
  readonly passwordChangeRequired: boolean;
  readonly whatsappPhoneE164: string;
  readonly locale: Locale;
  readonly branchScope: BranchScopeType;
  readonly branchIds: readonly string[];
  readonly createdAt: string;
}

export interface MemberDetailsView extends MemberListView {
  readonly permissionCodes: readonly string[];
  /** Observed concurrency token only. Presentation must echo it unchanged. */
  readonly authorizationRevision: number;
  /** Observed concurrency token only. Presentation must echo it unchanged. */
  readonly profileRevision: string;
  /** Observed concurrency token only. Presentation must echo it unchanged. */
  readonly recoveryContactRevision: number;
}

export interface PermissionDefinitionView {
  readonly code: string;
  readonly module: string;
  readonly displayKey: string;
  readonly descriptionKey: string;
  readonly assignableToStaff: boolean;
  readonly sensitive: boolean;
}

export interface PermissionTemplateView {
  readonly id: string;
  readonly displayKey: string;
  readonly descriptionKey: string;
  readonly permissionCodes: readonly string[];
}

export interface BranchReferenceView {
  readonly branchId: string;
  readonly status: "Active";
}

export interface CommunicationSettingsView {
  readonly defaultWhatsAppPhoneE164: string;
  readonly passwordRecoveryPolicy: "OwnerManagedOnly" | "WhatsAppOtpWithOwnerFallback";
  /** Observed concurrency token only. Presentation must echo it unchanged. */
  readonly settingsRevision: string;
}

export interface RecoveryRequestView {
  readonly type: "RecoveryRequestAccepted";
  readonly recoveryReference: string;
  readonly retryAfterSeconds: number;
}

export interface RecoveryResendView {
  readonly type: "RecoveryResendAccepted";
  readonly recoveryReference: string;
  readonly retryAfterSeconds: number;
}

export interface RecoveryVerifiedView {
  readonly type: "RecoveryCodeVerified";
  readonly recoveryReference: string;
}

export type ApiFailureKind =
  | "Unauthorized"
  | "Forbidden"
  | "NotFound"
  | "Conflict"
  | "ValidationError"
  | "Throttled"
  | "Unavailable"
  | "UnexpectedError";

export type ApiResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly kind: ApiFailureKind; readonly code: string; readonly status: number };

export type AsyncViewState =
  | "Loading"
  | "Ready"
  | "Empty"
  | "Submitting"
  | "Success"
  | "ValidationError"
  | "Forbidden"
  | "Unauthorized"
  | "Conflict"
  | "Unavailable"
  | "UnexpectedError";
