import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { BranchScopeCommand } from "../../application/member-administration.use-cases";
import type { IdentityResult } from "../../application/identity-results";
import type { MemberAdministrationReadModel } from "../../repositories/identity.repositories";
import type { IdentityMemberServerApplication, IdentityMemberServerApplicationFactory } from "../identity-member-server-runtime";

const json = (body: unknown, status: number): Response => Response.json(body, {
  status,
  headers: { "cache-control": "no-store" },
});

const empty = (status = 204): Response => new Response(null, { status, headers: { "cache-control": "no-store" } });

const resultResponse = <T>(result: IdentityResult<T>, successStatus = 200): Response => {
  if (result.ok) return successStatus === 204 ? empty() : json({ type: "Success", value: result.value }, successStatus);
  const status = result.error === "OwnerRequired" || result.error === "ForbiddenForRestrictedSession" ? 403
    : ["MemberNotFound", "AccountNotFound", "WorkspaceNotFound"].includes(result.error) ? 404
      : ["UsernameAlreadyExists", "WhatsAppAlreadyInUse", "LastActiveOwnerProtected", "AuthorizationConflict", "CredentialUpdateConflict", "TargetAlreadySuspended", "TargetNotSuspended"].includes(result.error) ? 409
        : result.error === "InfrastructureUnavailable" ? 503
          : 400;
  return json({ type: result.error }, status);
};

export interface MemberListHttpDto {
  readonly actorId: string;
  readonly displayName: string;
  readonly username: string;
  readonly role: MemberAdministrationReadModel["role"];
  readonly accountStatus: MemberAdministrationReadModel["accountStatus"];
  readonly passwordChangeRequired: boolean;
  readonly whatsappPhoneE164: string;
  readonly locale: MemberAdministrationReadModel["locale"];
  readonly branchScope: MemberAdministrationReadModel["branchScope"];
  readonly branchIds: readonly string[];
  readonly createdAt: string;
}

export interface MemberDetailsHttpDto extends MemberListHttpDto {
  readonly permissionCodes: readonly string[];
  /** Concurrency token only; never a source of authority. */
  readonly authorizationRevision: number;
  /** Concurrency token only; echoed unchanged by profile mutations. */
  readonly profileRevision: string;
  /** Concurrency token only; echoed unchanged by recovery-contact mutations. */
  readonly recoveryContactRevision: number;
}

const memberListDto = (member: MemberAdministrationReadModel): MemberListHttpDto => Object.freeze({
  actorId: member.actorId,
  displayName: member.displayName,
  username: member.username,
  role: member.role,
  accountStatus: member.accountStatus,
  passwordChangeRequired: member.passwordChangeRequired,
  whatsappPhoneE164: member.whatsappPhoneE164,
  locale: member.locale,
  branchScope: member.branchScope,
  branchIds: member.branchIds,
  createdAt: member.createdAt.toISOString(),
});

const memberDetailsDto = (member: MemberAdministrationReadModel): MemberDetailsHttpDto => Object.freeze({
  ...memberListDto(member),
  permissionCodes: member.permissionCodes,
  authorizationRevision: member.authorizationVersion,
  profileRevision: member.profileUpdatedAt.toISOString(),
  recoveryContactRevision: member.recoveryContactVersion,
});

const mappedResultResponse = <T, U>(result: IdentityResult<T>, map: (value: T) => U): Response =>
  result.ok ? json({ type: "Success", value: map(result.value) }, 200) : resultResponse(result);

const readObject = async (request: Request): Promise<Record<string, unknown> | null> => {
  try {
    const body = await request.json() as unknown;
    return body && typeof body === "object" && !Array.isArray(body) ? body as Record<string, unknown> : null;
  } catch { return null; }
};

const stringValue = (body: Record<string, unknown>, key: string): string | null =>
  typeof body[key] === "string" ? body[key] : null;

const positiveIntegerValue = (body: Record<string, unknown>, key: string): number | null => {
  const value = body[key];
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0 ? value : null;
};

const isoRevisionValue = (body: Record<string, unknown>, key: string): string | null => {
  const value = stringValue(body, key);
  if (!value) return null;
  try { return new Date(value).toISOString() === value ? value : null; }
  catch { return null; }
};

const optionalStringArray = (body: Record<string, unknown>, key: string): readonly string[] | undefined | null => {
  if (!(key in body)) return undefined;
  const value = body[key];
  return Array.isArray(value) && value.every((item) => typeof item === "string") ? value : null;
};

