import assert from 'node:assert/strict';
import { before, beforeEach, after, it } from 'node:test';
import { sql } from 'drizzle-orm';
import { randomUUID } from 'node:crypto';
import { publicSharePostgresFixture } from '../../mock/public-share-postgres.fixture';
import type { PublicProductShareUnitOfWork } from '../../ports/public-product-share-unit-of-work.port';
import { PostgreSqlPublicShareKeyVersionInspector } from './postgresql-public-share-key-version-inspector';
import { mapPublicShareGrant } from './postgresql-public-product-share-grant.repository';
import type { PublicProductShareGrantState } from '../../domain/public-product-share-grant';
import { PublicProductShareLifecycle, type PublicShareLinkResult } from '../../application/public-product-share.use-cases';

const a = publicSharePostgresFixture('p4-race-a'), b = publicSharePostgresFixture('p4-race-b'), observer = publicSharePostgresFixture('p4-race-observer');
before(a.migrate); beforeEach(a.seed); after(async () => { await Promise.all([a.connection.close(),b.connection.close(),observer.connection.close()]); });
const barrier = () => { let release!: () => void; const reached = new Promise<void>((resolve) => { release = resolve; }); return { reached, release }; };
const holdParent = (uow: PublicProductShareUnitOfWork) => {
  const locked = barrier(), proceed = barrier();
  const wrapped: PublicProductShareUnitOfWork = { execute: (work) => uow.execute((ctx) => work({ ...ctx,
    resources: { readCurrent: ctx.resources.readCurrent.bind(ctx.resources), existsInScope: ctx.resources.existsInScope.bind(ctx.resources), lockProductParent: async (workspaceId, productId) => {
      const found = await ctx.resources.lockProductParent(workspaceId, productId); locked.release(); await proceed.reached; return found;
    } } })) };
  return { wrapped, locked, proceed };
};
const observeBlocked = async () => {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    const row = (await observer.execute(sql`SELECT EXISTS(SELECT 1 FROM pg_stat_activity WHERE application_name='p4-race-b' AND wait_event_type='Lock' AND cardinality(pg_blocking_pids(pid)) > 0) AS blocked`)).rows[0];
    if (row.blocked === true) return;
    await new Promise<void>((resolve) => setImmediate(resolve));
  }
  throw new Error('ExpectedObservedPostgreSqlBlocking');
};
const initial = async () => { const result = await a.lifecycle.issue(a.command); assert.ok(result.ok); return result.value; };
const durableGrants = async () => (await observer.execute(sql`SELECT *,lookup_key_version::text,encryption_key_version::text,revision::text,
  issued_at::text,revoked_at::text FROM catalog_public_product_share_grants ORDER BY grant_id`)).rows.map(mapPublicShareGrant);
const assertRetrievable = (state: PublicProductShareGrantState, link: PublicShareLinkResult) => {
  assert.equal(state.grantId, link.grantId); assert.equal(state.revision, 1); assert.equal(state.revokedAt, null); assert.equal(state.revokedByActorId, null);
  assert.ok(state.bearerEnvelope);
  const decrypted = observer.runtime.bearerProtection.decrypt(state.bearerEnvelope, state, state.lookupDigest); assert.ok(decrypted.ok);
  const verified = observer.runtime.lookupDigest.verify(decrypted.value, state.lookupDigest); assert.ok(verified.ok && verified.value);
  assert.equal(link.url === `${observer.runtime.publicOrigin}/share/${decrypted.value}`, true);
};
const assertAudits = async (expected: readonly { eventType: string; grantId: string; branchId?: string; previousGrantId?: string }[]) => {
  const events = (await observer.execute(sql`SELECT event_type,result_code,metadata FROM security_audit_events`)).rows;
  const sort = (items: readonly unknown[]) => items.map(item => JSON.stringify(item, (_key, value) => value && typeof value === 'object' && !Array.isArray(value)
    ? Object.fromEntries(Object.entries(value).sort(([a],[b]) => a.localeCompare(b))) : value)).sort();
  assert.deepEqual(sort(events.map(row => ({ eventType: row.event_type, resultCode: row.result_code, metadata: row.metadata }))), sort(expected.map(event => ({
    eventType: event.eventType, resultCode: 'Succeeded', metadata: { grantId: event.grantId, productId: 'p4-product', branchId: event.branchId ?? 'p4-branch',
      ...(event.previousGrantId ? { previousGrantId: event.previousGrantId } : {}) },
  }))));
};
type RaceOperation = 'issue' | 'copy' | 'replace' | 'revoke';
const countedLifecycle = (fixture: typeof a, work: PublicProductShareUnitOfWork = fixture.unitOfWork) => {
  let generations = 0;
  return { generations: () => generations, lifecycle: new PublicProductShareLifecycle(work, { now: () => new Date('2026-10-12T16:00:00Z') }, { next: randomUUID }, {
    ...fixture.runtime, tokenGenerator: { generate: () => { generations++; return fixture.runtime.tokenGenerator.generate(); } },
  }) };
};
const invoke = (fixture: typeof a, lifecycle: typeof a.lifecycle, operation: RaceOperation, grantId: string, differentBranch = false) => {
  const command = { ...fixture.command, ...(differentBranch ? { branchId: 'p4-branch-2' } : {}) };
  return operation === 'revoke' ? lifecycle.revoke({ context: command.context, grantId })
    : operation === 'replace' ? lifecycle.replace({ ...command, expectedCurrentGrantId: grantId }) : lifecycle[operation](command);
};

