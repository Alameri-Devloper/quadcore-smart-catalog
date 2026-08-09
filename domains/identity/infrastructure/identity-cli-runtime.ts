import { createPlatformDatabaseConnection } from "../../../shared/infrastructure/persistence/database";
import { EmergencyOwnerPasswordResetUseCase } from "../application/password-reset.use-cases";
import { WorkspaceBootstrapUseCase } from "../application/workspace-bootstrap.use-case";
import { Argon2idPasswordHasher } from "./crypto/argon2-password-hasher";
import { PostgreSqlIdentityUnitOfWork } from "./persistence/postgresql-identity-unit-of-work";
import { RandomIdentityIdentifierGenerator, SystemIdentityClock } from "./system-identity-adapters";

export const createIdentityCliRuntime = (connectionString = process.env.DATABASE_URL) => {
  const connection = createPlatformDatabaseConnection(connectionString);
  const unitOfWork = new PostgreSqlIdentityUnitOfWork(connection.database);
  const passwordHasher = new Argon2idPasswordHasher();
  const clock = new SystemIdentityClock();
  return {
    workspaceBootstrap: new WorkspaceBootstrapUseCase(
      unitOfWork,
      passwordHasher,
      clock,
      new RandomIdentityIdentifierGenerator(),
    ),
    emergencyOwnerPasswordReset: new EmergencyOwnerPasswordResetUseCase(unitOfWork, passwordHasher, clock),
    close: () => connection.close(),
  };
};
