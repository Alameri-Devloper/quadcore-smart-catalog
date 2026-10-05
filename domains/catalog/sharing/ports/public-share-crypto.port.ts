import type { PublicShareBearerEnvelope, PublicShareLookupDigestValue } from "../domain/public-share-values";
export type { PublicShareBearerEnvelope, PublicShareLookupDigestValue } from "../domain/public-share-values";

export type PublicShareCryptoFailure = "KeyUnavailable" | "IntegrityFailure" | "CryptoUnavailable";
export type PublicShareCryptoResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PublicShareCryptoFailure };
export interface PublicShareBearerContext {
  readonly workspaceId: string;
  readonly grantId: string;
  readonly productId: string;
  readonly branchId: string;
}
export interface PublicShareTokenGeneratorPort { generate(): PublicShareCryptoResult<string> }
export interface PublicShareLookupDigestPort {
  create(token: string): PublicShareCryptoResult<PublicShareLookupDigestValue>;
  candidates(token: string): PublicShareCryptoResult<readonly PublicShareLookupDigestValue[]>;
  verify(token: string, digest: PublicShareLookupDigestValue): PublicShareCryptoResult<boolean>;
}
export interface PublicShareBearerProtectionPort {
  encrypt(token: string, context: PublicShareBearerContext): PublicShareCryptoResult<PublicShareBearerEnvelope>;
  decrypt(envelope: PublicShareBearerEnvelope, context: PublicShareBearerContext,
    digest: PublicShareLookupDigestValue): PublicShareCryptoResult<string>;
}