const branchScopeValue = (value: unknown): BranchScopeCommand | null => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const body = value as Record<string, unknown>;
  if (body.type !== "AllBranches" && body.type !== "SelectedBranches") return null;
  const branchIds = body.branchIds;
  if (branchIds !== undefined && (!Array.isArray(branchIds) || !branchIds.every((item) => typeof item === "string"))) return null;
  return { type: body.type, ...(branchIds ? { branchIds: branchIds as string[] } : {}) };
};

const authenticateOwner = async (
  application: IdentityMemberServerApplication,
  request: Request,
): Promise<{ readonly context: TrustedActorContext } | Response> => {
  const rawSessionValue = application.cookie.read(request);
  if (!rawSessionValue) return json({ type: "AuthenticationRequired" }, 401);
  const resolved = await application.resolve.execute({ rawSessionValue, requiredClass: "Full" });
  if (!resolved.ok) {
    return resolved.error === "ForbiddenForRestrictedSession"
      ? json({ type: "ForbiddenForRestrictedSession" }, 403)
      : json({ type: "AuthenticationRequired" }, 401);
  }
  if (resolved.value.context.role !== "Owner") return json({ type: "OwnerRequired" }, 403);
  return Object.freeze({ context: resolved.value.context });
};

const withApplication = async (
  open: IdentityMemberServerApplicationFactory,
  request: Request,
  write: boolean,
  work: (application: IdentityMemberServerApplication, context: TrustedActorContext) => Promise<Response>,
): Promise<Response> => {
  let application: IdentityMemberServerApplication | undefined;
  try {
    application = open();
    if (write && !application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const authenticated = await authenticateOwner(application, request);
    if (authenticated instanceof Response) return authenticated;
    return await work(application, authenticated.context);
  } catch { return json({ type: "MemberManagementServiceUnavailable" }, 503); }
  finally {
    try { await application?.close(); }
    catch { /* A fail-closed response has already been selected. */ }
  }
};

const invalidRequest = (): Response => json({ type: "InvalidRequest" }, 400);

export const createIdentityMemberRouteHandlers = (open: IdentityMemberServerApplicationFactory) => ({
  list: (request: Request): Promise<Response> => withApplication(open, request, false, async (application, context) =>
    mappedResultResponse(await application.listMembers.execute({ context }), (members) => members.map(memberListDto))),

  create: (request: Request): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    if (!body) return invalidRequest();
    const username = stringValue(body, "username");
    const displayName = stringValue(body, "displayName");
    const whatsappPhoneE164 = stringValue(body, "whatsappPhoneE164");
    const locale = stringValue(body, "locale");
    const role = stringValue(body, "role");
    const temporaryCredential = stringValue(body, "temporaryPassword");
    const branchScope = branchScopeValue(body.branchScope);
    const permissionCodes = optionalStringArray(body, "permissionCodes");
    const permissionTemplateId = body.permissionTemplateId === undefined ? undefined : stringValue(body, "permissionTemplateId");
    if (!username || !displayName || !whatsappPhoneE164 || !temporaryCredential || !branchScope || permissionCodes === null
      || (locale !== "ar" && locale !== "en") || (role !== "Owner" && role !== "Staff")
      || permissionTemplateId === null) return invalidRequest();
    return resultResponse(await application.createMember.execute({
      context, username, displayName, whatsappPhoneE164, locale, role, ["temporaryPassword"]: temporaryCredential, branchScope,
      ...(permissionCodes ? { permissionCodes } : {}),
      ...(permissionTemplateId ? { permissionTemplateId } : {}),
    }), 201);
  }),

  details: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, false, async (application, context) =>
    mappedResultResponse(await application.getMember.execute({ context, targetActorId: actorId }), memberDetailsDto)),

  profile: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    if (!body) return invalidRequest();
    const displayName = stringValue(body, "displayName");
    const locale = stringValue(body, "locale");
    const expectedProfileRevision = isoRevisionValue(body, "expectedProfileRevision");
    if (!displayName || !expectedProfileRevision || (locale !== "ar" && locale !== "en")) return invalidRequest();
    return resultResponse(await application.updateProfile.execute({ context, targetActorId: actorId, displayName, locale, expectedProfileRevision }), 204);
  }),

  whatsapp: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    const whatsappPhoneE164 = body && stringValue(body, "whatsappPhoneE164");
    const expectedRecoveryContactRevision = body && positiveIntegerValue(body, "expectedRecoveryContactRevision");
    return whatsappPhoneE164 && expectedRecoveryContactRevision
      ? resultResponse(await application.updateWhatsApp.execute({ context, targetActorId: actorId, whatsappPhoneE164, expectedRecoveryContactRevision }))
      : invalidRequest();
  }),

  permissions: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    if (!body) return invalidRequest();
    const permissionCodes = optionalStringArray(body, "permissionCodes");
    const permissionTemplateId = body.permissionTemplateId === undefined ? undefined : stringValue(body, "permissionTemplateId");
    const expectedAuthorizationRevision = positiveIntegerValue(body, "expectedAuthorizationRevision");
    if (permissionCodes === null || permissionTemplateId === null || !expectedAuthorizationRevision) return invalidRequest();
    return resultResponse(await application.updatePermissions.execute({
      context, targetActorId: actorId, expectedAuthorizationRevision,
      ...(permissionCodes ? { permissionCodes } : {}),
      ...(permissionTemplateId ? { permissionTemplateId } : {}),
    }));
  }),

  branchScope: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    const branchScope = body && branchScopeValue(body.branchScope);
    const expectedAuthorizationRevision = body && positiveIntegerValue(body, "expectedAuthorizationRevision");
    return branchScope && expectedAuthorizationRevision
      ? resultResponse(await application.updateBranchScope.execute({ context, targetActorId: actorId, branchScope, expectedAuthorizationRevision }))
      : invalidRequest();
  }),

  promote: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    const expectedAuthorizationRevision = body && positiveIntegerValue(body, "expectedAuthorizationRevision");
    return expectedAuthorizationRevision
      ? resultResponse(await application.promote.execute({ context, targetActorId: actorId, expectedAuthorizationRevision }))
      : invalidRequest();
  }),

  demote: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    if (!body) return invalidRequest();
    const permissionCodes = optionalStringArray(body, "permissionCodes");
    const branchScope = branchScopeValue(body.branchScope);
    const expectedAuthorizationRevision = positiveIntegerValue(body, "expectedAuthorizationRevision");
    return permissionCodes && branchScope && expectedAuthorizationRevision
      ? resultResponse(await application.demote.execute({ context, targetActorId: actorId, permissionCodes, branchScope, expectedAuthorizationRevision }))
      : invalidRequest();
  }),

  suspend: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) =>
    resultResponse(await application.suspend.execute({ context, targetActorId: actorId }), 204)),

  reactivate: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    const newTemporaryPassword = body && stringValue(body, "newTemporaryPassword");
    return newTemporaryPassword
      ? resultResponse(await application.reactivate.execute({ context, targetActorId: actorId, newTemporaryPassword }))
      : invalidRequest();
  }),

  resetPassword: (request: Request, actorId: string): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    const newTemporaryPassword = body && stringValue(body, "newTemporaryPassword");
    return newTemporaryPassword
      ? resultResponse(await application.resetCredential.execute({
        workspaceId: context.workspaceId,
        requestedByActorId: context.actorId,
        targetActorId: actorId,
        newTemporaryPassword,
      }))
      : invalidRequest();
  }),

  permissionRegistry: (request: Request): Promise<Response> => withApplication(open, request, false, async (application, context) =>
    resultResponse(await application.permissionRegistry.execute({ context }))),

  permissionTemplates: (request: Request): Promise<Response> => withApplication(open, request, false, async (application, context) =>
    resultResponse(await application.permissionTemplates.execute({ context }))),

  branchReferences: (request: Request): Promise<Response> => withApplication(open, request, false, async (application, context) =>
    resultResponse(await application.branchReferences.execute({ context }))),

  getCommunicationSettings: (request: Request): Promise<Response> => withApplication(open, request, false, async (application, context) =>
    resultResponse(await application.getCommunicationSettings.execute({ context }))),

  updateCommunicationSettings: (request: Request): Promise<Response> => withApplication(open, request, true, async (application, context) => {
    const body = await readObject(request);
    const defaultWhatsAppPhoneE164 = body && stringValue(body, "defaultWhatsAppPhoneE164");
    const passwordRecoveryPolicy = body && stringValue(body, "passwordRecoveryPolicy");
    const expectedSettingsRevision = body && isoRevisionValue(body, "expectedSettingsRevision");
    if (!defaultWhatsAppPhoneE164 || !expectedSettingsRevision || (passwordRecoveryPolicy !== "OwnerManagedOnly" && passwordRecoveryPolicy !== "WhatsAppOtpWithOwnerFallback")) {
      return invalidRequest();
    }
    return resultResponse(await application.updateCommunicationSettings.execute({
      context, defaultWhatsAppPhoneE164, passwordRecoveryPolicy, expectedSettingsRevision,
    }));
  }),
});