for (const [first,second] of [
  ['issue','issue'], ['issue','revoke'], ['revoke','issue'], ['replace','revoke'], ['revoke','replace'],
  ['replace','replace'], ['copy','revoke'], ['revoke','copy'], ['copy','replace'], ['replace','copy'],
] as const) it(`Observed Product lock orders ${first} before ${second} with no successor retargeting`, { timeout: 20000 }, async () => {
  const old = await initial(); const original = (await durableGrants())[0]; const held = holdParent(a.unitOfWork);
  const firstRunner = countedLifecycle(a, held.wrapped), secondRunner = countedLifecycle(b);
  const firstPromise = invoke(a,firstRunner.lifecycle,first,old.grantId);
  await held.locked.reached;
  const secondPromise = invoke(b,secondRunner.lifecycle,second,old.grantId);
  try { await observeBlocked(); } finally { held.proceed.release(); }
  const [winner,loser] = await Promise.all([firstPromise,secondPromise]);
  assert.ok(winner.ok);
  assert.equal(firstRunner.generations(), first === 'replace' ? 1 : 0);
  assert.equal(secondRunner.generations(), (first === 'revoke' && second === 'issue') || (first === 'copy' && second === 'replace') ? 1 : 0);
  const expectedFirst = first === 'issue' ? 'Reused' : first === 'copy' ? 'Copied' : first === 'replace' ? 'Replaced' : 'Revoked';
  assert.equal(winner.value.outcome, expectedFirst);
  const conflict = (first === 'replace' || first === 'revoke') && second === 'replace';
  const missing = first === 'revoke' && second === 'copy';
  if (conflict) assert.deepEqual(loser, { ok: false, error: 'ExpectedCurrentGrantConflict' });
  else if (missing) assert.deepEqual(loser, { ok: false, error: 'NoActiveGrant' });
  else {
    assert.ok(loser.ok);
    assert.equal(loser.value.outcome, second === 'issue' ? (first === 'revoke' ? 'Created' : 'Reused')
      : second === 'copy' ? 'Copied' : second === 'replace' ? 'Replaced' : first === 'replace' ? 'AlreadyRevoked' : 'Revoked');
  }
  const successfulLinks = [winner,loser].flatMap(result => result.ok && 'url' in result.value ? [result.value] : []);
  const successor = successfulLinks.find(link => link.grantId !== old.grantId);
  const replaces = first === 'replace' || (second === 'replace' && first === 'copy');
  const revokes = first === 'revoke' || (second === 'revoke' && first !== 'replace');
  const oldRevoked = replaces || revokes;
  const states = await durableGrants(); const persistedOld = states.find(state => state.grantId === old.grantId); assert.ok(persistedOld);
  assert.deepEqual(persistedOld, oldRevoked ? { ...original, revokedAt: new Date('2026-10-12T16:00:00Z'), revokedByActorId: 'p4-actor', revision: 2, bearerEnvelope: null } : original);
  assert.deepEqual(await observer.counts(), { total: successor ? 2 : 1, active: successor || !oldRevoked ? 1 : 0 });
  const active = states.filter(state => state.revokedAt === null);
  if (successor) {
    assert.equal(active.length, 1); assertRetrievable(active[0], successor);
    assert.equal(successor.url !== old.url, true);
    const copied = await observer.lifecycle.copy(observer.command); assert.ok(copied.ok);
    assert.equal(copied.value.grantId, successor.grantId); assert.equal(copied.value.url === successor.url, true);
  } else if (!oldRevoked) assertRetrievable(active[0], old);
  else assert.deepEqual(await observer.lifecycle.copy(observer.command), { ok: false, error: 'NoActiveGrant' });
  for (const link of successfulLinks) {
    const expected: PublicShareLinkResult | undefined = link.outcome === 'Reused' || (first === 'copy' && link === winner.value) ? old : successor;
    assert.ok(expected); assert.equal(link.grantId, expected.grantId); assert.equal(link.url === expected.url, true);
  }
  await assertAudits([
    { eventType: 'PublicProductShareIssued', grantId: old.grantId },
    ...(revokes ? [{ eventType: 'PublicProductShareRevoked', grantId: old.grantId }] : []),
    ...(successor ? [{ eventType: replaces ? 'PublicProductShareReplaced' : 'PublicProductShareIssued', grantId: successor.grantId,
      ...(replaces ? { previousGrantId: old.grantId } : {}) }] : []),
  ]);
});

