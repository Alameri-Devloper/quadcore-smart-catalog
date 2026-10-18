import { randomUUID } from 'node:crypto';
import type { TrustedActorContext } from '../../../../shared/auth/trusted-actor-context';
import { ProductSpecificationValue } from '../../types/product-specification-value.value-object';
import type { PublicProductShareResourceState, PublicProductShareTransactionContext, PublicProductShareUnitOfWork } from '../ports/public-product-share-unit-of-work.port';
import type { PublicProductShareGrantState } from '../domain/public-product-share-grant';
import type { PublicProductShareInsertResult } from '../ports/public-product-share-grant-repository.port';
import { PublicProductShareLifecycle, PUBLIC_SHARE_MANAGE_PERMISSION } from '../application/public-product-share.use-cases';
import { createPublicShareCryptoRuntime } from '../infrastructure/public-share-crypto-runtime';
import { environment } from '../infrastructure/crypto/public-share-crypto.test-fixtures';

export const publicShareActor = (overrides: Partial<TrustedActorContext> = {}): TrustedActorContext => ({ workspaceId: 'p4-workspace', actorId: 'p4-actor', role: 'Staff',
  permissions: [PUBLIC_SHARE_MANAGE_PERMISSION,'catalog.products.view','pricing.view'], branchScope: { type: 'AllBranches' }, authorizationVersion: 1, ...overrides });
export const publicShareResource = (): PublicProductShareResourceState => {
  const date = new Date('2026-01-01');
  return { productName: 'منتج Product', productLifecycle: 'Published', branchStatus: 'Active', listed: true,
    workspaceRetail: { amountMinor: BigInt(0), currency: 'USD' }, branchRetail: null,
    template: { workspaceId: 'p4-workspace', id: 'p4-template', productTypeId: 'p4-type', version: 1, createdAt: date, updatedAt: date,
      entries: [{ specificationDefinitionId: 'p4-spec', sortOrder: 0, required: false, publicVisibility: 'public' }] },
    definitions: [{ workspaceId: 'p4-workspace', id: 'p4-spec', code: 'p4-spec', displayName: 'Specification', status: 'Active', sortOrder: 0, version: 1,
      createdAt: date, updatedAt: date, valueType: 'Text', unit: null }],
    specificationValues: [ProductSpecificationValue.create({ specificationFieldId: 'p4-spec', value: 'Actual value' })] };
};

export const publicShareMemoryFixture = () => {
  let grants: PublicProductShareGrantState[] = [];
  let audits: Parameters<PublicProductShareTransactionContext['audit']['append']>[0][] = [];
  const fixture = { resource: publicShareResource(), generations: 0, transactions: 0, audits: () => audits, grants: () => grants,
    nextInsert: [] as PublicProductShareInsertResult[], beforeTransaction: undefined as (() => void) | undefined,
    auditFailure: false, commitFailure: false };
  const runtime = createPublicShareCryptoRuntime(environment());
  const unitOfWork: PublicProductShareUnitOfWork = { execute: async (work) => {
    fixture.transactions++; fixture.beforeTransaction?.();
    const previousGrants = [...grants], previousAudits = [...audits];
    const byId = async (workspaceId: string, grantId: string) => grants.find((grant) => grant.workspaceId === workspaceId && grant.grantId === grantId) ?? null;
    const revocationById = async (workspaceId: string, grantId: string) => {
      const grant = await byId(workspaceId, grantId);
      return grant ? { workspaceId: grant.workspaceId, grantId: grant.grantId, productId: grant.productId, branchId: grant.branchId,
        issuedAt: grant.issuedAt, revokedAt: grant.revokedAt, revokedByActorId: grant.revokedByActorId, revision: grant.revision } : null;
    };
    const context: PublicProductShareTransactionContext = { resources: { lockProductParent: async (workspaceId, productId) => workspaceId === 'p4-workspace' && productId === 'p4-product',
      existsInScope: async (tuple) => tuple.workspaceId === 'p4-workspace' && tuple.productId === 'p4-product' && tuple.branchId === 'p4-branch',
      readCurrent: async (tuple) => tuple.workspaceId === 'p4-workspace' && tuple.productId === 'p4-product' && tuple.branchId === 'p4-branch' ? fixture.resource : null },
      audit: { append: async (record) => { if (fixture.auditFailure) throw new Error('SYNTHETIC_PRIVATE_DETAIL'); audits.push(record); } },
      grants: { findActive: async (tuple) => grants.find((grant) => grant.workspaceId === tuple.workspaceId && grant.productId === tuple.productId && grant.branchId === tuple.branchId && !grant.revokedAt) ?? null,
        findById: byId, lockById: byId, findByDigestCandidates: async () => ({ type: 'NotFound' }),
        findRevocationById: revocationById, lockRevocationById: revocationById,
        insert: async (grant) => { const result = fixture.nextInsert.shift() ?? 'Saved'; if (result === 'Saved') grants.push(grant); return result; },
        save: async (grant, revision) => { const old = await byId(grant.workspaceId, grant.grantId);
          if (!old || old.revision !== revision) return 'ExpectedRevisionConflict'; grants = grants.map((item) => item === old ? grant : item); return 'Saved'; },
        revokeForExpectedRevision: async (input) => { const old = await byId(input.workspaceId, input.grantId);
          if (!old || old.revision !== input.expectedRevision) return 'ExpectedRevisionConflict';
          grants = grants.map((item) => item === old ? { ...item, revokedAt: input.revokedAt, revokedByActorId: input.revokedByActorId, bearerEnvelope: null, revision: item.revision + 1 } : item); return 'Saved'; } } };
    try {
      const decision = await work(context);
      if (decision.type === 'Rollback' || fixture.commitFailure) { grants = previousGrants; audits = previousAudits; }
      if (fixture.commitFailure) throw new Error('SYNTHETIC_COMMIT_DETAIL');
      return decision.value;
    } catch (error) { grants = previousGrants; audits = previousAudits; throw error; }
  } };
  const links = { ...runtime, tokenGenerator: { generate: () => { fixture.generations++; return runtime.tokenGenerator.generate(); } } };
  const lifecycle = new PublicProductShareLifecycle(unitOfWork, { now: () => new Date('2026-10-12T16:00:00Z') }, { next: randomUUID }, links);
  return { ...fixture, state: fixture, lifecycle, unitOfWork, links, runtime,
    command: { context: publicShareActor(), productId: 'p4-product', branchId: 'p4-branch' } };
};
