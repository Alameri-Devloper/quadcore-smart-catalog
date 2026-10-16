import assert from 'node:assert/strict';
import { before, beforeEach, after, it } from 'node:test';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { publicSharePostgresFixture } from '../../mock/public-share-postgres.fixture';
import { publicShareActor } from '../../mock/public-share-lifecycle.fixture';
import { PostgreSqlPublicShareKeyVersionInspector } from './postgresql-public-share-key-version-inspector';
import { PostgreSqlPublicProductShareGrantRepository } from './postgresql-public-product-share-grant.repository';
import { PublicProductShareGrant } from '../../domain/public-product-share-grant';
import { PublicProductShareLifecycle, PUBLIC_SHARE_MANAGE_PERMISSION } from '../../application/public-product-share.use-cases';
import { createPublicShareCryptoRuntime, evaluatePublicShareKeyCoverage } from '../public-share-crypto-runtime';
import { publicShareDriverError } from './public-share-persistence';
import type { PublicProductShareUnitOfWork } from '../../ports/public-product-share-unit-of-work.port';
import type { PublicShareKeyVersionInspectionResult } from '../../ports/public-share-key-version-inspector.port';
import { catalogPublicProductShareGrants } from '../../../infrastructure/persistence/schema';

const f = publicSharePostgresFixture('p4-integration');
before(f.migrate); beforeEach(f.seed); after(() => f.connection.close());
const issued = async () => { const result = await f.lifecycle.issue(f.command); assert.equal(result.ok, true); if (!result.ok) throw new Error('ExpectedSyntheticIssueSuccess'); return result.value; };
const rejectionCode = async (work: () => Promise<unknown>) => {
  try { await work(); return 'NO_REJECTION'; } catch (error) { const code = publicShareDriverError(error)?.code; return typeof code === 'string' ? code : 'SAFE_FAILURE'; }
};
const transactionWith = (decorate: (context: Parameters<Parameters<PublicProductShareUnitOfWork['execute']>[0]>[0]) => Parameters<Parameters<PublicProductShareUnitOfWork['execute']>[0]>[0]): PublicProductShareUnitOfWork => ({ execute: (work) => f.unitOfWork.execute((ctx) => work(decorate(ctx))) });
const inspectionEvidence = (result: PublicShareKeyVersionInspectionResult, lookupVersions: readonly number[], encryptionVersions: readonly number[]) => {
  assert.equal(result.type, 'Inspected'); if (result.type !== 'Inspected') throw new Error('ExpectedInspection');
  assert.deepEqual(result.evidence.lookupVersions, lookupVersions); assert.deepEqual(result.evidence.encryptionVersions, encryptionVersions);
  assert.ok(Number.isFinite(result.evidence.inspectedAt.getTime()));
  assert.equal(result.evidence.source, 'PostgreSqlPublicProductShareGrants'); assert.equal(result.evidence.scope, 'ServiceWide'); assert.equal(result.evidence.consistency, 'StatementSnapshot');
  return result.evidence;
};

it('Deferred PostgreSQL COMMIT failure rolls back grant/audit and returns no URL', async () => {
  await f.execute(sql`CREATE FUNCTION p4_test_commit_failure() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'SyntheticDeferredFailure'; END $$;
    CREATE CONSTRAINT TRIGGER p4_test_commit_failure AFTER INSERT ON catalog_public_product_share_grants DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION p4_test_commit_failure()`);
  try { assert.deepEqual(await f.lifecycle.issue(f.command), { ok: false, error: 'ServiceUnavailable' });
    assert.deepEqual(await f.counts(), { total: 0, active: 0 }); assert.deepEqual(await f.auditTypes(), []); }
  finally { await f.execute(sql`DROP TRIGGER p4_test_commit_failure ON catalog_public_product_share_grants; DROP FUNCTION p4_test_commit_failure()`); }
});

