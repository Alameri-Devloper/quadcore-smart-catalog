import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { PlatformDatabase } from '../../../../../shared/infrastructure/persistence/database';
import type { PublicShareManagementAdmissionPolicy } from '../../ports/public-share-management-admission.port';
import { PostgreSqlPublicShareManagementAdmission } from './postgresql-public-share-management-admission';
const policy: PublicShareManagementAdmissionPolicy = {
  windowSeconds: 60, cleanupGraceSeconds: 900, lockTimeoutMs: 250, statementTimeoutMs: 1000,
  budgets: { Issue: { user: 20, workspace: 120 }, Copy: { user: 60, workspace: 600 }, Replace: { user: 5, workspace: 30 }, Revoke: { user: 60, workspace: 600 } },
};
it('database outage returns sanitized unavailable without automatic retries', async () => {
  let calls = 0;
  const database = { transaction: async () => { calls++; throw new Error('synthetic-sensitive-database-details'); } } as unknown as PlatformDatabase;
  const result = await new PostgreSqlPublicShareManagementAdmission(database, policy).admit({ workspaceId: 'workspace', actorId: 'actor', operation: 'Revoke' });
  assert.deepEqual(result, { type: 'Unavailable' }); assert.equal(calls, 1); assert.equal(JSON.stringify(result).includes('sensitive'), false);
});
it('empty trusted identifiers fail closed before database work', async () => {
  const database = { transaction: () => { throw new Error('ShouldNotReachDatabase'); } } as unknown as PlatformDatabase;
  assert.deepEqual(await new PostgreSqlPublicShareManagementAdmission(database, policy).admit({ workspaceId: ' ', actorId: 'actor', operation: 'Issue' }), { type: 'Unavailable' });
});
