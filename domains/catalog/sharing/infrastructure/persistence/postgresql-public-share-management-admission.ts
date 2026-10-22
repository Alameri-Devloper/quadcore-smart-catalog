import { sql } from 'drizzle-orm';
import type { PlatformDatabase } from '../../../../../shared/infrastructure/persistence/database';
import type {
  PublicShareManagementAdmissionPort,
  PublicShareManagementAdmissionPolicy,
  PublicShareManagementAdmissionResult,
  PublicShareManagementOperation,
} from '../../ports/public-share-management-admission.port';

class AdmissionDenied extends Error {
  constructor(readonly retryAfterSeconds: number) { super('AdmissionDenied'); }
}

/** Shared admission uses its own short transaction, never the grant Unit of Work. */
export class PostgreSqlPublicShareManagementAdmission implements PublicShareManagementAdmissionPort {
  constructor(private readonly database: PlatformDatabase, private readonly policy: PublicShareManagementAdmissionPolicy) {}

  async admit(input: { readonly workspaceId: string; readonly actorId: string; readonly operation: PublicShareManagementOperation }): Promise<PublicShareManagementAdmissionResult> {
    try {
      const budget = this.policy.budgets[input.operation];
      if (!budget || !input.workspaceId.trim() || !input.actorId.trim()) return { type: 'Unavailable' };
      await this.database.transaction(async (transaction) => {
        await transaction.execute(sql`SELECT set_config('lock_timeout', ${`${this.policy.lockTimeoutMs}ms`}, true),
          set_config('statement_timeout', ${`${this.policy.statementTimeoutMs}ms`}, true)`);
        // Insert and lock in one consistent order, including concurrent first use.
        for (const [scope, subject] of [['Workspace', input.workspaceId], ['User', input.actorId]] as const) {
          await transaction.execute(sql`INSERT INTO catalog_public_share_management_admission
            (workspace_id, operation, scope_kind, subject_id, window_started_at, used_count, expires_at)
            VALUES (${input.workspaceId}, ${input.operation}, ${scope}, ${subject}, clock_timestamp(), 0,
              clock_timestamp() + (${this.policy.windowSeconds + this.policy.cleanupGraceSeconds} * interval '1 second'))
            ON CONFLICT (workspace_id, operation, scope_kind, subject_id) DO NOTHING`);
          await transaction.execute(sql`SELECT subject_id FROM catalog_public_share_management_admission
            WHERE workspace_id=${input.workspaceId} AND operation=${input.operation}
              AND scope_kind=${scope} AND subject_id=${subject} FOR UPDATE`);
        }
        // A single database timestamp is sampled only after both locks are acquired.
        const result = await transaction.execute(sql`WITH observed AS MATERIALIZED (SELECT clock_timestamp() AS now), evaluated AS (
          SELECT counter.scope_kind, counter.used_count,
            CASE WHEN counter.used_count = 0 OR observed.now >= counter.window_started_at + (${this.policy.windowSeconds} * interval '1 second')
              THEN 0 ELSE counter.used_count END AS effective_count,
            CASE WHEN counter.used_count = 0 OR observed.now >= counter.window_started_at + (${this.policy.windowSeconds} * interval '1 second')
              THEN observed.now ELSE counter.window_started_at END AS effective_start,
            observed.now
          FROM catalog_public_share_management_admission AS counter CROSS JOIN observed
          WHERE counter.workspace_id=${input.workspaceId} AND counter.operation=${input.operation}
            AND ((counter.scope_kind='Workspace' AND counter.subject_id=${input.workspaceId})
              OR (counter.scope_kind='User' AND counter.subject_id=${input.actorId}))
        ) SELECT scope_kind, effective_count::text, effective_start::text,
          LEAST(60, GREATEST(1, ceil(extract(epoch FROM
            (effective_start + (${this.policy.windowSeconds} * interval '1 second') - now)))))::int AS retry_seconds
          FROM evaluated`);
        if (result.rows.length !== 2) throw new Error('AdmissionCounterInvariant');
        let retryAfterSeconds = 0;
        for (const row of result.rows) {
          const count = Number(row.effective_count);
          if (!Number.isSafeInteger(count) || count < 0) throw new Error('AdmissionCounterInvariant');
          const limit = row.scope_kind === 'Workspace' ? budget.workspace : budget.user;
          if (count >= limit) retryAfterSeconds = Math.max(retryAfterSeconds, Number(row.retry_seconds));
        }
        if (retryAfterSeconds) throw new AdmissionDenied(Math.min(60, Math.max(1, Math.ceil(retryAfterSeconds))));
        for (const row of result.rows) {
          await transaction.execute(sql`UPDATE catalog_public_share_management_admission
            SET used_count=${Number(row.effective_count) + 1}, window_started_at=${row.effective_start as string}::timestamptz,
              expires_at=${row.effective_start as string}::timestamptz + (${this.policy.windowSeconds + this.policy.cleanupGraceSeconds} * interval '1 second')
            WHERE workspace_id=${input.workspaceId} AND operation=${input.operation} AND scope_kind=${row.scope_kind as string}
              AND subject_id=${row.scope_kind === 'Workspace' ? input.workspaceId : input.actorId}`);
        }
      });
      // A rejected/uncertain COMMIT must never return Allowed, nor be retried here.
      return { type: 'Allowed' };
    } catch (error) {
      return error instanceof AdmissionDenied
        ? { type: 'Denied', retryAfterSeconds: error.retryAfterSeconds }
        : { type: 'Unavailable' };
    }
  }

  async cleanup(limit = 1000): Promise<number> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 1000) throw new Error('InvalidAdmissionCleanupLimit');
    return this.database.transaction(async (transaction) => {
      await transaction.execute(sql`SELECT set_config('lock_timeout', ${`${this.policy.lockTimeoutMs}ms`}, true),
        set_config('statement_timeout', ${`${this.policy.statementTimeoutMs}ms`}, true)`);
      const result = await transaction.execute(sql`WITH expired AS MATERIALIZED (
        SELECT workspace_id,operation,scope_kind,subject_id FROM catalog_public_share_management_admission
        WHERE expires_at <= clock_timestamp() ORDER BY expires_at
        LIMIT ${limit} FOR UPDATE SKIP LOCKED
      ) DELETE FROM catalog_public_share_management_admission AS counter USING expired
        WHERE counter.workspace_id=expired.workspace_id AND counter.operation=expired.operation
          AND counter.scope_kind=expired.scope_kind AND counter.subject_id=expired.subject_id
        RETURNING counter.subject_id`);
      return result.rows.length;
    });
  }
}
