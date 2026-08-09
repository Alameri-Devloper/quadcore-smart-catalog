import type { PlatformDatabase } from "../../../../shared/infrastructure/persistence/database";
import { PostgreSqlSecurityAuditRepository } from "../../../../shared/audit/infrastructure/persistence/postgresql-security-audit.repository";
import { PostgreSqlWorkspaceCommunicationSettingsRepository, PostgreSqlWorkspaceRepository } from "../../../workspace/infrastructure/persistence/postgresql-workspace.repository";
import type { IdentityTransactionDecision, IdentityTransactionalContext, IdentityUnitOfWork } from "../../repositories/identity.repositories";
import {
  PostgreSqlAccountRepository,
  PostgreSqlLoginProtectionRepository,
  PostgreSqlMemberProfileRepository,
  PostgreSqlMembershipRepository,
  PostgreSqlPasswordCredentialRepository,
  PostgreSqlPasswordRecoveryChallengeRepository,
  PostgreSqlSessionRepository,
} from "./postgresql-identity.repositories";

class ExpectedIdentityRollback<T> extends Error {
  constructor(readonly result: T) {
    super("Expected Identity transaction rollback.");
  }
}

export class PostgreSqlIdentityUnitOfWork implements IdentityUnitOfWork {
  constructor(private readonly database: PlatformDatabase) {}

  async execute<T>(work: (context: IdentityTransactionalContext) => Promise<IdentityTransactionDecision<T>>): Promise<T> {
    try {
      return await this.database.transaction(async (transaction) => {
        const database = transaction as unknown as PlatformDatabase;
        const context: IdentityTransactionalContext = Object.freeze({
          workspaceRepository: new PostgreSqlWorkspaceRepository(database),
          workspaceCommunicationSettingsRepository: new PostgreSqlWorkspaceCommunicationSettingsRepository(database),
          accountRepository: new PostgreSqlAccountRepository(database),
          passwordCredentialRepository: new PostgreSqlPasswordCredentialRepository(database),
          loginProtectionRepository: new PostgreSqlLoginProtectionRepository(database),
          passwordRecoveryChallengeRepository: new PostgreSqlPasswordRecoveryChallengeRepository(database),
          memberProfileRepository: new PostgreSqlMemberProfileRepository(database),
          membershipRepository: new PostgreSqlMembershipRepository(database),
          sessionRepository: new PostgreSqlSessionRepository(database),
          audit: new PostgreSqlSecurityAuditRepository(database),
        });
        const decision = await work(context);
        if (decision.type === "Rollback") throw new ExpectedIdentityRollback(decision.result);
        return decision.result;
      });
    } catch (error) {
      if (error instanceof ExpectedIdentityRollback) return error.result;
      throw error;
    }
  }
}
