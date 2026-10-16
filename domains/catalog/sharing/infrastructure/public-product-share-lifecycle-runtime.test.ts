import assert from 'node:assert/strict';
import { it } from 'node:test';
import type { PlatformDatabase } from '../../../../shared/infrastructure/persistence/database';
import { createPublicProductShareLifecycleRuntime } from './public-product-share-lifecycle-runtime';
import { environment } from './crypto/public-share-crypto.test-fixtures';

it('Composition keeps configuration, persisted inspection and pure P3 coverage separate', async () => {
  const database = { execute: async () => ({ rows: [{ lookup_versions: ['1'], encryption_versions: ['2'], inspected_at: '2026-10-15T10:00:00.123456Z', invalid_active: false }] }) } as unknown as PlatformDatabase;
  const result = await createPublicProductShareLifecycleRuntime(database, { environment: environment() }).inspectCoverage();
  assert.equal(result.inspection.type, 'Inspected'); assert.equal(result.coverageEvaluation?.lookup.state, 'COVERED');
  assert.equal(result.coverageEvaluation?.durableCoverage, 'UNCHECKED'); assert.equal(result.configurationReadiness.durableCoverage, 'UNCHECKED');
});
it('Failed inspection cannot be presented as covered empty evidence', async () => {
  const database = { execute: async () => { throw new Error('SYNTHETIC_PRIVATE_DATA'); } } as unknown as PlatformDatabase;
  const result = await createPublicProductShareLifecycleRuntime(database, { environment: environment() }).inspectCoverage();
  assert.deepEqual(result.inspection, { type: 'Unavailable' }); assert.equal(result.coverageEvaluation, null);
  assert.equal(JSON.stringify(result).includes('SYNTHETIC_PRIVATE_DATA'), false);
});
it('Composition never evaluates corrupt durable evidence as covered', async () => {
  const database = { execute: async () => ({ rows: [{ lookup_versions: ['1'], encryption_versions: [], inspected_at: '2026-10-15T10:00:00Z', invalid_active: true }] }) } as unknown as PlatformDatabase;
  const result = await createPublicProductShareLifecycleRuntime(database, { environment: environment() }).inspectCoverage();
  assert.deepEqual(result.inspection, { type: 'IntegrityFailure' }); assert.equal(result.coverageEvaluation, null);
  assert.equal(result.configurationReadiness.durableCoverage, 'UNCHECKED');
});
