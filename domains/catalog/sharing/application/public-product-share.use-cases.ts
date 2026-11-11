import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { PublicProductShareGrant, type PublicProductShareGrantState } from "../domain/public-product-share-grant";
import { evaluatePublicShareEligibility } from "../domain/public-product-share-eligibility";
import { validatePublicShareToken } from "../domain/public-share-values";
import type { PublicShareBearerProtectionPort, PublicShareLookupDigestPort, PublicShareTokenGeneratorPort, PublicShareCryptoFailure } from "../ports/public-share-crypto.port";
import type { PublicProductShareClock, PublicProductShareIdentifierGenerator, PublicProductShareUnitOfWork, PublicProductShareTransactionContext, PublicProductShareTransactionDecision } from "../ports/public-product-share-unit-of-work.port";
import type { PublicProductShareTuple } from "../ports/public-product-share-grant-repository.port";
import { PublicSharePersistenceFailure } from "../ports/public-share-persistence-failure";
import type { PublicProductShareError, PublicProductShareResult } from "./public-product-share.types";

export const PUBLIC_SHARE_MANAGE_PERMISSION = 'catalog.sharing.publicLink.manage';
export interface PublicShareLinkCapabilities {
  readonly tokenGenerator: PublicShareTokenGeneratorPort;
  readonly lookupDigest: PublicShareLookupDigestPort;
  readonly bearerProtection: PublicShareBearerProtectionPort;
  readonly publicOrigin: string | null;
}
export interface PublicShareLinkResult { readonly outcome: 'Created' | 'Reused' | 'Copied' | 'Replaced'; readonly grantId: string; readonly url: string }
export interface PublicShareRevokeResult { readonly outcome: 'Revoked' | 'AlreadyRevoked'; readonly grantId: string }
type TupleCommand = { readonly context: TrustedActorContext; readonly productId: string; readonly branchId: string };
const failure = (error: PublicProductShareError): PublicProductShareResult<never> => ({ ok: false, error });
const success = <T>(value: T): PublicProductShareResult<T> => ({ ok: true, value });
const commit = <T>(value: T): PublicProductShareTransactionDecision<T> => ({ type: 'Commit', value });
const abort = <T>(value: T): PublicProductShareTransactionDecision<T> => ({ type: 'Rollback', value });
const canonicalId = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.trim() === value;
const cryptoFailure = (error: PublicShareCryptoFailure) => failure(error === 'CryptoUnavailable' ? 'ServiceUnavailable' : error);
const can = (context: TrustedActorContext, permission: string) => context.permissions.includes(permission);
const inScope = (context: TrustedActorContext, branchId: string) => context.branchScope.type === 'AllBranches' || context.branchScope.branchIds.includes(branchId);
const authorize = (context: TrustedActorContext, needsView: boolean): PublicProductShareError | null => {
  if (!context || !canonicalId(context.workspaceId) || !canonicalId(context.actorId) || !['Owner','Staff'].includes(context.role)
    || !Number.isSafeInteger(context.authorizationVersion) || context.authorizationVersion < 1) return 'AuthenticationRequired';
  if (!can(context, PUBLIC_SHARE_MANAGE_PERMISSION) || (needsView && (!can(context, 'catalog.products.view') || !can(context, 'pricing.view')))) return 'PermissionDenied';
  return null;
};
export const authorizePublicShareManagement = authorize;
const tupleFor = (command: TupleCommand): PublicProductShareTuple => ({ workspaceId: command.context.workspaceId, productId: command.productId, branchId: command.branchId });
const sameTuple = (grant: PublicProductShareTuple, tuple: PublicProductShareTuple) => grant.workspaceId === tuple.workspaceId && grant.productId === tuple.productId && grant.branchId === tuple.branchId;
const safeFailure = (error: unknown) => failure(error instanceof PublicSharePersistenceFailure && error.kind === 'IntegrityFailure' ? 'IntegrityFailure' : 'ServiceUnavailable');

// Application receives resolved full-session authority. No HTTP, registry assignment or public resolver.
export class PublicProductShareLifecycle {
  constructor(private readonly unitOfWork: PublicProductShareUnitOfWork, private readonly clock: PublicProductShareClock,
    private readonly identifiers: PublicProductShareIdentifierGenerator, private readonly links: PublicShareLinkCapabilities) {}

