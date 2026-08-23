import { randomUUID } from "node:crypto";
import { createPlatformDatabaseConnection } from "../../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver } from "../../../identity/infrastructure/identity-server-runtime";
import { sameOriginPolicyFromEnvironment } from "../../../identity/infrastructure/http/same-origin-request-policy";
import { CreateBranchUseCase, GetBranchUseCase, ListBranchesUseCase, UpdateBranchUseCase } from "../application/branch.use-cases";
import { PostgreSqlBranchUnitOfWork } from "./persistence/postgresql-branch-unit-of-work";

export const openBranchServerApplication = () => {
  const connection = createPlatformDatabaseConnection(); const unitOfWork = new PostgreSqlBranchUnitOfWork(connection.database); const clock = { now: () => new Date() };
  return Object.freeze({ context: new IdentityAuthenticatedRequestContextResolver(), origin: sameOriginPolicyFromEnvironment(), list: new ListBranchesUseCase(unitOfWork), get: new GetBranchUseCase(unitOfWork), create: new CreateBranchUseCase({ unitOfWork, clock, identifiers: { next: randomUUID } }), update: new UpdateBranchUseCase({ unitOfWork, clock }), close: () => connection.close() });
};
export type BranchServerApplication = ReturnType<typeof openBranchServerApplication>;
