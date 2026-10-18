import { and, eq, isNull, sql } from "drizzle-orm";
import { catalogPublicProductShareGrants as grants } from "../../../infrastructure/persistence/schema";
import { PublicProductShareGrant, type PublicProductShareGrantState } from "../../domain/public-product-share-grant";
import { validatePublicShareLookupDigest, validatePublicSharePositiveVersion, type PublicShareLookupDigestValue } from "../../domain/public-share-values";
import type { PublicProductShareGrantRepository, PublicProductShareInsertResult, PublicProductShareRevocationState, PublicProductShareTuple } from "../../ports/public-product-share-grant-repository.port";
import { PublicSharePersistenceFailure } from "../../ports/public-share-persistence-failure";
import { exactPublicShareTimestamp, exactPublicShareVersion, publicShareDatabaseFailure, publicShareDriverError, publicShareIdentity, type PublicShareTransaction } from "./public-share-persistence";

type Row = Record<string, unknown>;
const lifecycleColumns = sql`workspace_id, grant_id, product_id, branch_id, issued_at::text AS issued_at, revoked_at::text AS revoked_at, revoked_by_actor_id, revision::text AS revision`;
const allColumns = sql`${lifecycleColumns}, issued_by_actor_id, lookup_key_version::text AS lookup_key_version, lookup_digest, envelope_format_version, encryption_key_version::text AS encryption_key_version, bearer_iv, bearer_ciphertext, bearer_auth_tag`;

export const mapPublicShareRevocationTarget = (row: Row): PublicProductShareRevocationState => {
  const grantId = publicShareIdentity(row.grant_id);
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(grantId)) throw new PublicSharePersistenceFailure("IntegrityFailure");
  const issuedAt = exactPublicShareTimestamp(row.issued_at);
  const revokedAt = row.revoked_at === null ? null : exactPublicShareTimestamp(row.revoked_at);
  const revokedByActorId = row.revoked_by_actor_id === null ? null : publicShareIdentity(row.revoked_by_actor_id);
  if ((revokedAt === null) !== (revokedByActorId === null) || (revokedAt && revokedAt < issuedAt)) throw new PublicSharePersistenceFailure("IntegrityFailure");
  return Object.freeze({ workspaceId: publicShareIdentity(row.workspace_id), grantId,
    productId: publicShareIdentity(row.product_id), branchId: publicShareIdentity(row.branch_id),
    issuedAt, revokedAt, revokedByActorId,
    revision: exactPublicShareVersion(row.revision) });
};

export const mapPublicShareGrant = (row: Row): PublicProductShareGrantState => {
  try {
    const target = mapPublicShareRevocationTarget(row);
    const envelopeKeys = [row.envelope_format_version, row.encryption_key_version, row.bearer_iv, row.bearer_ciphertext, row.bearer_auth_tag];
    if (target.revokedAt !== null && envelopeKeys.some((value) => value !== null)) throw new Error();
    if (target.revokedAt === null && envelopeKeys.some((value) => value === null || value === undefined)) throw new Error();
    if (target.revokedAt === null && row.envelope_format_version !== 1) throw new Error();
    return PublicProductShareGrant.rehydrate({ ...target, issuedByActorId: publicShareIdentity(row.issued_by_actor_id),
      lookupDigest: { keyVersion: exactPublicShareVersion(row.lookup_key_version), value: row.lookup_digest as string },
      bearerEnvelope: target.revokedAt === null ? { formatVersion: 1,
        keyVersion: exactPublicShareVersion(row.encryption_key_version), iv: row.bearer_iv as string,
        ciphertext: row.bearer_ciphertext as string, authTag: row.bearer_auth_tag as string } : null }).snapshot();
  } catch { throw new PublicSharePersistenceFailure("IntegrityFailure"); }
};

export const classifyPublicShareInsertConflict = (error: unknown): Exclude<PublicProductShareInsertResult, "Saved"> | null => {
  const driver = publicShareDriverError(error);
  if (driver?.code !== "23505") return null;
  switch (driver.constraint) {
    case "catalog_public_product_share_grants_active_uq": return "ActiveTupleConflict";
    case "catalog_public_product_share_grants_pk": return "GrantIdConflict";
    case "catalog_public_product_share_grants_digest_uq": return "LookupDigestConflict";
    default: return null;
  }
};

const protectedColumns = (state: PublicProductShareGrantState) => ({
  lookupKeyVersion: state.lookupDigest.keyVersion, lookupDigest: state.lookupDigest.value,
  envelopeFormatVersion: state.bearerEnvelope?.formatVersion ?? null,
  encryptionKeyVersion: state.bearerEnvelope?.keyVersion ?? null,
  bearerIv: state.bearerEnvelope?.iv ?? null, bearerCiphertext: state.bearerEnvelope?.ciphertext ?? null,
  bearerAuthTag: state.bearerEnvelope?.authTag ?? null,
  revokedAt: state.revokedAt?.toISOString() ?? null, revokedByActorId: state.revokedByActorId, revision: state.revision,
});

export class PostgreSqlPublicProductShareGrantRepository implements PublicProductShareGrantRepository {
  constructor(private readonly transaction: PublicShareTransaction) {}

  async findActive(tuple: PublicProductShareTuple): Promise<PublicProductShareGrantState | null> {
    const result = await this.transaction.execute<Row>(sql`SELECT ${allColumns} FROM catalog_public_product_share_grants
      WHERE workspace_id=${tuple.workspaceId} AND product_id=${tuple.productId} AND branch_id=${tuple.branchId} AND revoked_at IS NULL`).catch((error) => { throw publicShareDatabaseFailure(error); });
    if (result.rows.length > 1) throw new PublicSharePersistenceFailure("IntegrityFailure");
    return result.rows[0] ? mapPublicShareGrant(result.rows[0]) : null;
  }

