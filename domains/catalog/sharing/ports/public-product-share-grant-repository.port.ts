import type { PublicProductShareGrantState } from "../domain/public-product-share-grant";
import type { PublicShareLookupDigestValue } from "../domain/public-share-values";

export interface PublicProductShareTuple {
  readonly workspaceId: string;
  readonly productId: string;
  readonly branchId: string;
}
export type PublicProductShareInsertResult =
  | "Saved"
  | "ActiveTupleConflict"
  | "GrantIdConflict"
  | "LookupDigestConflict";
export type PublicProductShareSaveResult = "Saved" | "ExpectedRevisionConflict";
export type PublicProductShareLookupResult =
  | { readonly type: "Found"; readonly grant: PublicProductShareGrantState }
  | { readonly type: "NotFound" | "IntegrityFailure" };

// Invalidation only. Protected lookup/envelope material is deliberately absent.
export interface PublicProductShareRevocationState extends PublicProductShareTuple {
  readonly grantId: string;
  readonly issuedAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedByActorId: string | null;
  readonly revision: number;
}

// Bound to the UoW transaction; implementations never call other repositories.
export interface PublicProductShareGrantRepository {
  findActive(tuple: PublicProductShareTuple): Promise<PublicProductShareGrantState | null>;
  findById(workspaceId: string, grantId: string): Promise<PublicProductShareGrantState | null>;
  lockById(workspaceId: string, grantId: string): Promise<PublicProductShareGrantState | null>;
  // Internal anonymous lookup resolves scope; no caller-supplied tenant authority.
  findByDigestCandidates(candidates: readonly PublicShareLookupDigestValue[]): Promise<PublicProductShareLookupResult>;
  // Semantic conflicts only; arbitrary infrastructure errors are not retryable outcomes.
  insert(grant: PublicProductShareGrantState): Promise<PublicProductShareInsertResult>;
  save(grant: PublicProductShareGrantState, expectedRevision: number): Promise<PublicProductShareSaveResult>;
  findRevocationById(workspaceId: string, grantId: string): Promise<PublicProductShareRevocationState | null>;
  lockRevocationById(workspaceId: string, grantId: string): Promise<PublicProductShareRevocationState | null>;
  revokeForExpectedRevision(input: {
    readonly workspaceId: string; readonly grantId: string;
    readonly productId: string; readonly branchId: string;
    readonly expectedRevision: number;
    readonly revokedByActorId: string; readonly revokedAt: Date;
  }): Promise<PublicProductShareSaveResult>;
}