it('F1 adversarial NaN history cannot block Copy/reuse or qualify as a public specification', async () => {
  let generations = 0, eligibilityReads = 0;
  const lifecycle = new PublicProductShareLifecycle(transactionWith((ctx) => ({ ...ctx, resources: new Proxy(ctx.resources, {
    get(target, key) {
      if (key === 'readCurrent') return async (...args: Parameters<typeof target.readCurrent>) => { eligibilityReads++; return target.readCurrent(...args); };
      const value = target[key as keyof typeof target]; return typeof value === 'function' ? value.bind(target) : value;
    },
  }) })), { now: () => new Date('2026-10-12T16:00:00Z') }, { next: randomUUID }, {
    ...f.runtime, tokenGenerator: { generate: () => { generations++; return f.runtime.tokenGenerator.generate(); } },
  });
  const first = await lifecycle.issue(f.command); assert.ok(first.ok);
  await f.execute(sql`INSERT INTO catalog_product_specification_values(workspace_id,product_id,specification_field_id,position,value_type,number_value)
    VALUES ('p4-workspace','p4-product','historical-internal',1,'number','NaN')`);
  for (const result of [await lifecycle.copy(f.command), await lifecycle.issue(f.command)]) {
    assert.ok(result.ok); assert.equal(result.value.url, first.value.url); assert.equal(result.value.grantId, first.value.grantId);
  }
  await f.execute(sql`UPDATE catalog_products SET lifecycle_state='Draft',retail_price_currency='ZZZ';
    UPDATE workspace_branch_references SET status='Inactive' WHERE workspace_id='p4-workspace';
    UPDATE catalog_specification_template_entries SET public_visibility='internal'`);
  for (const result of [await lifecycle.copy(f.command), await lifecycle.issue(f.command)]) {
    assert.ok(result.ok); assert.equal(result.value.url === first.value.url, true);
  }
  assert.deepEqual(await lifecycle.replace({ ...f.command, expectedCurrentGrantId: first.value.grantId }), { ok: false, error: 'ReplacementIneligible' });
  await f.execute(sql`UPDATE catalog_products SET lifecycle_state='Published',retail_price_currency='USD' WHERE workspace_id='p4-workspace';
    UPDATE workspace_branch_references SET status='Active' WHERE workspace_id='p4-workspace';
    UPDATE catalog_specification_template_entries SET public_visibility='public'`);
  assert.equal(generations, 1); assert.equal(eligibilityReads, 2);
  assert.deepEqual(await f.auditTypes(), ['PublicProductShareIssued']);
  const replacement = await lifecycle.replace({ ...f.command, expectedCurrentGrantId: first.value.grantId }); assert.ok(replacement.ok);
  assert.equal(eligibilityReads, 3);
  await f.execute(sql`UPDATE catalog_specification_template_entries SET public_visibility='internal'`);
  assert.deepEqual(await lifecycle.replace({ ...f.command, expectedCurrentGrantId: replacement.value.grantId }), { ok: false, error: 'ReplacementIneligible' });
  await lifecycle.revoke({ context: f.command.context, grantId: replacement.value.grantId });
  assert.deepEqual(await lifecycle.issue(f.command), { ok: false, error: 'IssueIneligible' });
  assert.equal(generations, 2);
});

it('F2 adversarial submillisecond issued timestamp must be rejected by PostgreSQL', async () => {
  await issued();
  assert.equal(await rejectionCode(() => f.connection.database.execute(sql`UPDATE catalog_public_product_share_grants SET issued_at='2026-10-12T15:00:00.123456Z'`)), '23514');
});

for (const timestamp of ['2026-10-12T15:00:00.123Z','2026-10-12T15:00:00.123000Z','2026-10-12T18:00:00.123+03:00']) it(`F2 supported PostgreSQL timestamp round-trips and Replace CAS succeeds: ${timestamp}`, async () => {
  const old = await issued();
  await f.execute(sql`UPDATE catalog_public_product_share_grants SET issued_at=${timestamp}::timestamptz`);
  const orm = await f.connection.database.select({ issuedAt: catalogPublicProductShareGrants.issuedAt }).from(catalogPublicProductShareGrants);
  assert.equal(typeof orm[0].issuedAt, 'string');
  await f.unitOfWork.execute(async (ctx) => {
    const grant = await ctx.grants.findById('p4-workspace', old.grantId); assert.ok(grant);
    assert.equal(grant.issuedAt.toISOString(), '2026-10-12T15:00:00.123Z'); return { type: 'Commit', value: true };
  });
  const replaced = await f.lifecycle.replace({ ...f.command, expectedCurrentGrantId: old.grantId }); assert.ok(replaced.ok);
  const copy = await f.lifecycle.copy(f.command); assert.ok(copy.ok); assert.equal(copy.value.url, replaced.value.url);
  assert.ok((await f.lifecycle.revoke({ context: f.command.context, grantId: replaced.value.grantId })).ok);
  assert.deepEqual(await f.counts(), { total: 2, active: 0 });
});

it('F2 PostgreSQL enforces nullable revocation precision and exact ordering, allowing equality', async () => {
  const old = await issued();
  await f.execute(sql`UPDATE catalog_public_product_share_grants SET issued_at='2026-10-12T15:00:00.123Z'`);
  for (const revokedAt of ['2026-10-12T15:00:00.123456Z','2026-10-12T15:00:00.122Z']) {
    assert.equal(await rejectionCode(() => f.connection.database.execute(sql`UPDATE catalog_public_product_share_grants SET revoked_at=${revokedAt}::timestamptz,revoked_by_actor_id='p4-actor',envelope_format_version=NULL,encryption_key_version=NULL,bearer_iv=NULL,bearer_ciphertext=NULL,bearer_auth_tag=NULL`)), '23514');
  }
  const equalClock = new PublicProductShareLifecycle(f.unitOfWork, { now: () => new Date('2026-10-12T15:00:00.123Z') }, { next: randomUUID }, f.runtime);
  assert.deepEqual(await equalClock.revoke({ context: f.command.context, grantId: old.grantId }), { ok: true, value: { outcome: 'Revoked', grantId: old.grantId } });
  await f.unitOfWork.execute(async (ctx) => {
    const grant = await ctx.grants.findById('p4-workspace', old.grantId); assert.ok(grant);
    assert.equal(grant.revokedAt?.getTime(), grant.issuedAt.getTime()); return { type: 'Commit', value: true };
  });
});

