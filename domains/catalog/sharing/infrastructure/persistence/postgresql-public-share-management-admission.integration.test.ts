import assert from 'node:assert/strict';
import { after, before, beforeEach, it } from 'node:test';
import { sql } from 'drizzle-orm';
import type { PlatformDatabase } from '../../../../../shared/infrastructure/persistence/database';
import type { PublicShareManagementAdmissionPolicy, PublicShareManagementOperation } from '../../ports/public-share-management-admission.port';
import { publicSharePostgresFixture } from '../../mock/public-share-postgres.fixture';
import { PostgreSqlPublicShareManagementAdmission } from './postgresql-public-share-management-admission';
import { publicShareDriverError } from './public-share-persistence';

const policy: PublicShareManagementAdmissionPolicy = {
  windowSeconds: 60, cleanupGraceSeconds: 900, lockTimeoutMs: 250, statementTimeoutMs: 1000,
  budgets: { Issue: { user: 20, workspace: 120 }, Copy: { user: 60, workspace: 600 }, Replace: { user: 5, workspace: 30 }, Revoke: { user: 60, workspace: 600 } },
};
const a = publicSharePostgresFixture('p5-admission-a'), b = publicSharePostgresFixture('p5-admission-b'), observer = publicSharePostgresFixture('p5-admission-observer');
before(a.migrate); beforeEach(a.seed);
after(async () => { await Promise.all([a.connection.close(), b.connection.close(), observer.connection.close()]); });
const adapter = (database = a.connection.database) => new PostgreSqlPublicShareManagementAdmission(database, policy);
const input = (operation: PublicShareManagementOperation = 'Issue', actorId = 'p5-actor', workspaceId = 'p4-workspace') => ({ workspaceId, actorId, operation });
const counts = async () => (await observer.execute(sql`SELECT workspace_id,operation,scope_kind,subject_id,used_count::int AS used_count,window_started_at::text,expires_at::text FROM catalog_public_share_management_admission ORDER BY workspace_id,operation,scope_kind,subject_id`)).rows;
const denied = (result: Awaited<ReturnType<ReturnType<typeof adapter>['admit']>>) => {
  assert.equal(result.type, 'Denied');
  if (result.type !== 'Denied') throw new Error('ExpectedAdmissionDenied');
  assert.ok(Number.isInteger(result.retryAfterSeconds) && result.retryAfterSeconds >= 1 && result.retryAfterSeconds <= 60);
};
const barrier = () => { let release!: () => void; const reached = new Promise<void>((resolve) => { release = resolve; }); return { reached, release }; };
const holdWorkspace = async (work: () => Promise<void>) => {
  const locked = barrier(), release = barrier();
  const transaction = observer.connection.database.transaction(async (tx) => {
    await tx.execute(sql`SELECT 1 FROM catalog_public_share_management_admission WHERE scope_kind='Workspace' FOR UPDATE`);
    locked.release(); await release.reached;
  });
  await locked.reached;
  try { await work(); } finally { release.release(); await transaction; }
};
const observeBlocked = async (expected = 1) => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const row = (await observer.execute(sql`SELECT count(*)::int AS blocked FROM pg_stat_activity WHERE application_name IN ('p5-admission-a','p5-admission-b') AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid)) > 0`)).rows[0];
    if (Number(row.blocked) >= expected) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('ExpectedObservedAdmissionBlocking');
};

