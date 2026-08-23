import { createHash, randomUUID } from "node:crypto";
import { createPlatformDatabaseConnection } from "../../../shared/infrastructure/persistence/database";
import { IdentityAuthenticatedRequestContextResolver } from "../../identity/infrastructure/identity-server-runtime";
import { sameOriginPolicyFromEnvironment } from "../../identity/infrastructure/http/same-origin-request-policy";
import { CorrectInventoryUseCase, FulfillInventoryReservationUseCase, GetBranchProductInventoryUseCase, IssueInventoryUseCase, ListInventoryMovementsUseCase, MarkInventoryDamagedUseCase, ReceiveInventoryUseCase, ReleaseInventoryReservationUseCase, ReserveInventoryUseCase, RestoreDamagedInventoryUseCase, TransferInventoryUseCase } from "../application/inventory.use-cases";
import { PostgreSqlInventoryUnitOfWork } from "./persistence/postgresql-inventory-unit-of-work";

export const openInventoryServerApplication = () => {
  const connection = createPlatformDatabaseConnection(); const unitOfWork = new PostgreSqlInventoryUnitOfWork(connection.database);
  const dependencies = { unitOfWork, clock: { now: () => new Date() }, identifiers: { next: randomUUID }, fingerprint: { create: (value: Readonly<Record<string, string>>) => createHash("sha256").update(JSON.stringify(Object.entries(value).sort(([left], [right]) => left.localeCompare(right)))).digest("hex") } };
  return Object.freeze({ context: new IdentityAuthenticatedRequestContextResolver(), origin: sameOriginPolicyFromEnvironment(), receive: new ReceiveInventoryUseCase(dependencies), issue: new IssueInventoryUseCase(dependencies), reserve: new ReserveInventoryUseCase(dependencies), release: new ReleaseInventoryReservationUseCase(dependencies), fulfill: new FulfillInventoryReservationUseCase(dependencies), damage: new MarkInventoryDamagedUseCase(dependencies), restore: new RestoreDamagedInventoryUseCase(dependencies), correct: new CorrectInventoryUseCase(dependencies), transfer: new TransferInventoryUseCase(dependencies), get: new GetBranchProductInventoryUseCase(unitOfWork), movements: new ListInventoryMovementsUseCase(unitOfWork), close: () => connection.close() });
};
export type InventoryServerApplication = ReturnType<typeof openInventoryServerApplication>;
