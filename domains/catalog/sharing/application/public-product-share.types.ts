import type { SpecificationValueType } from "../../reference-data/domain/catalog-reference-data";
import type { SpecificationValue } from "../../types/specification-value.entity";

// Internal projection handoff only, not an anonymous DTO or a second specification model.
export type PublicProductShareSemanticValue = {
  readonly [T in SpecificationValueType]: {
    readonly valueType: T;
    readonly value: Extract<SpecificationValue, T extends "Text" ? string : T extends "Number" ? number : boolean>;
  }
}[SpecificationValueType];
export type PublicProductShareSpecificationHandoff = PublicProductShareSemanticValue & {
  readonly label: string;
  readonly unit?: string;
};

export type PublicProductShareError =
  | "AuthenticationRequired" | "ForbiddenForRestrictedSession" | "PermissionDenied" | "BranchScopeDenied"
  | "NotFound" | "NoActiveGrant" | "IssueIneligible" | "ReplacementIneligible"
  | "ExpectedCurrentGrantConflict" | "KeyUnavailable" | "IntegrityFailure" | "ServiceUnavailable";
export type PublicProductShareResult<T> =
  | { readonly ok: true; readonly value: T }
  | { readonly ok: false; readonly error: PublicProductShareError };
