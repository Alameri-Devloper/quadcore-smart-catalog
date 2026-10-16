import { sql } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import type { PublicShareKeyVersionInspectionPort, PublicShareKeyVersionInspectionResult } from "../../ports/public-share-key-version-inspector.port";
import { exactPublicShareVersion } from "./public-share-persistence";

export class PostgreSqlPublicShareKeyVersionInspector implements PublicShareKeyVersionInspectionPort {
  constructor(private readonly database: PlatformDatabase) {}
  async inspect(): Promise<PublicShareKeyVersionInspectionResult> {
    let result;
    try {
      result = await this.database.execute<{ lookup_versions: unknown; encryption_versions: unknown; inspected_at: unknown; invalid_active: unknown }>(sql`
        WITH active AS (SELECT lookup_key_version,encryption_key_version,envelope_format_version,bearer_iv,bearer_ciphertext,bearer_auth_tag,lookup_digest,revoked_by_actor_id
          FROM catalog_public_product_share_grants WHERE revoked_at IS NULL)
        SELECT ARRAY(SELECT DISTINCT lookup_key_version::text FROM active) AS lookup_versions,
          ARRAY(SELECT DISTINCT encryption_key_version::text FROM active) AS encryption_versions,
          statement_timestamp()::text AS inspected_at,
          EXISTS(SELECT 1 FROM active WHERE (
            lookup_key_version BETWEEN 1 AND 9007199254740991
            AND encryption_key_version BETWEEN 1 AND 9007199254740991
            AND envelope_format_version=1 AND revoked_by_actor_id IS NULL
            AND lookup_digest ~ '^[a-f0-9]{64}$'
            AND bearer_iv ~ '^[A-Za-z0-9_-]{16}$'
            AND bearer_ciphertext ~ '^[A-Za-z0-9_-]{57}[AQgw]$'
            AND bearer_auth_tag ~ '^[A-Za-z0-9_-]{21}[AQgw]$'
          ) IS NOT TRUE) AS invalid_active`);
    } catch { return { type: "Unavailable" }; }
    try {
      const row = result.rows[0];
      if (result.rows.length !== 1 || !row || row.invalid_active !== false || !Array.isArray(row.lookup_versions) || !Array.isArray(row.encryption_versions)
        || typeof row.inspected_at !== 'string') throw new Error();
      // Evidence time retains database statement semantics; lifecycle precision is a separate P4 invariant.
      const inspectedAt = new Date(row.inspected_at);
      if (!Number.isFinite(inspectedAt.getTime())) throw new Error();
      return { type: "Inspected", evidence: Object.freeze({
        lookupVersions: Object.freeze([...new Set(row.lookup_versions.map(exactPublicShareVersion))].sort((a,b) => a-b)),
        encryptionVersions: Object.freeze([...new Set(row.encryption_versions.map(exactPublicShareVersion))].sort((a,b) => a-b)),
        inspectedAt, source: "PostgreSqlPublicProductShareGrants", scope: "ServiceWide", consistency: "StatementSnapshot",
      }) };
    } catch { return { type: "IntegrityFailure" }; }
  }
}
