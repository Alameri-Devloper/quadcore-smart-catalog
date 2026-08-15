import type {
  ApiResult,
  BranchReferenceView,
  BranchScopeDraft,
  CommunicationSettingsView,
  MemberDetailsView,
  MemberListView,
  PermissionDefinitionView,
  PermissionTemplateView,
  SafeActorView,
  WorkspaceRole,
  Locale,
} from "./identity-presentation.types";
import { apiFailureKindForStatus } from "./identity-presentation.utils";

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;

interface SuccessEnvelope<T> { readonly type: "Success"; readonly value: T }

const responseCode = (body: unknown, fallback: string): string => {
  if (body && typeof body === "object" && "type" in body && typeof body.type === "string") return body.type;
  return fallback;
};

const request = async <T>(fetchPort: FetchPort, path: string, init?: RequestInit): Promise<ApiResult<T>> => {
  try {
    const response = await fetchPort(path, {
      ...init,
      credentials: "same-origin",
      cache: "no-store",
      headers: { "content-type": "application/json", ...(init?.headers ?? {}) },
    });
    const body = response.status === 204 ? null : await response.json().catch(() => null) as unknown;
    if (!response.ok) return {
      ok: false,
      status: response.status,
      kind: apiFailureKindForStatus(response.status),
      code: responseCode(body, "UnexpectedError"),
    };
    const value = body && typeof body === "object" && "type" in body && body.type === "Success" && "value" in body
      ? (body as SuccessEnvelope<T>).value
      : body as T;
    return { ok: true, value };
  } catch {
    return { ok: false, status: 0, kind: "Unavailable", code: "InfrastructureUnavailable" };
  }
};

export interface CreateMemberInput {
  readonly username: string;
  readonly displayName: string;
  readonly whatsappPhoneE164: string;
  readonly locale: Locale;
  readonly role: WorkspaceRole;
  readonly permissionCodes?: readonly string[];
  readonly permissionTemplateId?: string;
  readonly branchScope: BranchScopeDraft;
  readonly temporaryPassword: string;
}

export class IdentityApiClient {
  constructor(private readonly fetchPort: FetchPort = fetch) {}

  me(): Promise<ApiResult<SafeActorView>> { return request(this.fetchPort, "/api/auth/me"); }

  login(input: { readonly workspaceCode: string; readonly username: string; readonly password: string }): Promise<ApiResult<{
    readonly type: "LoginSucceeded";
    readonly sessionClass: "Restricted" | "Full";
    readonly passwordChangeRequired: boolean;
  }>> { return request(this.fetchPort, "/api/auth/login", { method: "POST", body: JSON.stringify(input) }); }

  logout(): Promise<ApiResult<null>> { return request(this.fetchPort, "/api/auth/logout", { method: "POST" }); }

  changePassword(input: { readonly currentPassword: string; readonly newPassword: string }): Promise<ApiResult<{
    readonly type: "LoginSucceeded";
    readonly sessionClass: "Full";
    readonly passwordChangeRequired: false;
  }>> { return request(this.fetchPort, "/api/auth/change-password", { method: "POST", body: JSON.stringify(input) }); }

  members(): Promise<ApiResult<readonly MemberListView[]>> { return request(this.fetchPort, "/api/workspace/members"); }
  member(actorId: string): Promise<ApiResult<MemberDetailsView>> { return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}`); }
  createMember(input: CreateMemberInput): Promise<ApiResult<{ readonly actorId: string }>> {
    return request(this.fetchPort, "/api/workspace/members", { method: "POST", body: JSON.stringify(input) });
  }
  updateProfile(actorId: string, input: { readonly displayName: string; readonly locale: Locale; readonly expectedProfileRevision: string }): Promise<ApiResult<null>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/profile`, { method: "PATCH", body: JSON.stringify(input) });
  }
  updateWhatsApp(actorId: string, whatsappPhoneE164: string, expectedRecoveryContactRevision: number): Promise<ApiResult<unknown>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/whatsapp`, { method: "PATCH", body: JSON.stringify({ whatsappPhoneE164, expectedRecoveryContactRevision }) });
  }
  updatePermissions(actorId: string, permissionCodes: readonly string[], expectedAuthorizationRevision: number): Promise<ApiResult<unknown>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/permissions`, { method: "PATCH", body: JSON.stringify({ permissionCodes, expectedAuthorizationRevision }) });
  }
  updateBranchScope(actorId: string, branchScope: BranchScopeDraft, expectedAuthorizationRevision: number): Promise<ApiResult<unknown>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/branch-scope`, { method: "PATCH", body: JSON.stringify({ branchScope, expectedAuthorizationRevision }) });
  }
  promote(actorId: string, expectedAuthorizationRevision: number): Promise<ApiResult<unknown>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/promote`, { method: "POST", body: JSON.stringify({ expectedAuthorizationRevision }) });
  }
  demote(actorId: string, permissionCodes: readonly string[], branchScope: BranchScopeDraft, expectedAuthorizationRevision: number): Promise<ApiResult<unknown>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/demote`, { method: "POST", body: JSON.stringify({ permissionCodes, branchScope, expectedAuthorizationRevision }) });
  }
  suspend(actorId: string): Promise<ApiResult<null>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/suspend`, { method: "POST", body: "{}" });
  }
  reactivate(actorId: string, newTemporaryPassword: string): Promise<ApiResult<unknown>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/reactivate`, { method: "POST", body: JSON.stringify({ newTemporaryPassword }) });
  }
  resetPassword(actorId: string, newTemporaryPassword: string): Promise<ApiResult<unknown>> {
    return request(this.fetchPort, `/api/workspace/members/${encodeURIComponent(actorId)}/reset-password`, { method: "POST", body: JSON.stringify({ newTemporaryPassword }) });
  }
  permissions(): Promise<ApiResult<readonly PermissionDefinitionView[]>> { return request(this.fetchPort, "/api/workspace/permissions"); }
  permissionTemplates(): Promise<ApiResult<readonly PermissionTemplateView[]>> { return request(this.fetchPort, "/api/workspace/permission-templates"); }
  branchReferences(): Promise<ApiResult<readonly BranchReferenceView[]>> { return request(this.fetchPort, "/api/workspace/branch-references"); }
  communicationSettings(): Promise<ApiResult<CommunicationSettingsView>> { return request(this.fetchPort, "/api/workspace/communication-settings"); }
  updateCommunicationSettings(input: CommunicationSettingsView): Promise<ApiResult<CommunicationSettingsView>> {
    return request(this.fetchPort, "/api/workspace/communication-settings", {
      method: "PATCH",
      body: JSON.stringify({
        defaultWhatsAppPhoneE164: input.defaultWhatsAppPhoneE164,
        passwordRecoveryPolicy: input.passwordRecoveryPolicy,
        expectedSettingsRevision: input.settingsRevision,
      }),
    });
  }
}

export const identityApiClient = new IdentityApiClient();
