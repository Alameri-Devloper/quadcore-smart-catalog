import { E164PhoneNumber } from "../../../shared/domain/e164-phone-number";
import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { SECURITY_AUDIT_EVENT_TYPES } from "../../../shared/audit/audit.port";
import { Workspace, WorkspaceCode } from "../../workspace/domain/workspace";
import { Account } from "../domain/account";
import { LoginProtection } from "../domain/login-protection";
import { createMemberProfile, createMembership } from "../domain/member";
import { PasswordCredential } from "../domain/password-credential";
import { validatePassword } from "../domain/password";
import { Username } from "../domain/username";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import { identityFailure, identitySuccess, type IdentityResult } from "./identity-results";
import type { IdentityClock, IdentityIdentifierGenerator, PasswordHasher } from "./ports";

export interface WorkspaceBootstrapCommand {
  readonly companyId: string;
  readonly workspaceCode: string;
  readonly workspaceDisplayName: string;
  readonly ownerUsername: string;
  readonly ownerDisplayName: string;
  readonly ownerRecoveryPhone: string;
  readonly defaultWhatsAppPhone?: string;
  readonly temporaryPassword: string;
}

export interface WorkspaceBootstrapReceipt {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly workspaceCode: string;
  readonly normalizedUsername: string;
  readonly accountStatus: "PendingActivation";
  readonly passwordLifecycle: "Temporary";
  readonly role: "Owner";
  readonly branchScope: "AllBranches";
}

export class WorkspaceBootstrapUseCase {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly passwordHasher: PasswordHasher,
    private readonly clock: IdentityClock,
    private readonly identifiers: IdentityIdentifierGenerator,
  ) {}

  async execute(command: WorkspaceBootstrapCommand): Promise<IdentityResult<WorkspaceBootstrapReceipt>> {
    let code: WorkspaceCode;
    let username: Username;
    let ownerRecoveryPhone: E164PhoneNumber;
    let defaultWhatsAppPhone: E164PhoneNumber;
    try {
      code = WorkspaceCode.create(command.workspaceCode);
      username = Username.create(command.ownerUsername);
      validatePassword(command.temporaryPassword);
      ownerRecoveryPhone = E164PhoneNumber.create(command.ownerRecoveryPhone);
      defaultWhatsAppPhone = E164PhoneNumber.create(command.defaultWhatsAppPhone ?? command.ownerRecoveryPhone);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      if (message === "WorkspaceCodeInvalid") return identityFailure("WorkspaceCodeInvalid");
      if (message === "UsernameInvalid") return identityFailure("UsernameInvalid");
      if (message === "PasswordInvalid") return identityFailure("PasswordInvalid");
      return identityFailure("BootstrapInputInvalid");
    }

    const now = this.clock.now();
    const workspaceId = WorkspaceId.create(this.identifiers.workspaceId());
    const actorId = ActorId.create(this.identifiers.actorId());
    let passwordHash;
    try {
      passwordHash = await this.passwordHasher.hash(command.temporaryPassword);
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }

    try {
      return await this.unitOfWork.execute(async (context) => {
        let workspace: Workspace;
        try {
          workspace = Workspace.create({
            workspaceId,
            companyId: command.companyId,
            code,
            displayName: command.workspaceDisplayName,
            passwordRecoveryPolicy: "WhatsAppOtpWithOwnerFallback",
            createdAt: now,
            updatedAt: now,
          });
        } catch {
          return rollbackIdentityTransaction(identityFailure<WorkspaceBootstrapReceipt>("BootstrapInputInvalid"));
        }

        const workspaceOutcome = await context.workspaceRepository.create(workspace);
        if (workspaceOutcome === "WorkspaceCodeAlreadyExists") {
          return rollbackIdentityTransaction(identityFailure<WorkspaceBootstrapReceipt>("WorkspaceCodeAlreadyExists"));
        }
        if (workspaceOutcome !== "Created") {
          return rollbackIdentityTransaction(identityFailure<WorkspaceBootstrapReceipt>("InfrastructureUnavailable"));
        }

        const account = Account.create({ workspaceId, actorId, username, createdAt: now });
        const accountOutcome = await context.accountRepository.create(account);
        if (accountOutcome === "UsernameAlreadyExists") {
          return rollbackIdentityTransaction(identityFailure<WorkspaceBootstrapReceipt>("UsernameAlreadyExists"));
        }
        if (accountOutcome !== "Created") {
          return rollbackIdentityTransaction(identityFailure<WorkspaceBootstrapReceipt>("ActorIdAlreadyExists"));
        }

        await context.passwordCredentialRepository.create(PasswordCredential.createTemporary({
          workspaceId,
          actorId,
          passwordHash,
          createdAt: now,
        }));
        await context.loginProtectionRepository.create(LoginProtection.create(workspaceId, actorId, now));
        await context.memberProfileRepository.create(createMemberProfile({
          workspaceId,
          actorId,
          displayName: command.ownerDisplayName,
          recoveryPhone: ownerRecoveryPhone,
          recoveryContactVersion: 1,
          createdAt: now,
          updatedAt: now,
        }));
        await context.membershipRepository.create(createMembership({
          workspaceId,
          actorId,
          role: "Owner",
          branchScope: "AllBranches",
          createdAt: now,
          updatedAt: now,
        }));
        await context.workspaceCommunicationSettingsRepository.create({
          workspaceId,
          defaultWhatsAppPhone,
          createdAt: now,
          updatedAt: now,
        });
        await context.audit.append([
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.workspaceBootstrapped,
            actorId,
            subjectActorId: actorId,
            resultCode: "Created",
            occurredAt: now,
            metadata: { workspaceCode: code.value },
          },
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.identityAccountCreated,
            actorId,
            subjectActorId: actorId,
            resultCode: "PendingActivation",
            occurredAt: now,
          },
          {
            workspaceId,
            eventType: SECURITY_AUDIT_EVENT_TYPES.temporaryCredentialIssued,
            actorId,
            subjectActorId: actorId,
            resultCode: "Temporary",
            occurredAt: now,
          },
        ]);

        return commitIdentityTransaction(identitySuccess({
          workspaceId: workspaceId.value,
          actorId: actorId.value,
          workspaceCode: code.value,
          normalizedUsername: username.normalizedValue,
          accountStatus: "PendingActivation",
          passwordLifecycle: "Temporary",
          role: "Owner",
          branchScope: "AllBranches",
        }));
      });
    } catch {
      return identityFailure("InfrastructureUnavailable");
    }
  }
}
