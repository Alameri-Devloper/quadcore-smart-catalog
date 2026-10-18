import { randomUUID } from 'node:crypto';
import type { PlatformDatabase } from '../../../../shared/infrastructure/persistence/database';
import { PublicProductShareLifecycle } from '../application/public-product-share.use-cases';
import type { PublicProductShareClock, PublicProductShareIdentifierGenerator } from '../ports/public-product-share-unit-of-work.port';
import { PostgreSqlPublicProductShareUnitOfWork } from './persistence/postgresql-public-product-share-unit-of-work';
import { PostgreSqlPublicShareKeyVersionInspector } from './persistence/postgresql-public-share-key-version-inspector';
import { createPublicShareCryptoRuntime } from './public-share-crypto-runtime';
import type { PublicShareCryptoEnvironment } from './crypto/environment-public-share-crypto';

// Internal composition only. P5 owns trusted-session/HTTP wiring and activation.
export const createPublicProductShareLifecycleRuntime = (database: PlatformDatabase, options: {
  readonly environment?: PublicShareCryptoEnvironment;
  readonly clock?: PublicProductShareClock;
  readonly identifiers?: PublicProductShareIdentifierGenerator;
} = {}) => {
  const crypto = createPublicShareCryptoRuntime(options.environment);
  const inspector = new PostgreSqlPublicShareKeyVersionInspector(database);
  return Object.freeze({ lifecycle: new PublicProductShareLifecycle(new PostgreSqlPublicProductShareUnitOfWork(database),
    options.clock ?? { now: () => new Date() }, options.identifiers ?? { next: randomUUID }, crypto),
    inspectCoverage: async () => {
      const inspection = await inspector.inspect();
      // Failed inspection must never become successful empty referenced sets.
      return Object.freeze({ configurationReadiness: crypto.readiness, inspection,
        coverageEvaluation: inspection.type === 'Inspected' ? crypto.evaluateCoverage(inspection.evidence) : null });
    } });
};
