import type { PublicProductShareGrantRepository, PublicProductShareTuple } from "./public-product-share-grant-repository.port";
import type { PublicShareEligibilityResource } from "../domain/public-product-share-eligibility";

export type PublicProductShareResourceState = PublicShareEligibilityResource;
export interface PublicProductShareResourcePort {
  lockProductParent(workspaceId: string, productId: string): Promise<boolean>;
  existsInScope(tuple: PublicProductShareTuple): Promise<boolean>;
  // Full issuance eligibility; never needed for existing-link retrieval.
  readCurrent(tuple: PublicProductShareTuple): Promise<PublicProductShareResourceState | null>;
}
export interface PublicProductShareAuditRecord {
  readonly workspaceId: string;
  readonly actorId: string;
  readonly eventType: "PublicProductShareIssued" | "PublicProductShareRevoked" | "PublicProductShareReplaced";
  readonly grantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly occurredAt: Date;
  readonly previousGrantId?: string;
}
export interface PublicProductShareAuditRepository { append(record: PublicProductShareAuditRecord): Promise<void> }
export interface PublicProductShareTransactionContext {
  readonly grants: PublicProductShareGrantRepository;
  readonly resources: PublicProductShareResourcePort;
  readonly audit: PublicProductShareAuditRepository;
}
// Explicit abort discriminant: a business failure after a write must not commit.
export type PublicProductShareTransactionDecision<T> =
  | { readonly type: "Commit"; readonly value: T }
  | { readonly type: "Rollback"; readonly value: T };
// READ COMMITTED management; Product parent then grants in ID order; thrown work/audit errors rollback.
export interface PublicProductShareUnitOfWork {
  execute<T>(work: (context: PublicProductShareTransactionContext)
    => Promise<PublicProductShareTransactionDecision<T>>): Promise<T>;
}
export interface PublicProductShareClock { now(): Date }
export interface PublicProductShareIdentifierGenerator { next(): string }
