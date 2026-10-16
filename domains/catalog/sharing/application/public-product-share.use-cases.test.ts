import assert from 'node:assert/strict';
import { it } from 'node:test';
import { randomUUID } from 'node:crypto';
import { publicShareActor, publicShareMemoryFixture } from '../mock/public-share-lifecycle.fixture';
import { PublicProductShareLifecycle, PUBLIC_SHARE_MANAGE_PERMISSION } from './public-product-share.use-cases';
import { PublicSharePersistenceFailure } from '../ports/public-share-persistence-failure';
import { createPublicShareCryptoRuntime } from '../infrastructure/public-share-crypto-runtime';
import type { PublicProductShareUnitOfWork } from '../ports/public-product-share-unit-of-work.port';

it('Issue, reuse and Copy return the same authenticated link; only new Issue audits and generates', async () => {
  const f = publicShareMemoryFixture(); const first = await f.lifecycle.issue(f.command); assert.ok(first.ok);
  const reused = await f.lifecycle.issue(f.command), copied = await f.lifecycle.copy(f.command);
  assert.ok(reused.ok && copied.ok); assert.equal(reused.value.url === first.value.url, true); assert.equal(copied.value.url === first.value.url, true);
  assert.equal(f.state.generations, 1); assert.equal(f.state.audits().length, 1);
});
it('Owner with current effective permissions can Issue; missing full authority is rejected', async () => {
  const f = publicShareMemoryFixture(); assert.equal((await f.lifecycle.issue({ ...f.command, context: publicShareActor({ role: 'Owner' }) })).ok, true);
  assert.deepEqual(await f.lifecycle.issue({ ...f.command, context: undefined as never }), { ok: false, error: 'AuthenticationRequired' });
});
it('ActiveTupleConflict exhausts exactly three fresh transactions, never more', async () => {
  const f = publicShareMemoryFixture(); f.state.nextInsert.push('ActiveTupleConflict','ActiveTupleConflict','ActiveTupleConflict','Saved');
  assert.deepEqual(await f.lifecycle.issue(f.command), { ok: false, error: 'ServiceUnavailable' }); assert.equal(f.state.transactions, 3); assert.equal(f.state.generations, 3);
});
for (const operation of ['copy','revoke','replace'] as const) it(`${operation} never replays serialization/deadlock business work`, async () => {
  const f = publicShareMemoryFixture(); const first = await f.lifecycle.issue(f.command); assert.ok(first.ok);
  f.state.beforeTransaction = () => { throw new PublicSharePersistenceFailure('DeadlockConflict'); };
  const result = operation === 'revoke' ? await f.lifecycle.revoke({ context: f.command.context, grantId: first.value.grantId })
    : operation === 'replace' ? await f.lifecycle.replace({ ...f.command, expectedCurrentGrantId: first.value.grantId }) : await f.lifecycle.copy(f.command);
  assert.deepEqual(result, { ok: false, error: 'ServiceUnavailable' }); assert.equal(f.state.transactions, 2); assert.equal(f.state.generations, 1);
});
it('Copy/reuse survive valid temporary ineligibility, including inactive historical Branch', async () => {
  const f = publicShareMemoryFixture(); const first = await f.lifecycle.issue(f.command); assert.ok(first.ok);
  f.state.resource = { ...f.state.resource, productLifecycle: 'Archived', branchStatus: 'Inactive', listed: false, workspaceRetail: null, template: null };
  for (const result of [await f.lifecycle.issue(f.command), await f.lifecycle.copy(f.command)]) { assert.ok(result.ok); assert.equal(result.value.url === first.value.url, true); }
  assert.equal(f.state.generations, 1);
});
for (const role of ['Owner','Staff'] as const) for (const missing of [PUBLIC_SHARE_MANAGE_PERMISSION,'catalog.products.view','pricing.view']) {
  it(`${role} missing ${missing} cannot Issue/Copy/Replace`, async () => {
    const f = publicShareMemoryFixture(); const command = { ...f.command, context: publicShareActor({ role, permissions: f.command.context.permissions.filter((key) => key !== missing) }) };
    for (const result of [await f.lifecycle.issue(command), await f.lifecycle.copy(command), await f.lifecycle.replace({ ...command, expectedCurrentGrantId: randomUUID() })]) assert.deepEqual(result, { ok: false, error: 'PermissionDenied' });
    assert.equal(f.state.transactions, 0);
  });
}
it('Revoke needs only dedicated permission and Branch scope, and is independent of origin and keys', async () => {
  const f = publicShareMemoryFixture(); const first = await f.lifecycle.issue(f.command); assert.ok(first.ok);
  const lifecycle = new PublicProductShareLifecycle(f.unitOfWork, { now: () => new Date('2026-10-13') }, { next: randomUUID }, createPublicShareCryptoRuntime({ NODE_ENV: 'test' }));
  const context = publicShareActor({ permissions: [PUBLIC_SHARE_MANAGE_PERMISSION] });
  assert.deepEqual(await lifecycle.revoke({ context, grantId: first.value.grantId }), { ok: true, value: { outcome: 'Revoked', grantId: first.value.grantId } });
  const old = f.state.grants()[0];
  assert.deepEqual(await lifecycle.revoke({ context, grantId: first.value.grantId }), { ok: true, value: { outcome: 'AlreadyRevoked', grantId: first.value.grantId } });
  assert.equal(f.state.grants()[0], old); assert.equal(old.bearerEnvelope, null); assert.equal(old.revision, 2); assert.equal(f.state.audits().length, 2);
});
it('Branch scope and foreign Workspace deny lifecycle without disclosure', async () => {
  const f = publicShareMemoryFixture(); const created = await f.lifecycle.issue(f.command); assert.ok(created.ok);
  const restricted = publicShareActor({ branchScope: { type: 'SelectedBranches', branchIds: [] } });
  assert.deepEqual(await f.lifecycle.copy({ ...f.command, context: restricted }), { ok: false, error: 'BranchScopeDenied' });
  assert.deepEqual(await f.lifecycle.revoke({ context: restricted, grantId: created.value.grantId }), { ok: false, error: 'BranchScopeDenied' });
  assert.deepEqual(await f.lifecycle.revoke({ context: publicShareActor({ workspaceId: 'foreign' }), grantId: created.value.grantId }), { ok: false, error: 'NotFound' });
});
it('Replace emits one event, clears old envelope, creates revision-one successor and rejects stale replay', async () => {
  const f = publicShareMemoryFixture(); const first = await f.lifecycle.issue(f.command); assert.ok(first.ok);
  const command = { ...f.command, expectedCurrentGrantId: first.value.grantId };
  const replaced = await f.lifecycle.replace(command); assert.ok(replaced.ok); assert.equal(replaced.value.url !== first.value.url, true);
  assert.equal(f.state.grants()[0].bearerEnvelope, null); assert.equal(f.state.grants()[0].revision, 2); assert.equal(f.state.grants()[1].revision, 1);
  assert.deepEqual(f.state.audits().map((event) => event.eventType), ['PublicProductShareIssued','PublicProductShareReplaced']);
  assert.deepEqual(await f.lifecycle.replace(command), { ok: false, error: 'ExpectedCurrentGrantConflict' });
});
for (const kind of ['SerializationConflict','DeadlockConflict'] as const) {
  it(`Issue bounds ${kind} transaction attempts to three`, async () => {
    const f = publicShareMemoryFixture(); f.state.beforeTransaction = () => { throw new PublicSharePersistenceFailure(kind); };
    assert.deepEqual(await f.lifecycle.issue(f.command), { ok: false, error: 'ServiceUnavailable' }); assert.equal(f.state.transactions, 3); assert.equal(f.state.generations, 0);
  });
}
it('ActiveTupleConflict uses fresh transaction and preserves total candidate budget across attempts', async () => {
  const f = publicShareMemoryFixture(); f.state.nextInsert.push('GrantIdConflict','ActiveTupleConflict','LookupDigestConflict');
  assert.deepEqual(await f.lifecycle.issue(f.command), { ok: false, error: 'ServiceUnavailable' }); assert.equal(f.state.generations, 3); assert.equal(f.state.transactions, 2);
  assert.equal(f.state.grants().length, 0); assert.equal(f.state.audits().length, 0);
});
it('Candidate collision regeneration stays in the same operation and outer transaction', async () => {
  const f = publicShareMemoryFixture(); f.state.nextInsert.push('GrantIdConflict','LookupDigestConflict','Saved');
  assert.equal((await f.lifecycle.issue(f.command)).ok, true); assert.equal(f.state.generations, 3); assert.equal(f.state.transactions, 1);
});
it('Unknown persistence failures are sanitized and never replayed', async () => {
  const f = publicShareMemoryFixture(); f.state.beforeTransaction = () => { throw new Error('SYNTHETIC_SQL_SECRET'); };
  const result = await f.lifecycle.issue(f.command); assert.deepEqual(result, { ok: false, error: 'ServiceUnavailable' }); assert.equal(f.state.transactions, 1);
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_SQL_SECRET'), false);
});
for (const failurePoint of ['auditFailure','commitFailure'] as const) it(`No URL or durable candidate escapes ${failurePoint}`, async () => {
  const f = publicShareMemoryFixture(); f.state[failurePoint] = true;
  assert.deepEqual(await f.lifecycle.issue(f.command), { ok: false, error: 'ServiceUnavailable' });
  assert.equal(f.state.grants().length, 0); assert.equal(f.state.audits().length, 0);
});
it('Failed Replace restores the old durable protected state', async () => {
  const f = publicShareMemoryFixture(); const first = await f.lifecycle.issue(f.command); assert.ok(first.ok); const old = f.state.grants()[0];
  f.state.auditFailure = true;
  assert.deepEqual(await f.lifecycle.replace({ ...f.command, expectedCurrentGrantId: first.value.grantId }), { ok: false, error: 'ServiceUnavailable' });
  assert.equal(f.state.grants().length, 1); assert.equal(f.state.grants()[0], old);
});
for (const operation of ['issue','copy','replace'] as const) it(`${operation} retrieval failure never generates a fallback candidate`, async () => {
  const f = publicShareMemoryFixture(); const first = await f.lifecycle.issue(f.command); assert.ok(first.ok);
  const badLinks = { ...f.links, bearerProtection: { ...f.links.bearerProtection, encrypt: f.links.bearerProtection.encrypt.bind(f.links.bearerProtection), decrypt: () => ({ ok: false as const, error: 'IntegrityFailure' as const }) } };
  const lifecycle = new PublicProductShareLifecycle(f.unitOfWork, { now: () => new Date('2026-10-13') }, { next: randomUUID }, badLinks);
  const result = operation === 'replace' ? await lifecycle.replace({ ...f.command, expectedCurrentGrantId: first.value.grantId }) : await lifecycle[operation](f.command);
  assert.deepEqual(result, { ok: false, error: 'IntegrityFailure' }); assert.equal(f.state.generations, 1);
});
it('ActiveTupleConflict recovery returns the authoritative winner without exposing the losing URL', async () => {
  const f = publicShareMemoryFixture(); const issued = await f.lifecycle.issue(f.command); assert.ok(issued.ok);
  let attempts = 0;
  const unitOfWork: PublicProductShareUnitOfWork = { execute: async (work) => { attempts++;
    return f.unitOfWork.execute(async (ctx) => work(attempts === 1 ? { ...ctx, grants: { ...ctx.grants, findActive: async () => null, insert: async () => 'ActiveTupleConflict' } } : ctx)); } };
  const lifecycle = new PublicProductShareLifecycle(unitOfWork, { now: () => new Date('2026-10-13') }, { next: randomUUID }, f.links);
  const result = await lifecycle.issue(f.command); assert.ok(result.ok); assert.equal(result.value.url === issued.value.url, true); assert.equal(attempts, 2);
});