for (const operation of ['Issue', 'Copy', 'Replace', 'Revoke'] as const) {
  it(`${operation}: exact approved user N allowed and N+1 denied without partial charge`, async () => {
    const limiter = adapter();
    for (let index = 0; index < policy.budgets[operation].user; index++) assert.deepEqual(await limiter.admit(input(operation)), { type: 'Allowed' });
    const before = await counts(); denied(await limiter.admit(input(operation))); assert.deepEqual(await counts(), before);
    assert.deepEqual(before.map((row) => row.used_count), [policy.budgets[operation].user, policy.budgets[operation].user]);
  });
  it(`${operation}: exact Workspace final slot and N+1 across users`, async () => {
    assert.deepEqual(await adapter().admit(input(operation)), { type: 'Allowed' });
    await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=${policy.budgets[operation].workspace - 1} WHERE scope_kind='Workspace'`);
    assert.deepEqual(await adapter().admit(input(operation, 'second-actor')), { type: 'Allowed' });
    const before = await counts(); denied(await adapter().admit(input(operation, 'third-actor'))); assert.deepEqual(await counts(), before);
    assert.equal(before.find((row) => row.scope_kind === 'Workspace')?.used_count, policy.budgets[operation].workspace);
  });
}
it('exhausted Issue, Copy and Replace leave independent Revoke available', async () => {
  for (const operation of ['Issue', 'Copy', 'Replace'] as const) {
    await adapter().admit(input(operation));
    await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=${policy.budgets[operation].workspace} WHERE operation=${operation} AND scope_kind='Workspace'`);
    denied(await adapter().admit(input(operation)));
  }
  assert.deepEqual(await adapter().admit(input('Revoke')), { type: 'Allowed' });
  assert.equal((await counts()).filter((row) => row.operation === 'Revoke').length, 2);
});
it('actor and Workspace isolation use stable trusted keys, not adapter/session identity', async () => {
  await adapter().admit(input());
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=20 WHERE scope_kind='User'`);
  denied(await adapter(b.connection.database).admit(input()));
  assert.deepEqual(await adapter(b.connection.database).admit(input('Issue', 'other-actor')), { type: 'Allowed' });
  assert.deepEqual(await adapter().admit(input('Issue', 'p5-actor', 'p4-foreign')), { type: 'Allowed' });
  assert.equal((await counts()).length, 5);
});
it('concurrent first-row creation across two connections/adapters has no lost updates', async () => {
  const ready = barrier(); let arrivals = 0;
  const synchronized = (database: PlatformDatabase) => ({ transaction: (work: Parameters<PlatformDatabase['transaction']>[0]) => database.transaction(async (tx) => {
    if (++arrivals === 2) ready.release(); await ready.reached; return work(tx);
  }) }) as unknown as PlatformDatabase;
  const results = await Promise.all([adapter(synchronized(a.connection.database)).admit(input()), adapter(synchronized(b.connection.database)).admit(input())]);
  assert.deepEqual(results, [{ type: 'Allowed' }, { type: 'Allowed' }]);
  assert.deepEqual((await counts()).map((row) => row.used_count), [2, 2]);
});
for (const exhaustedScope of ['User', 'Workspace'] as const) it(`observed blocking final-slot race enforces ${exhaustedScope} ceiling atomically`, async () => {
  await adapter().admit(input());
  const budget = exhaustedScope === 'User' ? policy.budgets.Issue.user : policy.budgets.Issue.workspace;
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=${budget - 1} WHERE scope_kind=${exhaustedScope}`);
  const release = barrier(), locked = barrier();
  const holding = observer.connection.database.transaction(async (tx) => {
    await tx.execute(sql`SELECT 1 FROM catalog_public_share_management_admission WHERE scope_kind='Workspace' FOR UPDATE`); locked.release(); await release.reached;
  });
  await locked.reached;
  const first = adapter().admit(input());
  const second = adapter(b.connection.database).admit(input('Issue', exhaustedScope === 'Workspace' ? 'second-actor' : 'p5-actor'));
  try { await observeBlocked(2); } finally { release.release(); await holding; }
  const results = await Promise.all([first, second]);
  assert.equal(results.filter((result) => result.type === 'Allowed').length, 1);
  denied(results.find((result) => result.type !== 'Allowed')!);
  assert.equal((await counts()).find((row) => row.scope_kind === exhaustedScope && row.subject_id === (exhaustedScope === 'Workspace' ? 'p4-workspace' : 'p5-actor'))?.used_count, budget);
});
it('zero-count placeholder windows start at post-lock admission time', async () => {
  await adapter().admit(input());
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=0,window_started_at=clock_timestamp()-interval '30 seconds',expires_at=clock_timestamp()+interval '930 seconds'`);
  const before = (await observer.execute(sql`SELECT clock_timestamp()::text AS now`)).rows[0].now as string;
  assert.deepEqual(await adapter().admit(input()), { type: 'Allowed' });
  for (const row of await counts()) assert.ok(new Date(row.window_started_at as string).getTime() >= new Date(before).getTime());
});
it('fixed windows retain counts before expiry and reset both after boundary', async () => {
  await adapter().admit(input());
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=20,window_started_at=clock_timestamp()-interval '59 seconds',expires_at=clock_timestamp()+interval '901 seconds' WHERE scope_kind='User'`);
  denied(await adapter().admit(input()));
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET window_started_at=clock_timestamp()-interval '60 seconds',expires_at=clock_timestamp()+interval '900 seconds'`);
  assert.deepEqual(await adapter().admit(input()), { type: 'Allowed' });
  assert.deepEqual((await counts()).map((row) => row.used_count), [1, 1]);
});
it('backward database time observation cannot reset quota early and Retry-After clamps to60', async () => {
  await adapter().admit(input());
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=20,window_started_at=clock_timestamp()+interval '60 seconds',expires_at=clock_timestamp()+interval '1020 seconds' WHERE scope_kind='User'`);
  const before = await counts(); assert.deepEqual(await adapter().admit(input()), { type: 'Denied', retryAfterSeconds: 60 }); assert.deepEqual(await counts(), before);
});
it('Retry-After chooses the longest exhausted budget wait and rounds upward', async () => {
  await adapter().admit(input());
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=CASE WHEN scope_kind='User' THEN 20 ELSE 120 END,
    window_started_at=clock_timestamp()-CASE WHEN scope_kind='User' THEN interval '30 seconds' ELSE interval '10 seconds' END,
    expires_at=clock_timestamp()+interval '960 seconds'`);
  const result = await adapter().admit(input()); denied(result);
  if (result.type === 'Denied') assert.ok(result.retryAfterSeconds >= 49 && result.retryAfterSeconds <= 50);
});
it('expired windows reset logically without cleanup, and grace protects recent rows', async () => {
  await adapter().admit(input());
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET window_started_at=clock_timestamp()-interval '61 seconds',expires_at=clock_timestamp()+interval '899 seconds',used_count=120`);
  assert.equal(await adapter().cleanup(), 0);
  assert.deepEqual(await adapter().admit(input()), { type: 'Allowed' }); assert.deepEqual((await counts()).map((row) => row.used_count), [1, 1]);
});
it('cleanup skips locked expired counter and never removes active counters', async () => {
  await adapter().admit(input());
  await a.execute(sql`UPDATE catalog_public_share_management_admission SET window_started_at=clock_timestamp()-interval '1000 seconds',expires_at=clock_timestamp()-interval '40 seconds'`);
  await holdWorkspace(async () => { assert.equal(await adapter().cleanup(), 1); assert.equal((await counts()).length, 1); });
  assert.equal(await adapter().cleanup(), 1);
  await adapter().admit(input()); assert.equal(await adapter().cleanup(), 0); assert.equal((await counts()).length, 2);
});
it('cleanup enforces at most1000 records and validates explicit bounds', async () => {
  await a.execute(sql`INSERT INTO catalog_public_share_management_admission(workspace_id,operation,scope_kind,subject_id,window_started_at,used_count,expires_at)
    SELECT 'p4-workspace','Issue','User','expired-'||n,clock_timestamp()-interval '1000 seconds',1,clock_timestamp()-interval '40 seconds' FROM generate_series(1,1001) AS n`);
  assert.equal(await adapter().cleanup(), 1000); assert.equal((await counts()).length, 1);
  assert.equal(await adapter().cleanup(1), 1);
  for (const limit of [0, 1001, 1.5]) await assert.rejects(adapter().cleanup(limit), /InvalidAdmissionCleanupLimit/);
});
it('lock timeout fails closed without partially charging the actor', async () => {
  await adapter().admit(input()); const before = await counts();
  let errorCode: unknown;
  const tracked = { transaction: async (work: Parameters<PlatformDatabase['transaction']>[0]) => {
    try { return await a.connection.database.transaction(work); } catch (error) { errorCode = publicShareDriverError(error)?.code; throw error; }
  } } as unknown as PlatformDatabase;
  await holdWorkspace(async () => { assert.deepEqual(await adapter(tracked).admit(input()), { type: 'Unavailable' }); });
  assert.equal(errorCode, '55P03');
  assert.deepEqual(await counts(), before);
});
it('missing table fails closed; transaction rollback restores schema', async () => {
  const wrapped = { transaction: (work: Parameters<PlatformDatabase['transaction']>[0]) => a.connection.database.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE catalog_public_share_management_admission RENAME TO synthetic_missing_admission`); return work(tx);
  }) } as unknown as PlatformDatabase;
  assert.deepEqual(await adapter(wrapped).admit(input()), { type: 'Unavailable' }); assert.deepEqual(await counts(), []);
});
it('read-only SQL permission failure fails closed with no charges', async () => {
  let restrictedRoleApplied = false;
  const wrapped = { transaction: (work: Parameters<PlatformDatabase['transaction']>[0]) => a.connection.database.transaction(async (tx) => {
    await tx.execute(sql`SET LOCAL ROLE pg_read_all_data`);
    assert.equal((await tx.execute(sql`SELECT current_user AS role`)).rows[0].role, 'pg_read_all_data');
    restrictedRoleApplied = true;
    return work(tx);
  }) } as unknown as PlatformDatabase;
  assert.deepEqual(await adapter(wrapped).admit(input()), { type: 'Unavailable' }); assert.deepEqual(await counts(), []);
  assert.equal(restrictedRoleApplied, true);
});
it('real PostgreSQL statement timeout rolls back, returning unavailable', async () => {
  let timeoutCode: unknown;
  const wrapped = { transaction: (work: Parameters<PlatformDatabase['transaction']>[0]) => a.connection.database.transaction(async (tx) => {
    let statements = 0;
    return work({ execute: async (query: Parameters<typeof tx.execute>[0]) => {
      const result = await tx.execute(query);
      if (++statements === 1) {
        try { await tx.execute(sql`SELECT pg_sleep(1.1)`); } catch (error) { timeoutCode = publicShareDriverError(error)?.code; throw error; }
      }
      return result;
    } } as typeof tx);
  }) } as unknown as PlatformDatabase;
  assert.deepEqual(await adapter(wrapped).admit(input()), { type: 'Unavailable' }); assert.deepEqual(await counts(), []);
  assert.equal(timeoutCode, '57014');
});
it('injected uncertain commit after real commit never retries or returns Allowed', async () => {
  let transactions = 0;
  const wrapped = { transaction: async (work: Parameters<PlatformDatabase['transaction']>[0]) => {
    transactions++; await a.connection.database.transaction(work); throw new Error('SyntheticLostCommitAcknowledgement');
  } } as unknown as PlatformDatabase;
  assert.deepEqual(await adapter(wrapped).admit(input()), { type: 'Unavailable' });
  assert.equal(transactions, 1); assert.deepEqual((await counts()).map((row) => row.used_count), [1, 1]);
});
it('new adapter instance preserves persisted quota across application replacement', async () => {
  await adapter().admit(input()); await a.execute(sql`UPDATE catalog_public_share_management_admission SET used_count=20 WHERE scope_kind='User'`);
  denied(await adapter(b.connection.database).admit(input()));
});
it('admission rows contain only approved accounting fields, never URL/token evidence', async () => {
  await adapter().admit(input());
  const fields = (await a.execute(sql`SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name='catalog_public_share_management_admission' ORDER BY ordinal_position`)).rows.map((row) => row.column_name);
  assert.deepEqual(fields, ['workspace_id','operation','scope_kind','subject_id','window_started_at','used_count','expires_at']);
});


it('actual lock barrier samples database time after both locks for first admitted windows', async () => {
  const locked = barrier(), proceed = barrier();
  const wrapped = { transaction: (work: Parameters<PlatformDatabase['transaction']>[0]) => a.connection.database.transaction(async (tx) => {
    let statements = 0;
    return work({ execute: async (query: Parameters<typeof tx.execute>[0]) => {
      const result = await tx.execute(query);
      if (++statements === 5) { locked.release(); await proceed.reached; }
      return result;
    } } as typeof tx);
  }) } as unknown as PlatformDatabase;
  const admission = adapter(wrapped).admit(input()); await locked.reached;
  const observed = (await observer.execute(sql`SELECT clock_timestamp()::text AS now`)).rows[0].now as string;
  proceed.release(); assert.deepEqual(await admission, { type: 'Allowed' });
  for (const row of await counts()) assert.ok(new Date(row.window_started_at as string).getTime() >= new Date(observed).getTime());
});
it('counter constraints reject invalid scopes, operations, unsafe counts and premature expiry', async () => {
  await adapter().admit(input());
  for (const statement of [
    sql`UPDATE catalog_public_share_management_admission SET operation='AnonymousPage'`,
    sql`UPDATE catalog_public_share_management_admission SET scope_kind='Session'`,
    sql`UPDATE catalog_public_share_management_admission SET subject_id='foreign' WHERE scope_kind='Workspace'`,
    sql`UPDATE catalog_public_share_management_admission SET used_count=-1`,
    sql`UPDATE catalog_public_share_management_admission SET used_count=9007199254740992`,
    sql`UPDATE catalog_public_share_management_admission SET expires_at=window_started_at+interval '60 seconds'`,
    sql`UPDATE catalog_public_share_management_admission SET window_started_at='infinity'::timestamptz`,
  ]) await assert.rejects(a.execute(statement));
  assert.deepEqual((await counts()).map((row) => row.used_count), [1, 1]);
});
