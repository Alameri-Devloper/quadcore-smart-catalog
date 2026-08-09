export type TrustedWorkspaceRole = "Owner" | "Staff";

export type TrustedBranchScope =
  | { readonly type: "AllBranches" }
  | { readonly type: "SelectedBranches"; readonly branchIds: readonly string[] };

export interface TrustedActorContext {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly role: TrustedWorkspaceRole;
  readonly permissions: readonly string[];
  readonly branchScope: TrustedBranchScope;
  readonly authorizationVersion: number;
}

export interface AuthenticatedRequestContextResolver {
  resolve(request: Request): Promise<TrustedActorContext>;
}

export class AuthenticatedContextUnavailableError extends Error {
  constructor() {
    super("Authenticated request context is unavailable.");
    this.name = "AuthenticatedContextUnavailableError";
  }
}

export class RestrictedSessionContextError extends Error {
  constructor() {
    super("Restricted sessions cannot create a full trusted actor context.");
    this.name = "RestrictedSessionContextError";
  }
}