it('F2 controlled corrupt raw timestamps fail strict and revoke-only mapping before Date can lose precision', async () => {
  const old = await issued();
  await f.connection.database.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE catalog_public_product_share_grants DROP CONSTRAINT catalog_public_product_share_grants_timestamp_precision`);
    await tx.execute(sql`UPDATE catalog_public_product_share_grants SET issued_at='2026-10-12T15:00:00.123456Z'`);
    const repository = new PostgreSqlPublicProductShareGrantRepository(tx);
    await assert.rejects(() => repository.findById('p4-workspace', old.grantId), { message: 'IntegrityFailure' });
    await assert.rejects(() => repository.findRevocationById('p4-workspace', old.grantId), { message: 'IntegrityFailure' });
    await tx.execute(sql`ALTER TABLE catalog_public_product_share_grants DROP CONSTRAINT catalog_public_product_share_grants_revocation_timestamps`);
    await tx.execute(sql`UPDATE catalog_public_product_share_grants SET revoked_at='2026-10-12T15:00:00.123455Z',revoked_by_actor_id='p4-actor',envelope_format_version=NULL,encryption_key_version=NULL,bearer_iv=NULL,bearer_ciphertext=NULL,bearer_auth_tag=NULL`);
    await assert.rejects(() => repository.findRevocationById('p4-workspace', old.grantId), { message: 'IntegrityFailure' });
    tx.rollback();
  }).catch((error: unknown) => { if (!(error instanceof Error) || error.message !== 'Rollback') throw error; });
});

it('F1 nonfinite current public values are omitted and never fall back to internal values', async () => {
  await f.execute(sql`UPDATE catalog_specification_definitions SET value_type='Number';
    UPDATE catalog_product_specification_values SET value_type='number',text_value=NULL,number_value='NaN';
    INSERT INTO catalog_product_specification_values(workspace_id,product_id,specification_field_id,position,value_type,text_value) VALUES
      ('p4-workspace','p4-product','historical-internal',1,'string','Internal only')`);
  assert.deepEqual(await f.lifecycle.issue(f.command), { ok: false, error: 'IssueIneligible' });
  assert.deepEqual(await f.counts(), { total: 0, active: 0 }); assert.deepEqual(await f.auditTypes(), []);
});

it('F1 new Issue evaluates current public specs despite unrelated out-of-template NaN history', async () => {
  await f.execute(sql`INSERT INTO catalog_product_specification_values(workspace_id,product_id,specification_field_id,position,value_type,number_value)
    VALUES ('p4-workspace','p4-product','historical-internal',1,'number','NaN')`);
  await issued(); assert.deepEqual(await f.counts(), { total: 1, active: 1 });
  assert.deepEqual(await f.auditTypes(), ['PublicProductShareIssued']);
});

it('F6 all lifecycle events persist Succeeded with no Copy/reuse/repeated-revoke duplicates', async () => {
  const old = await issued(); await f.lifecycle.copy(f.command); await f.lifecycle.issue(f.command);
  const next = await f.lifecycle.replace({ ...f.command, expectedCurrentGrantId: old.grantId }); assert.ok(next.ok);
  await f.lifecycle.revoke({ context: f.command.context, grantId: next.value.grantId });
  await f.lifecycle.revoke({ context: f.command.context, grantId: next.value.grantId });
  const events = (await f.execute(sql`SELECT event_type,result_code,metadata FROM security_audit_events ORDER BY event_type`)).rows;
  assert.deepEqual(events.map(({ event_type, result_code }) => ({ event_type, result_code })),
    ['PublicProductShareIssued','PublicProductShareReplaced','PublicProductShareRevoked'].map(event_type => ({ event_type, result_code: 'Succeeded' })));
});

it('F3/F4 evidence arrays, integrity indicator and database statement time come from one PostgreSQL statement', async () => {
  await issued(); let statements = 0; let statementTime: unknown;
  const database = { execute: async (...args: Parameters<typeof f.connection.database.execute>) => {
    statements++; const result = await f.connection.database.execute(...args); statementTime = result.rows[0].inspected_at; return result;
  } } as unknown as typeof f.connection.database;
  const evidence = inspectionEvidence(await new PostgreSqlPublicShareKeyVersionInspector(database).inspect(), [1], [2]);
  assert.equal(statements, 1); assert.equal(typeof statementTime, 'string'); assert.equal(evidence.inspectedAt.getTime(), new Date(statementTime as string).getTime());
});

it('F3 adversarial incomplete active envelope fails the whole inspection', async () => {
  await issued();
  await f.connection.database.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE catalog_public_product_share_grants DROP CONSTRAINT catalog_public_product_share_grants_envelope_lifecycle`);
    await tx.execute(sql`UPDATE catalog_public_product_share_grants SET encryption_key_version=NULL,bearer_iv=NULL`);
    assert.deepEqual(await new PostgreSqlPublicShareKeyVersionInspector(tx as unknown as typeof f.connection.database).inspect(), { type: 'IntegrityFailure' });
    // Roll back controlled corruption and DDL even if an assertion fails.
    tx.rollback();
  }).catch((error: unknown) => { if (!(error instanceof Error) || error.message !== 'Rollback') throw error; });
});

