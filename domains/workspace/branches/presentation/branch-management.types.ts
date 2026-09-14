/** General Branch management only; operational discovery has a separate contract. */
export interface BranchManagementView {
  readonly branchId: string;
  readonly code: string;
  readonly displayName: string;
  readonly status: "Active" | "Inactive";
  readonly sortOrder: number;
  readonly revision: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

export type BranchManagementFailure =
  | "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "Forbidden"
  | "OriginNotAllowed" | "InvalidInput" | "BranchNotFound" | "Conflict"
  | "CodeConflict" | "BranchServiceUnavailable" | "NetworkFailure"
  | "MalformedResponse" | "UnexpectedResponse";
export type BranchManagementResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly kind: BranchManagementFailure };
export type BranchLoad<T> =
  | { readonly type: "Idle" | "Loading" }
  | { readonly type: "Ready"; readonly value: T }
  | { readonly type: "Failed"; readonly kind: BranchManagementFailure };
export interface CreateBranchInput {
  readonly code: string;
  readonly displayName: string;
  readonly sortOrder: number;
}
export interface UpdateBranchInput {
  readonly expectedRevision: number;
  readonly displayName: string;
  readonly sortOrder: number;
  readonly status: BranchManagementView["status"];
}
export interface BranchDraft {
  readonly code: string;
  readonly displayName: string;
  readonly sortOrder: string;
  readonly status: BranchManagementView["status"];
}
export type BranchField = "code" | "displayName" | "sortOrder";
export type BranchFieldErrors = Readonly<Partial<Record<BranchField, "required" | "numberRequired">>>;
export type BranchEditor =
  | { readonly type: "Closed" }
  | { readonly type: "Create"; readonly draft: BranchDraft }
  | { readonly type: "Edit"; readonly branchId: string; readonly detail: BranchLoad<BranchManagementView>; readonly draft: BranchDraft | null; readonly reviewRequired: boolean };
export interface BranchManagementState {
  readonly list: BranchLoad<readonly BranchManagementView[]>;
  readonly editor: BranchEditor;
  readonly pending: boolean;
  readonly failure: BranchManagementFailure | null;
  readonly fields: BranchFieldErrors;
  readonly saved: boolean;
}
export interface WorkspaceBranchPort {
  list(signal?: AbortSignal): Promise<BranchManagementResult<readonly BranchManagementView[]>>;
  get(branchId: string, signal?: AbortSignal): Promise<BranchManagementResult<BranchManagementView>>;
  create(input: CreateBranchInput, signal?: AbortSignal): Promise<BranchManagementResult<BranchManagementView>>;
  update(branchId: string, input: UpdateBranchInput, signal?: AbortSignal): Promise<BranchManagementResult<BranchManagementView>>;
}
