import assert from 'node:assert/strict';
import { it } from 'node:test';
import { exactPublicShareTimestamp, exactPublicShareVersion, publicShareDatabaseFailure } from './public-share-persistence';
import { classifyPublicShareInsertConflict, mapPublicShareGrant, mapPublicShareRevocationTarget } from './postgresql-public-product-share-grant.repository';
import { PostgreSqlPublicShareKeyVersionInspector } from './postgresql-public-share-key-version-inspector';
import type { PlatformDatabase } from '../../../../../shared/infrastructure/persistence/database';

for (const value of ['2147483647','2147483648','9007199254740991']) it(`Exact raw version accepts ${value}`, () => assert.equal(exactPublicShareVersion(value), Number(value)));
for (const value of [0,1,'0','-1','01','1.0','1e3',' 1','9007199254740992',null]) it(`Exact raw version rejects malformed input case ${typeof value}:${String(value)}`, () => assert.throws(() => exactPublicShareVersion(value), { message: 'IntegrityFailure' }));
for (const [constraint,result] of [['catalog_public_product_share_grants_active_uq','ActiveTupleConflict'],['catalog_public_product_share_grants_pk','GrantIdConflict'],['catalog_public_product_share_grants_digest_uq','LookupDigestConflict']] as const) it(`Classifies exact ${result} across known Drizzle cause`, () => {
  assert.equal(classifyPublicShareInsertConflict({ code: '23505', constraint }), result);
  assert.equal(classifyPublicShareInsertConflict({ cause: { code: '23505', constraint } }), result);
});
it('Unknown/missing constraint and messages alone never become retryable unique outcomes or leak secrets', () => {
  for (const error of [{ code: '23505' },{ code: '23505', constraint: 'unknown' },{ code: '23505', constraint: 'catalog_public_product_share_grants_pk_extra' },{ message: '23505 catalog_public_product_share_grants_pk SYNTHETIC_SECRET' }]) {
    assert.equal(classifyPublicShareInsertConflict(error), null); assert.equal(publicShareDatabaseFailure(error).message, 'ServiceUnavailable');
    assert.equal(JSON.stringify(publicShareDatabaseFailure(error)).includes('SYNTHETIC_SECRET'), false);
  }
});
it('Revoke-only projection validates lifecycle without reading or returning any protected field', () => {
  const row = { workspace_id: 'w', grant_id: '00000000-0000-0000-0000-000000000001', product_id: 'p', branch_id: 'b', issued_by_actor_id: 'a', issued_at: '2026-01-01T00:00:00Z', revoked_at: null, revoked_by_actor_id: null, revision: '1',
    lookup_digest: 'SYNTHETIC_SECRET', bearer_auth_tag: 'SYNTHETIC_SECRET' };
  assert.equal(JSON.stringify(mapPublicShareRevocationTarget(row)).includes('SYNTHETIC_SECRET'), false);
  assert.throws(() => mapPublicShareGrant(row), { message: 'IntegrityFailure' });
  assert.throws(() => mapPublicShareRevocationTarget({ ...row, revision: '9007199254740992' }), { message: 'IntegrityFailure' });
  assert.throws(() => mapPublicShareRevocationTarget({ ...row, revoked_at: '2020-01-01T00:00:00Z', revoked_by_actor_id: 'a' }), { message: 'IntegrityFailure' });
});
it('Inspection uses exactly one query and rejects malformed arrays/query failures', async () => {
  let queries = 0;
  const row = { lookup_versions: ['1','2147483648'], encryption_versions: ['9007199254740991'], inspected_at: '2026-10-15T00:00:00Z', invalid_active: false };
  const database = { execute: async () => { queries++; return { rows: [row] }; } } as unknown as PlatformDatabase;
  assert.deepEqual(await new PostgreSqlPublicShareKeyVersionInspector(database).inspect(), { type: 'Inspected', evidence: {
    lookupVersions: [1,2147483648], encryptionVersions: [Number.MAX_SAFE_INTEGER], inspectedAt: new Date(row.inspected_at),
    source: 'PostgreSqlPublicProductShareGrants', scope: 'ServiceWide', consistency: 'StatementSnapshot',
  } }); assert.equal(queries, 1);
  for (const corrupt of [{ ...row, lookup_versions: ['01'] }, { ...row, encryption_versions: [null] }, { ...row, invalid_active: true }, { ...row, inspected_at: 'invalid' }, { ...row, lookup_versions: ['9007199254740992'] }]) {
    const database = { execute: async () => ({ rows: [corrupt] }) } as unknown as PlatformDatabase;
    assert.deepEqual(await new PostgreSqlPublicShareKeyVersionInspector(database).inspect(), { type: 'IntegrityFailure' });
  }
  const unavailable = { execute: async () => { throw new Error('SYNTHETIC_QUERY_SECRET'); } } as unknown as PlatformDatabase;
  assert.deepEqual(await new PostgreSqlPublicShareKeyVersionInspector(unavailable).inspect(), { type: 'Unavailable' });
});
for (const value of ['2026-10-12T16:00:00.123Z','2026-10-12 16:00:00.123000+00','2026-10-12T19:00:00.123+03:00']) it(`Lossless lifecycle timestamp accepts ${value}`, () => {
  assert.equal(exactPublicShareTimestamp(value).toISOString(), '2026-10-12T16:00:00.123Z');
});
for (const value of ['2026-10-12T16:00:00.123456Z','2026-10-12T16:00:00.123001Z','2026-02-30T00:00:00Z','infinity',new Date()]) it(`Lifecycle timestamp rejects unsupported input ${typeof value}:${String(value)}`, () => {
  assert.throws(() => exactPublicShareTimestamp(value), { message: 'IntegrityFailure' });
});