for (const [label, mutation] of [
  ['missing encryption version', sql`UPDATE catalog_public_product_share_grants SET encryption_key_version=NULL`],
  ['missing ciphertext', sql`UPDATE catalog_public_product_share_grants SET bearer_ciphertext=NULL`],
  ['unsafe encryption version', sql`UPDATE catalog_public_product_share_grants SET encryption_key_version=9007199254740992`],
  ['malformed IV', sql`UPDATE catalog_public_product_share_grants SET bearer_iv='invalid'`],
  ['noncanonical tag', sql`UPDATE catalog_public_product_share_grants SET bearer_auth_tag=repeat('B',22)`],
  ['unsupported envelope format', sql`UPDATE catalog_public_product_share_grants SET envelope_format_version=2`],
] as const) it(`F3 inspection rejects active corruption: ${label}`, async () => {
  await issued();
  await f.connection.database.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE catalog_public_product_share_grants
      DROP CONSTRAINT catalog_public_product_share_grants_envelope_lifecycle,
      DROP CONSTRAINT catalog_public_product_share_grants_encryption_key_version_safe,
      DROP CONSTRAINT catalog_public_product_share_grants_envelope_encoding_shape,
      DROP CONSTRAINT catalog_public_product_share_grants_envelope_format_v1`);
    await tx.execute(mutation);
    assert.deepEqual(await new PostgreSqlPublicShareKeyVersionInspector(tx as unknown as typeof f.connection.database).inspect(), { type: 'IntegrityFailure' });
    tx.rollback();
  }).catch((error: unknown) => { if (!(error instanceof Error) || error.message !== 'Rollback') throw error; });
});

it('F3/F4 real database query failure is Unavailable without raw error leakage', async () => {
  await f.connection.database.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE catalog_public_product_share_grants RENAME TO p4_test_unavailable_grants`);
    const result = await new PostgreSqlPublicShareKeyVersionInspector(tx as unknown as typeof f.connection.database).inspect();
    assert.deepEqual(result, { type: 'Unavailable' });
    assert.equal(JSON.stringify(result).includes('p4_test_unavailable_grants'), false);
    tx.rollback();
  }).catch((error: unknown) => { if (!(error instanceof Error) || error.message !== 'Rollback') throw error; });
});

it('F1 omits a nonfinite current public candidate while retaining other qualifying current specs', async () => {
  await f.execute(sql`INSERT INTO catalog_specification_definitions(workspace_id,specification_definition_id,code,display_name,status,sort_order,version,created_at,updated_at,value_type,unit)
    VALUES ('p4-workspace','p4-number','p4-number','Number','Active',1,1,'2026-01-01','2026-01-01','Number',NULL);
    INSERT INTO catalog_specification_template_entries(workspace_id,specification_template_id,specification_definition_id,sort_order,required,public_visibility)
    VALUES ('p4-workspace','p4-template','p4-number',1,false,'public');
    INSERT INTO catalog_product_specification_values(workspace_id,product_id,specification_field_id,position,value_type,number_value)
    VALUES ('p4-workspace','p4-product','p4-number',1,'number','NaN')`);
  const result = await issued(); assert.equal((await f.counts()).active, 1);
  const replace = await f.lifecycle.replace({ ...f.command, expectedCurrentGrantId: result.grantId }); assert.ok(replace.ok);
});
it('Unknown real 23505 remains a sanitized failure and is not retried', async () => {
  await issued(); let insertAttempts = 0;
  await f.execute(sql`CREATE UNIQUE INDEX p4_test_unknown_uq ON catalog_public_product_share_grants(issued_by_actor_id)`);
  try {
    const lifecycle = f.lifecycleFor(transactionWith((ctx) => ({ ...ctx, grants: new Proxy(ctx.grants, { get(target, key) {
      if (key === 'insert') return async (...args: Parameters<typeof target.insert>) => { insertAttempts++; return target.insert(...args); };
      const value = target[key as keyof typeof target]; return typeof value === 'function' ? value.bind(target) : value;
    } }) })));
    assert.deepEqual(await lifecycle.issue({ ...f.command, branchId: 'p4-branch-2' }), { ok: false, error: 'ServiceUnavailable' });
    assert.equal(insertAttempts, 1); assert.deepEqual(await f.counts(), { total: 1, active: 1 });
  } finally { await f.execute(sql`DROP INDEX p4_test_unknown_uq`); }
});

