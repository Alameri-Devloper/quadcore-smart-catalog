import type { Branch } from "../domain/branch";

export interface BranchRepository {
  find(workspaceId: string, branchId: string, forUpdate?: boolean): Promise<Branch | null>;
  list(workspaceId: string): Promise<readonly Branch[]>;
  create(branch: Branch): Promise<"Created" | "CodeConflict" | "IdConflict">;
  update(branch: Branch, expectedRevision: number): Promise<"Updated" | "NotFound" | "Conflict">;
}

export interface BranchAuditRepository {
  append(input: { readonly workspaceId: string; readonly actorId: string; readonly eventType: string; readonly branchId: string; readonly metadata: Readonly<Record<string, string | number | boolean | null>>; readonly occurredAt: Date }): Promise<void>;
}

export interface BranchTransactionContext { readonly branches: BranchRepository; readonly audit: BranchAuditRepository }
export interface BranchUnitOfWork { execute<T>(work: (context: BranchTransactionContext) => Promise<T>): Promise<T> }
export interface BranchClock { now(): Date }
export interface BranchIdentifierGenerator { next(): string }
