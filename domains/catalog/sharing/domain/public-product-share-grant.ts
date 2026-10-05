import {
  validatePublicShareBearerEnvelope,
  validatePublicShareLookupDigest,
  validatePublicSharePositiveVersion,
  type PublicShareBearerEnvelope,
  type PublicShareLookupDigestValue,
} from "./public-share-values";

export interface PublicProductShareGrantState {
  readonly workspaceId: string;
  readonly grantId: string;
  readonly productId: string;
  readonly branchId: string;
  readonly lookupDigest: PublicShareLookupDigestValue;
  readonly bearerEnvelope: PublicShareBearerEnvelope | null;
  readonly issuedByActorId: string;
  readonly issuedAt: Date;
  readonly revokedAt: Date | null;
  readonly revokedByActorId: string | null;
  readonly revision: number;
}

export type CreatePublicProductShareGrantInput = Omit<PublicProductShareGrantState,
  "revision" | "revokedAt" | "revokedByActorId" | "bearerEnvelope"> & {
    readonly bearerEnvelope: PublicShareBearerEnvelope;
  };

const identifier = (value: string): string => {
  if (typeof value !== "string" || value.length === 0 || value.trim() !== value) {
    throw new Error("InvalidPublicShareIdentity");
  }
  return value;
};
const dateCopy = (value: Date): Date => {
  if (!(value instanceof Date) || !Number.isFinite(value.getTime())) throw new Error("InvalidPublicShareDate");
  return new Date(value.getTime());
};

export class PublicProductShareGrant {
  // Native private state prevents accidental JSON/log serialization of protected values.
  #state: PublicProductShareGrantState;

  private constructor(state: PublicProductShareGrantState) { this.#state = state; }

  static create(input: CreatePublicProductShareGrantInput): PublicProductShareGrant {
    if (!input.bearerEnvelope) throw new Error("InvalidPublicShareEnvelope");
    return PublicProductShareGrant.rehydrate({ ...input, revision: 1, revokedAt: null, revokedByActorId: null });
  }

  static rehydrate(state: PublicProductShareGrantState): PublicProductShareGrant {
    const grantId = identifier(state.grantId);
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(grantId)) {
      throw new Error("InvalidPublicShareGrantId");
    }
    const issuedAt = dateCopy(state.issuedAt);
    const revokedAt = state.revokedAt === null ? null : dateCopy(state.revokedAt);
    const revokedByActorId = state.revokedByActorId === null ? null : identifier(state.revokedByActorId);
    if ((revokedAt === null) !== (revokedByActorId === null)
      || (revokedAt === null) !== (state.bearerEnvelope !== null)
      || (revokedAt !== null && revokedAt < issuedAt)) throw new Error("InvalidPublicShareGrantState");
    return new PublicProductShareGrant(Object.freeze({
      workspaceId: identifier(state.workspaceId), grantId,
      productId: identifier(state.productId), branchId: identifier(state.branchId),
      lookupDigest: validatePublicShareLookupDigest(state.lookupDigest),
      bearerEnvelope: state.bearerEnvelope === null ? null : validatePublicShareBearerEnvelope(state.bearerEnvelope),
      issuedByActorId: identifier(state.issuedByActorId), issuedAt, revokedAt, revokedByActorId,
      revision: validatePublicSharePositiveVersion(state.revision),
    }));
  }

  get workspaceId(): string { return this.#state.workspaceId; }
  get grantId(): string { return this.#state.grantId; }
  get productId(): string { return this.#state.productId; }
  get branchId(): string { return this.#state.branchId; }
  get isRevoked(): boolean { return this.#state.revokedAt !== null; }
  get revision(): number { return this.#state.revision; }

  // Explicit persistence handoff only; never log or expose this state to visitors.
  snapshot(): PublicProductShareGrantState {
    return Object.freeze({ ...this.#state, issuedAt: dateCopy(this.#state.issuedAt),
      revokedAt: this.#state.revokedAt === null ? null : dateCopy(this.#state.revokedAt),
      lookupDigest: Object.freeze({ ...this.#state.lookupDigest }),
      bearerEnvelope: this.#state.bearerEnvelope === null ? null : Object.freeze({ ...this.#state.bearerEnvelope }),
    });
  }

  revoke(actorId: string, occurredAt: Date): "Revoked" | "AlreadyRevoked" {
    if (this.isRevoked) return "AlreadyRevoked";
    const revokedByActorId = identifier(actorId);
    const revokedAt = dateCopy(occurredAt);
    if (revokedAt < this.#state.issuedAt) throw new Error("InvalidPublicShareDate");
    const revision = validatePublicSharePositiveVersion(this.revision + 1);
    this.#state = Object.freeze({ ...this.#state, bearerEnvelope: null, revokedAt, revokedByActorId, revision });
    return "Revoked";
  }

  updateProtectedValues(input: {
    readonly expectedRevision: number;
    readonly lookupDigest: PublicShareLookupDigestValue;
    readonly bearerEnvelope: PublicShareBearerEnvelope;
  }): "Updated" | "Conflict" | "Revoked" {
    if (this.isRevoked) return "Revoked";
    validatePublicSharePositiveVersion(input.expectedRevision);
    if (input.expectedRevision !== this.revision) return "Conflict";
    // Application must verify the same bearer/context cryptographically before this operation.
    const lookupDigest = validatePublicShareLookupDigest(input.lookupDigest);
    const bearerEnvelope = validatePublicShareBearerEnvelope(input.bearerEnvelope);
    const revision = validatePublicSharePositiveVersion(this.revision + 1);
    this.#state = Object.freeze({ ...this.#state, lookupDigest, bearerEnvelope, revision });
    return "Updated";
  }
}