it('Migration exposes 16 exact columns, BIGINT versions/revision and named required indexes', async () => {
  const columns = (await f.execute(sql`SELECT column_name,data_type FROM information_schema.columns WHERE table_name='catalog_public_product_share_grants'`)).rows;
  assert.equal(columns.length, 16);
  for (const name of ['lookup_key_version','encryption_key_version','revision']) assert.equal(columns.find((row) => row.column_name === name)?.data_type, 'bigint');
  const indexes = (await f.execute(sql`SELECT indexname,indexdef FROM pg_indexes WHERE tablename='catalog_public_product_share_grants'`)).rows;
  for (const suffix of ['pk','active_uq','digest_uq','lookup_idx','history_idx']) assert.equal(indexes.some((row) => row.indexname === `catalog_public_product_share_grants_${suffix}`), true);
  assert.equal(String(indexes.find((row) => row.indexname === 'catalog_public_product_share_grants_active_uq')?.indexdef).includes('revoked_at IS NULL'), true);
  const foreign = (await f.execute(sql`SELECT conname,confdeltype FROM pg_constraint WHERE conrelid='catalog_public_product_share_grants'::regclass AND contype='f'`)).rows;
  assert.equal(foreign.length, 3); assert.equal(foreign.every((row) => row.confdeltype === 'r'), true);
});
for (const column of ['lookup_key_version','encryption_key_version','revision']) {
  for (const value of ['2147483647','2147483648','9007199254740991']) it(`${column} accepts exact ${value}`, async () => {
    await issued(); await f.execute(sql`UPDATE catalog_public_product_share_grants SET ${sql.identifier(column)}=${value}::bigint`);
    await f.unitOfWork.execute(async (ctx) => { const grant = await ctx.grants.findActive({ workspaceId: 'p4-workspace', productId: 'p4-product', branchId: 'p4-branch' }); assert.ok(grant); return { type: 'Commit', value: true }; });
  });
  for (const value of ['0','-1','9007199254740992']) it(`${column} rejects ${value}`, async () => {
    await issued(); assert.equal(await rejectionCode(() => f.connection.database.execute(sql`UPDATE catalog_public_product_share_grants SET ${sql.identifier(column)}=${value}::bigint`)), '23514');
  });
}
for (const column of ['envelope_format_version','encryption_key_version','bearer_iv','bearer_ciphertext','bearer_auth_tag']) it(`Active envelope rejects partial NULL ${column}`, async () => {
  await issued(); assert.equal(await rejectionCode(() => f.connection.database.execute(sql`UPDATE catalog_public_product_share_grants SET ${sql.identifier(column)}=NULL`)), '23514');
});
for (const [name,query] of [
  ['digest',sql`UPDATE catalog_public_product_share_grants SET lookup_digest='NOT_LOWERCASE_HEX'`],
  ['IV',sql`UPDATE catalog_public_product_share_grants SET bearer_iv='short'`],
  ['format',sql`UPDATE catalog_public_product_share_grants SET envelope_format_version=2`],
  ['revocation pair',sql`UPDATE catalog_public_product_share_grants SET revoked_by_actor_id='actor'`],
  ['timestamp',sql`UPDATE catalog_public_product_share_grants SET revoked_at='2020-01-01',revoked_by_actor_id='actor',envelope_format_version=NULL,encryption_key_version=NULL,bearer_iv=NULL,bearer_ciphertext=NULL,bearer_auth_tag=NULL`],
  ['blank actor',sql`UPDATE catalog_public_product_share_grants SET issued_by_actor_id=' '`],
  ['UUID',sql`UPDATE catalog_public_product_share_grants SET grant_id='invalid'`],
] as const) it(`Schema rejects invalid ${name}`, async () => { await issued(); assert.equal(await rejectionCode(() => f.connection.database.execute(query)), '23514'); });

for (const [name,query] of [
  ['workspace',sql`UPDATE catalog_public_product_share_grants SET workspace_id='absent'`],
  ['foreign Product',sql`UPDATE catalog_public_product_share_grants SET product_id='p4-foreign-product'`],
  ['foreign Branch',sql`UPDATE catalog_public_product_share_grants SET branch_id='p4-foreign-branch'`],
] as const) it(`Tenant FK rejects ${name}`, async () => { await issued(); assert.equal(await rejectionCode(() => f.connection.database.execute(query)), '23503'); });

