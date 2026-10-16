export interface PublicSharePersistedKeyVersionEvidence {
  readonly lookupVersions: readonly number[];
  readonly encryptionVersions: readonly number[];
  readonly inspectedAt: Date;
  readonly source: "PostgreSqlPublicProductShareGrants";
  readonly scope: "ServiceWide";
  readonly consistency: "StatementSnapshot";
}
export type PublicShareKeyVersionInspectionResult =
  | { readonly type: "Inspected"; readonly evidence: PublicSharePersistedKeyVersionEvidence }
  | { readonly type: "Unavailable" | "IntegrityFailure" };

// Service-wide referenced versions, from one durable statement snapshot.
export interface PublicShareKeyVersionInspectionPort {
  inspect(): Promise<PublicShareKeyVersionInspectionResult>;
}