it('Issue/Issue from empty tuple serializes and exposes only one winning URL', { timeout: 20000 }, async () => {
  const held = holdParent(a.unitOfWork); const first = a.lifecycleFor(held.wrapped).issue(a.command); await held.locked.reached;
  const second = b.lifecycle.issue(b.command);
  try { await observeBlocked(); } finally { held.proceed.release(); }
  const results = await Promise.all([first,second]); assert.ok(results[0].ok && results[1].ok);
  assert.equal(results[0].value.url === results[1].value.url, true); assert.deepEqual(await a.counts(), { total: 1, active: 1 });
  assert.equal(results[0].value.outcome, 'Created'); assert.equal(results[1].value.outcome, 'Reused');
  assert.equal(results[0].value.grantId, results[1].value.grantId);
  assertRetrievable((await durableGrants())[0], results[0].value);
  await assertAudits([{ eventType: 'PublicProductShareIssued', grantId: results[0].value.grantId }]);
});
it('Same Product with different Branch still serializes through parent lock', { timeout: 20000 }, async () => {
  const held = holdParent(a.unitOfWork); const first = a.lifecycleFor(held.wrapped).issue(a.command); await held.locked.reached;
  const second = b.lifecycle.issue({ ...b.command, branchId: 'p4-branch-2' });
  try { await observeBlocked(); } finally { held.proceed.release(); }
  const results = await Promise.all([first,second]); assert.ok(results[0].ok && results[1].ok); assert.deepEqual(await a.counts(), { total: 2, active: 2 });
  assert.equal(results[0].value.outcome, 'Created'); assert.equal(results[1].value.outcome, 'Created');
  assert.notEqual(results[0].value.grantId, results[1].value.grantId); assert.equal(results[0].value.url !== results[1].value.url, true);
  const states = await durableGrants();
  const links = results.map(result => { assert.ok(result.ok); return result.value; });
  for (const [index,branchId] of ['p4-branch','p4-branch-2'].entries()) {
    const state = states.find(state => state.branchId === branchId); assert.ok(state); assertRetrievable(state, links[index]);
    const copied = await observer.lifecycle.copy({ ...observer.command, branchId }); assert.ok(copied.ok); assert.equal(copied.value.url === links[index].url, true);
  }
  await assertAudits(links.map((link,index) => ({ eventType: 'PublicProductShareIssued', grantId: link.grantId, branchId: index ? 'p4-branch-2' : 'p4-branch' })));
});
it('Coverage observes one statement snapshot during uncommitted lifecycle disposal and requires fresh inspection after commit', async () => {
  const old = await initial(); const wrote = barrier(), proceed = barrier();
  const holdAudit: PublicProductShareUnitOfWork = { execute: (work) => a.unitOfWork.execute((ctx) => work({ ...ctx, audit: {
    append: async (record) => { await ctx.audit.append(record); wrote.release(); await proceed.reached; } } })) };
  const revoked = a.lifecycleFor(holdAudit).revoke({ context: a.command.context, grantId: old.grantId }); await wrote.reached;
  const inspector = new PostgreSqlPublicShareKeyVersionInspector(b.connection.database);
  try {
    const inspected = await inspector.inspect(); assert.equal(inspected.type, 'Inspected'); if (inspected.type !== 'Inspected') throw new Error('ExpectedInspection');
    assert.deepEqual(inspected.evidence.lookupVersions, [1]); assert.deepEqual(inspected.evidence.encryptionVersions, [2]);
    assert.equal(inspected.evidence.consistency, 'StatementSnapshot'); assert.ok(Number.isFinite(inspected.evidence.inspectedAt.getTime()));
    assertRetrievable((await durableGrants())[0], old);
    await assertAudits([{ eventType: 'PublicProductShareIssued', grantId: old.grantId }]);
  }
  finally { proceed.release(); }
  const result = await revoked; assert.deepEqual(result, { ok: true, value: { outcome: 'Revoked', grantId: old.grantId } });
  const inspected = await inspector.inspect(); assert.equal(inspected.type, 'Inspected'); if (inspected.type !== 'Inspected') throw new Error('ExpectedInspection');
  assert.deepEqual(inspected.evidence.lookupVersions, []); assert.deepEqual(inspected.evidence.encryptionVersions, []);
  assert.deepEqual(await observer.counts(), { total: 1, active: 0 });
  const state = (await durableGrants())[0]; assert.equal(state.grantId, old.grantId); assert.equal(state.revision, 2); assert.equal(state.bearerEnvelope, null);
  assert.equal(state.revokedAt?.toISOString(), '2026-10-12T16:00:00.000Z'); assert.equal(state.revokedByActorId, 'p4-actor');
  await assertAudits([{ eventType: 'PublicProductShareIssued', grantId: old.grantId }, { eventType: 'PublicProductShareRevoked', grantId: old.grantId }]);
});
