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
}
