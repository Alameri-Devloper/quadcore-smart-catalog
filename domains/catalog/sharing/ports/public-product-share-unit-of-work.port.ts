import type { PublicProductShareGrantRepository, PublicProductShareTuple } from "./public-product-share-grant-repository.port";
import type { SpecificationDefinition, SpecificationTemplate } from "../../reference-data/domain/catalog-reference-data";
import type { ProductSpecificationValue } from "../../types/product-specification-value.value-object";

export interface PublicProductShareResourceState {
  readonly productName: string | null;
  readonly productLifecycle: "Draft" | "Published" | "Archived";
  readonly branchStatus: "Active" | "Inactive";
  readonly listed: boolean;
  readonly workspaceRetail: { readonly amountMinor: bigint; readonly currency: string } | null;
  readonly branchRetail: { readonly amountMinor: bigint; readonly currency: string } | null;
  readonly template: SpecificationTemplate | null;
  readonly definitions: readonly SpecificationDefinition[];
  readonly specificationValues: readonly ProductSpecificationValue[];
}
export interface PublicProductShareResourcePort {
  lockProductParent(workspaceId: string, productId: string): Promise<boolean>;
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