it('Issue commits protected grant and audit; plaintext and URL are absent from durable row/audit', async () => {
  const result = await issued(); const raw = (await f.execute(sql`SELECT * FROM catalog_public_product_share_grants`)).rows[0];
  const serialized = JSON.stringify(raw); const token = result.url.split('/').at(-1)!;
  assert.equal(serialized.includes(token), false); assert.equal(serialized.includes(result.url), false);
  const copied = await f.lifecycle.copy(f.command); assert.ok(copied.ok); assert.equal(copied.value.url === result.url, true);
  const audit = JSON.stringify((await f.execute(sql`SELECT metadata FROM security_audit_events`)).rows);
  for (const secret of [token,result.url,raw.lookup_digest,raw.bearer_iv,raw.bearer_ciphertext,raw.bearer_auth_tag]) assert.equal(audit.includes(String(secret)), false);
  assert.deepEqual(await f.counts(), { total: 1, active: 1 }); assert.deepEqual(await f.auditTypes(), ['PublicProductShareIssued']);
});
it('Cardinality is independent of eligibility, supports different Branch, and allows successor only after revoke', async () => {
  const old = await issued(); await f.execute(sql`UPDATE workspace_branch_references SET status='Inactive' WHERE workspace_id='p4-workspace' AND branch_id='p4-branch'`);
  const reused = await f.lifecycle.issue(f.command); assert.ok(reused.ok); assert.equal(reused.value.url === old.url, true);
  assert.equal((await f.lifecycle.issue({ ...f.command, branchId: 'p4-branch-2' })).ok, true); assert.equal((await f.counts()).active, 2);
  assert.equal((await f.lifecycle.revoke({ context: f.command.context, grantId: old.grantId })).ok, true);
  await f.execute(sql`UPDATE workspace_branch_references SET status='Active' WHERE workspace_id='p4-workspace' AND branch_id='p4-branch'`);
  const successor = await issued(); assert.equal(successor.grantId !== old.grantId, true); assert.equal((await f.counts()).active, 2);
});
it('Insert-local savepoint handles all three named collisions and keeps outer transaction usable', async () => {
  const original = await issued();
  await f.connection.database.transaction(async (tx) => {
    const repository = new PostgreSqlPublicProductShareGrantRepository(tx); const state = await repository.findById('p4-workspace', original.grantId); assert.ok(state);
    assert.equal(await repository.insert(state), 'GrantIdConflict');
    assert.equal(await repository.insert({ ...state, grantId: randomUUID(), branchId: 'p4-branch-2' }), 'LookupDigestConflict');
    assert.equal(await repository.insert({ ...state, grantId: randomUUID(), lookupDigest: { keyVersion: 1, value: 'a'.repeat(64) } }), 'ActiveTupleConflict');
    assert.equal((await tx.execute(sql`SELECT 1 AS usable`)).rows[0].usable, 1);
  });
});
it('Application regenerates colliding Grant ID and digest candidates within the locked real transaction', async () => {
  const first = await issued(); let generations = 0, identifiers = 0;
  const lifecycle = new PublicProductShareLifecycle(f.unitOfWork, { now: () => new Date('2026-10-12T16:00:00Z') },
    { next: () => ++identifiers === 1 ? first.grantId : randomUUID() }, { ...f.runtime, tokenGenerator: {
      generate: () => { generations++; return generations === 2 ? { ok: true, value: first.url.split('/').at(-1)! } : f.runtime.tokenGenerator.generate(); } } });
  const result = await lifecycle.issue({ ...f.command, branchId: 'p4-branch-2' }); assert.ok(result.ok);
  assert.equal(generations, 3); assert.equal(result.value.url !== first.url, true); assert.deepEqual(await f.counts(), { total: 2, active: 2 }); assert.equal((await f.auditTypes()).length, 2);
});
it('Retained revoked digest remains globally unique', async () => {
  const old = await issued(); await f.lifecycle.revoke({ context: f.command.context, grantId: old.grantId });
  await f.connection.database.transaction(async (tx) => {
    const repository = new PostgreSqlPublicProductShareGrantRepository(tx); const state = await repository.findById('p4-workspace', old.grantId); assert.ok(state);
    assert.equal(await repository.insert({ ...state, grantId: randomUUID() }), 'LookupDigestConflict');
  });
});
it('CAS rejects stale revision and immutable scope without partial writes; overflow fails closed', async () => {
  const first = await issued();
  await f.connection.database.transaction(async (tx) => {
    const repository = new PostgreSqlPublicProductShareGrantRepository(tx); const old = await repository.findById('p4-workspace', first.grantId); assert.ok(old);
    const grant = PublicProductShareGrant.rehydrate(old); grant.revoke('p4-actor', new Date('2026-10-13'));
    await tx.execute(sql`UPDATE catalog_public_product_share_grants SET revision=2`);
    assert.equal(await repository.save(grant.snapshot(), 1), 'ExpectedRevisionConflict');
  });
  await f.execute(sql`UPDATE catalog_public_product_share_grants SET revision=9007199254740991`);
  assert.deepEqual(await f.lifecycle.revoke({ context: f.command.context, grantId: first.grantId }), { ok: false, error: 'IntegrityFailure' });
  assert.deepEqual(await f.lifecycle.replace({ ...f.command, expectedCurrentGrantId: first.grantId }), { ok: false, error: 'IntegrityFailure' });
  assert.equal((await f.counts()).active, 1);
});
for (const operation of ['issue','revoke','replace'] as const) it(`${operation} audit failure rolls back all lifecycle writes`, async () => {
  const previous = operation === 'issue' ? null : await issued();
  const lifecycle = f.lifecycleFor(transactionWith((ctx) => ({ ...ctx, audit: { append: async () => { throw new Error('SYNTHETIC_SECRET'); } } })));
  const result = operation === 'issue' ? await lifecycle.issue(f.command) : operation === 'revoke' ? await lifecycle.revoke({ context: f.command.context, grantId: previous!.grantId }) : await lifecycle.replace({ ...f.command, expectedCurrentGrantId: previous!.grantId });
  assert.deepEqual(result, { ok: false, error: 'ServiceUnavailable' }); assert.deepEqual(await f.counts(), { total: previous ? 1 : 0, active: previous ? 1 : 0 });
  if (previous) { const copied = await f.lifecycle.copy(f.command); assert.ok(copied.ok); assert.equal(copied.value.url === previous.url, true); }
});
it('Typed Rollback after mutation aborts the real transaction', async () => {
  await issued(); await f.unitOfWork.execute(async (ctx) => { const target = await ctx.grants.lockRevocationById('p4-workspace', (await f.execute(sql`SELECT grant_id FROM catalog_public_product_share_grants`)).rows[0].grant_id as string); assert.ok(target);
    assert.equal(await ctx.grants.revokeForExpectedRevision({ workspaceId: target.workspaceId, grantId: target.grantId, productId: target.productId,
      branchId: target.branchId, expectedRevision: target.revision, revokedByActorId: 'p4-actor', revokedAt: new Date('2026-10-13') }), 'Saved'); return { type: 'Rollback', value: 'aborted' }; });
  assert.equal((await f.counts()).active, 1);
});
it('Corrupt canonical envelope fails normal retrieval/Replace but narrow Revoke clears it once without crypto', async () => {
  const old = await issued();
  // SQL accepts encoded shape; the invalid unused base64 bits are caught by strict mapping.
  await f.execute(sql`UPDATE catalog_public_product_share_grants SET bearer_auth_tag=repeat('B',22)`);
  for (const result of [await f.lifecycle.copy(f.command),await f.lifecycle.issue(f.command),await f.lifecycle.replace({ ...f.command, expectedCurrentGrantId: old.grantId })]) assert.deepEqual(result, { ok: false, error: 'IntegrityFailure' });
  const lifecycle = new PublicProductShareLifecycle(f.unitOfWork, { now: () => new Date('2026-10-13') }, { next: randomUUID }, createPublicShareCryptoRuntime({ NODE_ENV: 'test' }));
  const context = publicShareActor({ permissions: [PUBLIC_SHARE_MANAGE_PERMISSION] });
  assert.deepEqual(await lifecycle.revoke({ context: publicShareActor({ workspaceId: 'p4-foreign' }), grantId: old.grantId }), { ok: false, error: 'NotFound' });
  const first = await lifecycle.revoke({ context, grantId: old.grantId }); assert.ok(first.ok); assert.equal(first.value.outcome, 'Revoked');
  const row = (await f.execute(sql`SELECT revision::text, revoked_at, revoked_by_actor_id,envelope_format_version,encryption_key_version,bearer_iv,bearer_ciphertext,bearer_auth_tag FROM catalog_public_product_share_grants`)).rows[0];
  assert.equal(row.revision, '2'); assert.equal(['envelope_format_version','encryption_key_version','bearer_iv','bearer_ciphertext','bearer_auth_tag'].every((key) => row[key] === null), true);
  assert.equal((await lifecycle.revoke({ context, grantId: old.grantId })).ok, true); assert.equal((await f.auditTypes()).filter((event) => event === 'PublicProductShareRevoked').length, 1);
});
it('Wrong digest and missing retained key fail retrieval without implicit generation', async () => {
  const old = await issued(); await f.execute(sql`UPDATE catalog_public_product_share_grants SET lookup_digest=repeat('a',64)`);
  assert.deepEqual(await f.lifecycle.issue(f.command), { ok: false, error: 'IntegrityFailure' });
  await f.execute(sql`UPDATE catalog_public_product_share_grants SET encryption_key_version=2147483648`);
  assert.deepEqual(await f.lifecycle.copy(f.command), { ok: false, error: 'KeyUnavailable' }); assert.equal((await f.counts()).total, 1);
  assert.equal((await f.lifecycle.revoke({ context: f.command.context, grantId: old.grantId })).ok, true);
});
for (const field of ['workspaceId','grantId','productId','branchId'] as const) it(`Persisted envelope rejects AAD ${field} swap`, async () => {
  const first = await issued(); await f.unitOfWork.execute(async (ctx) => { const state = await ctx.grants.findById('p4-workspace', first.grantId); assert.ok(state?.bearerEnvelope);
    const result = f.runtime.bearerProtection.decrypt(state.bearerEnvelope, { ...state, [field]: `${state[field]}-foreign` }, state.lookupDigest);
    assert.deepEqual(result, { ok: false, error: 'IntegrityFailure' }); return { type: 'Commit', value: true }; });
});
it('Audit rejects secret sentinel values under harmless extra property names', async () => {
  const first = await issued();
  for (const key of ['note','caption','extra']) {
    await assert.rejects(() => f.unitOfWork.execute(async (ctx) => { await ctx.audit.append({ workspaceId: 'p4-workspace', actorId: 'p4-actor', grantId: first.grantId,
      productId: 'p4-product', branchId: 'p4-branch', eventType: 'PublicProductShareRevoked', occurredAt: new Date(), [key]: first.url } as never); return { type: 'Commit', value: true }; }), { message: 'IntegrityFailure' });
  }
  assert.equal((await f.auditTypes()).length, 1);
});
it('Key inspection reports successful empty, active sets, deduplication and revoked exclusion separately from P3', async () => {
  const inspector = new PostgreSqlPublicShareKeyVersionInspector(f.connection.database);
  inspectionEvidence(await inspector.inspect(), [], []);
  const first = await issued(); await f.lifecycle.issue({ ...f.command, branchId: 'p4-branch-2' });
  inspectionEvidence(await inspector.inspect(), [1], [2]);
  await f.lifecycle.revoke({ context: f.command.context, grantId: first.grantId });
  await f.execute(sql`UPDATE catalog_public_product_share_grants SET lookup_key_version=9007199254740991,encryption_key_version=9007199254740991 WHERE revoked_at IS NULL`);
  const inspection = inspectionEvidence(await inspector.inspect(), [Number.MAX_SAFE_INTEGER], [Number.MAX_SAFE_INTEGER]);
  assert.equal(evaluatePublicShareKeyCoverage({ lookupVersions: [Number.MAX_SAFE_INTEGER], encryptionVersions: [Number.MAX_SAFE_INTEGER] }, inspection).durableCoverage, 'UNCHECKED');
});
it('Coverage is service-wide and does not truncate more than eight versions', async () => {
  const first = await issued();
  await f.execute(sql`INSERT INTO workspace_branch_references(workspace_id,branch_id,status,created_at,updated_at)
    SELECT 'p4-workspace','coverage-'||i,'Active','2026-01-01','2026-01-01' FROM generate_series(1,10) i`);
  await f.execute(sql`INSERT INTO catalog_public_product_share_grants SELECT workspace_id,md5(i::text)::uuid::text,product_id,'coverage-'||i,i,md5(i::text)||md5(i::text),envelope_format_version,i,bearer_iv,bearer_ciphertext,bearer_auth_tag,issued_by_actor_id,issued_at,NULL,NULL,1
    FROM catalog_public_product_share_grants CROSS JOIN generate_series(3,10) i WHERE grant_id=${first.grantId}`);
  await f.execute(sql`INSERT INTO catalog_public_product_share_grants SELECT 'p4-foreign',${randomUUID()},'p4-foreign-product','p4-foreign-branch',11,repeat('f',64),envelope_format_version,11,bearer_iv,bearer_ciphertext,bearer_auth_tag,issued_by_actor_id,issued_at,NULL,NULL,1
    FROM catalog_public_product_share_grants WHERE grant_id=${first.grantId}`);
  inspectionEvidence(await new PostgreSqlPublicShareKeyVersionInspector(f.connection.database).inspect(), [1,3,4,5,6,7,8,9,10,11], [2,3,4,5,6,7,8,9,10,11]);
});
it('Malformed unsafe raw version yields explicit inspection failure instead of empty evidence', async () => {
  await issued();
  await f.connection.database.transaction(async (tx) => {
    await tx.execute(sql`ALTER TABLE catalog_public_product_share_grants DROP CONSTRAINT catalog_public_product_share_grants_lookup_key_version_safe`);
    await tx.execute(sql`UPDATE catalog_public_product_share_grants SET lookup_key_version=9007199254740992`);
    const inspected = await new PostgreSqlPublicShareKeyVersionInspector(tx as unknown as typeof f.connection.database).inspect();
    assert.deepEqual(inspected, { type: 'IntegrityFailure' });
    await tx.execute(sql`UPDATE catalog_public_product_share_grants SET lookup_key_version=1`);
    await tx.execute(sql`ALTER TABLE catalog_public_product_share_grants ADD CONSTRAINT catalog_public_product_share_grants_lookup_key_version_safe CHECK(lookup_key_version BETWEEN 1 AND 9007199254740991)`);
  });
});
