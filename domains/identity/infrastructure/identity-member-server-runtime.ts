import { createPlatformDatabaseConnection } from "../../../shared/infrastructure/persistence/database";
import {
  ChangeWorkspaceMemberBranchScopeUseCase,
  ChangeWorkspaceMemberPermissionsUseCase,
  CreateWorkspaceMemberUseCase,
  DemoteWorkspaceOwnerToStaffUseCase,
  GetPermissionRegistryUseCase,
  GetPermissionTemplatesUseCase,
  ListActiveWorkspaceBranchReferencesUseCase,
  GetWorkspaceCommunicationSettingsUseCase,
  GetWorkspaceMemberDetailsUseCase,
  ListWorkspaceMembersUseCase,
  PromoteWorkspaceMemberToOwnerUseCase,
  ReactivateWorkspaceMemberUseCase,
  SuspendWorkspaceMemberUseCase,
  UpdateWorkspaceCommunicationSettingsUseCase,
  UpdateWorkspaceMemberProfileUseCase,
  UpdateWorkspaceMemberWhatsAppUseCase,
} from "../application/member-administration.use-cases";
import { OwnerResetPasswordUseCase } from "../application/password-reset.use-cases";
import { ResolveSessionUseCase } from "../application/session.use-cases";
import { Argon2idPasswordHasher } from "./crypto/argon2-password-hasher";
import { sessionTokenDigestFromEnvironment } from "./crypto/environment-session-token-digest";
import { SameOriginRequestPolicy, sameOriginPolicyFromEnvironment } from "./http/same-origin-request-policy";
import { SessionCookieAdapter, sessionCookieFromEnvironment } from "./http/session-cookie";
import { PostgreSqlIdentityUnitOfWork } from "./persistence/postgresql-identity-unit-of-work";
import { RandomIdentityIdentifierGenerator, SystemIdentityClock } from "./system-identity-adapters";

export interface IdentityMemberServerApplication {
  readonly resolve: Pick<ResolveSessionUseCase, "execute">;
  readonly createMember: Pick<CreateWorkspaceMemberUseCase, "execute">;
  readonly listMembers: Pick<ListWorkspaceMembersUseCase, "execute">;
  readonly getMember: Pick<GetWorkspaceMemberDetailsUseCase, "execute">;
  readonly updateProfile: Pick<UpdateWorkspaceMemberProfileUseCase, "execute">;
  readonly updateWhatsApp: Pick<UpdateWorkspaceMemberWhatsAppUseCase, "execute">;
  readonly updatePermissions: Pick<ChangeWorkspaceMemberPermissionsUseCase, "execute">;
  readonly updateBranchScope: Pick<ChangeWorkspaceMemberBranchScopeUseCase, "execute">;
  readonly promote: Pick<PromoteWorkspaceMemberToOwnerUseCase, "execute">;
  readonly demote: Pick<DemoteWorkspaceOwnerToStaffUseCase, "execute">;
  readonly suspend: Pick<SuspendWorkspaceMemberUseCase, "execute">;
  readonly reactivate: Pick<ReactivateWorkspaceMemberUseCase, "execute">;
  readonly resetCredential: Pick<OwnerResetPasswordUseCase, "execute">;
  readonly permissionRegistry: Pick<GetPermissionRegistryUseCase, "execute">;
  readonly permissionTemplates: Pick<GetPermissionTemplatesUseCase, "execute">;
  readonly branchReferences: Pick<ListActiveWorkspaceBranchReferencesUseCase, "execute">;
  readonly getCommunicationSettings: Pick<GetWorkspaceCommunicationSettingsUseCase, "execute">;
  readonly updateCommunicationSettings: Pick<UpdateWorkspaceCommunicationSettingsUseCase, "execute">;
  readonly cookie: SessionCookieAdapter;
  readonly origin: SameOriginRequestPolicy;
  close(): Promise<void>;
}

export type IdentityMemberServerApplicationFactory = () => IdentityMemberServerApplication;

export const openIdentityMemberServerApplication: IdentityMemberServerApplicationFactory = () => {
  const connection = createPlatformDatabaseConnection();
  try {
    const unitOfWork = new PostgreSqlIdentityUnitOfWork(connection.database);
    const hasher = new Argon2idPasswordHasher();
    const clock = new SystemIdentityClock();
    const identifiers = new RandomIdentityIdentifierGenerator();
    const digest = sessionTokenDigestFromEnvironment();
    return Object.freeze({
      resolve: new ResolveSessionUseCase(unitOfWork, digest, clock),
      createMember: new CreateWorkspaceMemberUseCase(unitOfWork, hasher, clock, identifiers),
      listMembers: new ListWorkspaceMembersUseCase(unitOfWork),
      getMember: new GetWorkspaceMemberDetailsUseCase(unitOfWork),
      updateProfile: new UpdateWorkspaceMemberProfileUseCase(unitOfWork, clock),
      updateWhatsApp: new UpdateWorkspaceMemberWhatsAppUseCase(unitOfWork, clock),
      updatePermissions: new ChangeWorkspaceMemberPermissionsUseCase(unitOfWork, clock),
      updateBranchScope: new ChangeWorkspaceMemberBranchScopeUseCase(unitOfWork, clock),
      promote: new PromoteWorkspaceMemberToOwnerUseCase(unitOfWork, clock),
      demote: new DemoteWorkspaceOwnerToStaffUseCase(unitOfWork, clock),
      suspend: new SuspendWorkspaceMemberUseCase(unitOfWork, clock),
      reactivate: new ReactivateWorkspaceMemberUseCase(unitOfWork, hasher, clock),
      resetCredential: new OwnerResetPasswordUseCase(unitOfWork, hasher, clock),
      permissionRegistry: new GetPermissionRegistryUseCase(unitOfWork),
      permissionTemplates: new GetPermissionTemplatesUseCase(unitOfWork),
      branchReferences: new ListActiveWorkspaceBranchReferencesUseCase(unitOfWork),
      getCommunicationSettings: new GetWorkspaceCommunicationSettingsUseCase(unitOfWork),
      updateCommunicationSettings: new UpdateWorkspaceCommunicationSettingsUseCase(unitOfWork, clock),
      cookie: sessionCookieFromEnvironment(),
      origin: sameOriginPolicyFromEnvironment(),
      close: () => connection.close(),
    });
  } catch (error) {
    void connection.close();
    throw error;
  }
};