  private tupleAuthority(command: TupleCommand): PublicProductShareError | null {
    const denied = authorize(command.context, true);
    if (denied) return denied;
    if (!canonicalId(command.productId) || !canonicalId(command.branchId)) return 'NotFound';
    return inScope(command.context, command.branchId) ? null : 'BranchScopeDenied';
  }
  private retrieve(grant: PublicProductShareGrantState, outcome: 'Reused' | 'Copied' | 'Replaced'): PublicProductShareResult<PublicShareLinkResult> {
    if (!this.links.publicOrigin) return failure('ServiceUnavailable');
    if (!grant.bearerEnvelope || grant.revokedAt !== null) return failure('NoActiveGrant');
    const decrypted = this.links.bearerProtection.decrypt(grant.bearerEnvelope, grant, grant.lookupDigest);
    if (!decrypted.ok) return cryptoFailure(decrypted.error);
    try { validatePublicShareToken(decrypted.value); } catch { return failure('IntegrityFailure'); }
    const verified = this.links.lookupDigest.verify(decrypted.value, grant.lookupDigest);
    if (!verified.ok) return cryptoFailure(verified.error);
    if (!verified.value) return failure('IntegrityFailure');
    return success({ outcome, grantId: grant.grantId, url: `${this.links.publicOrigin}/share/${decrypted.value}` });
  }
  private async active(context: PublicProductShareTransactionContext, tuple: PublicProductShareTuple) {
    const initial = await context.grants.findActive(tuple);
    if (!initial) return null;
    const locked = await context.grants.lockById(tuple.workspaceId, initial.grantId);
    if (!locked || !sameTuple(locked, tuple) || locked.revokedAt !== null) throw new PublicSharePersistenceFailure('IntegrityFailure');
    return locked;
  }
  private async candidate(context: PublicProductShareTransactionContext, tuple: PublicProductShareTuple, actorId: string,
    budget: { generated: number }): Promise<PublicProductShareResult<{ grant: PublicProductShareGrantState; url: string }>> {
    while (budget.generated < 3) {
      budget.generated++;
      const grantId = this.identifiers.next();
      const generated = this.links.tokenGenerator.generate();
      if (!generated.ok) return cryptoFailure(generated.error);
      const digest = this.links.lookupDigest.create(generated.value);
      if (!digest.ok) return cryptoFailure(digest.error);
      const envelope = this.links.bearerProtection.encrypt(generated.value, { ...tuple, grantId });
      if (!envelope.ok) return cryptoFailure(envelope.error);
      const grant = PublicProductShareGrant.create({ ...tuple, grantId, issuedByActorId: actorId, issuedAt: this.clock.now(),
        lookupDigest: digest.value, bearerEnvelope: envelope.value }).snapshot();
      const inserted = await context.grants.insert(grant);
      if (inserted === 'Saved') return success({ grant, url: `${this.links.publicOrigin}/share/${generated.value}` });
      if (inserted === 'ActiveTupleConflict') throw new ActiveTupleConflict();
    }
    return failure('ServiceUnavailable');
  }