  private async read(workspaceId: string, grantId: string, lock: boolean, revocationOnly: boolean): Promise<Row | null> {
    const result = await this.transaction.execute<Row>(sql`SELECT ${revocationOnly ? lifecycleColumns : allColumns}
      FROM catalog_public_product_share_grants WHERE workspace_id=${workspaceId} AND grant_id=${grantId} ${lock ? sql`FOR UPDATE` : sql``}`).catch((error) => { throw publicShareDatabaseFailure(error); });
    return result.rows[0] ?? null;
  }
  async findById(workspaceId: string, grantId: string) {
    const row = await this.read(workspaceId, grantId, false, false);
    return row ? mapPublicShareGrant(row) : null;
  }
  async lockById(workspaceId: string, grantId: string) {
    const row = await this.read(workspaceId, grantId, true, false);
    return row ? mapPublicShareGrant(row) : null;
  }
  async findRevocationById(workspaceId: string, grantId: string) {
    const row = await this.read(workspaceId, grantId, false, true);
    return row ? mapPublicShareRevocationTarget(row) : null;
  }
  async lockRevocationById(workspaceId: string, grantId: string) {
    const row = await this.read(workspaceId, grantId, true, true);
    return row ? mapPublicShareRevocationTarget(row) : null;
  }
  async findByDigestCandidates(candidates: readonly PublicShareLookupDigestValue[]) {
    if (!Array.isArray(candidates) || candidates.length > 8) throw new PublicSharePersistenceFailure('IntegrityFailure');
    if (!candidates.length) return { type: "NotFound" as const };
    const predicates = candidates.map((candidate) => {
      const digest = validatePublicShareLookupDigest(candidate);
      return sql`(lookup_key_version=${digest.keyVersion} AND lookup_digest=${digest.value})`;
    });
    const result = await this.transaction.execute<Row>(sql`SELECT ${allColumns} FROM catalog_public_product_share_grants WHERE ${sql.join(predicates, sql` OR `)}`).catch((error) => { throw publicShareDatabaseFailure(error); });
    if (!result.rows.length) return { type: "NotFound" as const };
    if (result.rows.length !== 1) return { type: "IntegrityFailure" as const };
    try { return { type: "Found" as const, grant: mapPublicShareGrant(result.rows[0]) }; }
    catch { return { type: "IntegrityFailure" as const }; }
  }

  async insert(input: PublicProductShareGrantState): Promise<PublicProductShareInsertResult> {
    const state = PublicProductShareGrant.rehydrate(input).snapshot();
    try {
      // Nested Drizzle transaction rolls back its insert savepoint before classification.
      await this.transaction.transaction(async (savepoint) => {
        await savepoint.insert(grants).values({ workspaceId: state.workspaceId, grantId: state.grantId,
          productId: state.productId, branchId: state.branchId, issuedByActorId: state.issuedByActorId,
          issuedAt: state.issuedAt.toISOString(), ...protectedColumns(state) });
      });
      return "Saved";
    } catch (error) {
      const conflict = classifyPublicShareInsertConflict(error);
      if (conflict) return conflict;
      throw publicShareDatabaseFailure(error);
    }
  }

  async save(input: PublicProductShareGrantState, expectedRevision: number) {
    const state = PublicProductShareGrant.rehydrate(input).snapshot();
    validatePublicSharePositiveVersion(expectedRevision);
    if (expectedRevision === Number.MAX_SAFE_INTEGER || state.revision !== expectedRevision + 1) throw new PublicSharePersistenceFailure("IntegrityFailure");
    const result = await this.transaction.update(grants).set(protectedColumns(state)).where(and(
      eq(grants.workspaceId, state.workspaceId), eq(grants.grantId, state.grantId),
      eq(grants.productId, state.productId), eq(grants.branchId, state.branchId),
      eq(grants.issuedByActorId, state.issuedByActorId), eq(grants.issuedAt, state.issuedAt.toISOString()),
      eq(grants.revision, expectedRevision), isNull(grants.revokedAt))).returning({ grantId: grants.grantId }).catch((error) => { throw publicShareDatabaseFailure(error); });
    return result.length === 1 ? "Saved" as const : "ExpectedRevisionConflict" as const;
  }

  async revokeForExpectedRevision(input: Parameters<PublicProductShareGrantRepository['revokeForExpectedRevision']>[0]) {
    publicShareIdentity(input.revokedByActorId);
    validatePublicSharePositiveVersion(input.expectedRevision);
    if (input.expectedRevision === Number.MAX_SAFE_INTEGER
      || !(input.revokedAt instanceof Date) || !Number.isFinite(input.revokedAt.getTime())) throw new PublicSharePersistenceFailure("IntegrityFailure");
    const result = await this.transaction.update(grants).set({ revokedAt: input.revokedAt.toISOString(), revokedByActorId: input.revokedByActorId,
      envelopeFormatVersion: null, encryptionKeyVersion: null, bearerIv: null, bearerCiphertext: null,
      bearerAuthTag: null, revision: input.expectedRevision + 1 }).where(and(eq(grants.workspaceId, input.workspaceId),
      eq(grants.grantId, input.grantId), eq(grants.productId, input.productId), eq(grants.branchId, input.branchId),
      eq(grants.revision, input.expectedRevision), isNull(grants.revokedAt))).returning({ grantId: grants.grantId }).catch((error) => { throw publicShareDatabaseFailure(error); });
    return result.length === 1 ? "Saved" as const : "ExpectedRevisionConflict" as const;
  }
}