  async issue(command: TupleCommand): Promise<PublicProductShareResult<PublicShareLinkResult>> {
    const denied = this.tupleAuthority(command);
    if (denied) return failure(denied);
    if (!this.links.publicOrigin) return failure('ServiceUnavailable');
    const budget = { generated: 0 };
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.unitOfWork.execute<PublicProductShareResult<PublicShareLinkResult>>(async (context) => {
          const currentDenied = this.tupleAuthority(command);
          if (currentDenied) return abort(failure(currentDenied));
          const tuple = tupleFor(command);
          if (!await context.resources.lockProductParent(tuple.workspaceId, tuple.productId)) return abort(failure('NotFound'));
          const active = await this.active(context, tuple);
          if (active) { const result = this.retrieve(active, 'Reused'); return result.ok ? commit(result) : abort(result); }
          const resource = await context.resources.readCurrent(tuple);
          if (!resource) return abort(failure('NotFound'));
          const eligibility = evaluatePublicShareEligibility(tuple.workspaceId, resource);
          if (eligibility !== 'Eligible') return abort(failure(eligibility === 'IntegrityFailure' ? eligibility : 'IssueIneligible'));
          const candidate = await this.candidate(context, tuple, command.context.actorId, budget);
          if (!candidate.ok) return abort(candidate);
          await context.audit.append({ ...tuple, actorId: command.context.actorId, grantId: candidate.value.grant.grantId,
            eventType: 'PublicProductShareIssued', occurredAt: candidate.value.grant.issuedAt });
          return commit(success({ outcome: 'Created', grantId: candidate.value.grant.grantId, url: candidate.value.url }));
        });
      } catch (error) {
        if (attempt < 2 && (error instanceof ActiveTupleConflict || (error instanceof PublicSharePersistenceFailure
          && ['SerializationConflict','DeadlockConflict'].includes(error.kind)))) continue;
        return safeFailure(error);
      }
    }
    return failure('ServiceUnavailable');
  }

  async copy(command: TupleCommand): Promise<PublicProductShareResult<PublicShareLinkResult>> {
    const denied = this.tupleAuthority(command);
    if (denied) return failure(denied);
    try {
      return await this.unitOfWork.execute<PublicProductShareResult<PublicShareLinkResult>>(async (context) => {
        const tuple = tupleFor(command);
        if (!await context.resources.lockProductParent(tuple.workspaceId, tuple.productId) || !await context.resources.existsInScope(tuple)) return abort(failure('NotFound'));
        const grant = await this.active(context, tuple);
        if (!grant) return abort(failure('NoActiveGrant'));
        const result = this.retrieve(grant, 'Copied');
        return result.ok ? commit(result) : abort(result);
      });
    } catch (error) { return safeFailure(error); }
  }

  async revoke(command: { readonly context: TrustedActorContext; readonly grantId: string }): Promise<PublicProductShareResult<PublicShareRevokeResult>> {
    const denied = authorize(command.context, false);
    if (denied) return failure(denied);
    if (!canonicalId(command.grantId)) return failure('NotFound');
    try {
      return await this.unitOfWork.execute<PublicProductShareResult<PublicShareRevokeResult>>(async (context) => {
        const target = await context.grants.findRevocationById(command.context.workspaceId, command.grantId);
        if (!target) return abort(failure('NotFound'));
        if (!inScope(command.context, target.branchId)) return abort(failure('BranchScopeDenied'));
        if (!await context.resources.lockProductParent(target.workspaceId, target.productId)) return abort(failure('NotFound'));
        const locked = await context.grants.lockRevocationById(target.workspaceId, target.grantId);
        if (!locked || !sameTuple(locked, target)) return abort(failure('IntegrityFailure'));
        if (locked.revokedAt !== null) return commit(success({ outcome: 'AlreadyRevoked', grantId: locked.grantId }));
        if (locked.revision === Number.MAX_SAFE_INTEGER) return abort(failure('IntegrityFailure'));
        const occurredAt = this.clock.now();
        if (!Number.isFinite(occurredAt.getTime()) || occurredAt < locked.issuedAt) return abort(failure('IntegrityFailure'));
        if (await context.grants.revokeForExpectedRevision({ workspaceId: locked.workspaceId, grantId: locked.grantId,
          productId: locked.productId, branchId: locked.branchId, expectedRevision: locked.revision,
          revokedByActorId: command.context.actorId, revokedAt: occurredAt }) !== 'Saved') return abort(failure('ServiceUnavailable'));
        await context.audit.append({ workspaceId: locked.workspaceId, productId: locked.productId, branchId: locked.branchId,
          actorId: command.context.actorId, grantId: locked.grantId, eventType: 'PublicProductShareRevoked', occurredAt });
        return commit(success({ outcome: 'Revoked', grantId: locked.grantId }));
      });
    } catch (error) { return safeFailure(error); }
  }

  async replace(command: TupleCommand & { readonly expectedCurrentGrantId: string }): Promise<PublicProductShareResult<PublicShareLinkResult>> {
    const denied = this.tupleAuthority(command);
    if (denied) return failure(denied);
    if (!canonicalId(command.expectedCurrentGrantId)) return failure('ExpectedCurrentGrantConflict');
    if (!this.links.publicOrigin) return failure('ServiceUnavailable');
    try {
      return await this.unitOfWork.execute<PublicProductShareResult<PublicShareLinkResult>>(async (context) => {
        const tuple = tupleFor(command);
        if (!await context.resources.lockProductParent(tuple.workspaceId, tuple.productId)) return abort(failure('NotFound'));
        const old = await context.grants.lockById(tuple.workspaceId, command.expectedCurrentGrantId);
        if (!old || !sameTuple(old, tuple) || old.revokedAt !== null) return abort(failure('ExpectedCurrentGrantConflict'));
        const retrieved = this.retrieve(old, 'Replaced');
        if (!retrieved.ok) return abort(retrieved);
        const resource = await context.resources.readCurrent(tuple);
        if (!resource) return abort(failure('NotFound'));
        const eligibility = evaluatePublicShareEligibility(tuple.workspaceId, resource);
        if (eligibility !== 'Eligible') return abort(failure(eligibility === 'IntegrityFailure' ? eligibility : 'ReplacementIneligible'));
        if (old.revision === Number.MAX_SAFE_INTEGER) return abort(failure('IntegrityFailure'));
        const revoked = PublicProductShareGrant.rehydrate(old);
        const occurredAt = this.clock.now();
        revoked.revoke(command.context.actorId, occurredAt);
        if (await context.grants.save(revoked.snapshot(), old.revision) !== 'Saved') return abort(failure('ServiceUnavailable'));
        const candidate = await this.candidate(context, tuple, command.context.actorId, { generated: 0 });
        if (!candidate.ok) return abort(candidate);
        await context.audit.append({ ...tuple, actorId: command.context.actorId, grantId: candidate.value.grant.grantId,
          previousGrantId: old.grantId, eventType: 'PublicProductShareReplaced', occurredAt });
        return commit(success({ outcome: 'Replaced', grantId: candidate.value.grant.grantId, url: candidate.value.url }));
      });
    } catch (error) { return safeFailure(error); }
  }
}

// Application-local control signal; the UoW rolls back before Issue can recover.
class ActiveTupleConflict extends PublicSharePersistenceFailure {
  constructor() { super('ServiceUnavailable'); }
}
