import { ActorId, SessionId, WorkspaceId } from "../../../shared/domain/scoped-identity";

export const SESSION_IDLE_TIMEOUT_MS = 2 * 60 * 60 * 1_000;
export const SESSION_ABSOLUTE_TIMEOUT_MS = 12 * 60 * 60 * 1_000;
export const SESSION_LAST_SEEN_THROTTLE_MS = 5 * 60 * 1_000;
export const SESSION_REVOKED_RETENTION_MS = 7 * 24 * 60 * 60 * 1_000;

export type SessionClass = "Restricted" | "Full";

export type SessionRevocationReason =
  | "Logout"
  | "PasswordChanged"
  | "OwnerPasswordReset"
  | "RecoveryCompleted"
  | "AccountSuspended"
  | "AuthorizationChanged"
  | "ReplacedByNewSession"
  | "Expired"
  | "AdministrativeRevocation";

export interface SessionDigestValue {
  readonly value: string;
  readonly keyVersion: number;
}

export interface ServerSessionState {
  readonly workspaceId: WorkspaceId;
  readonly sessionId: SessionId;
  readonly digest: SessionDigestValue;
  readonly actorId: ActorId;
  readonly sessionClass: SessionClass;
  readonly authorizationVersion: number;
  readonly passwordVersion: number;
  readonly createdAt: Date;
  readonly lastSeenAt: Date;
  readonly idleExpiresAt: Date;
  readonly absoluteExpiresAt: Date;
  readonly revokedAt: Date | null;
  readonly revocationReason: SessionRevocationReason | null;
}

export type SessionAvailability = "Active" | "Revoked" | "IdleExpired" | "AbsoluteExpired";

const SESSION_CLASSES: readonly SessionClass[] = ["Restricted", "Full"];
const REVOCATION_REASONS: readonly SessionRevocationReason[] = [
  "Logout",
  "PasswordChanged",
  "OwnerPasswordReset",
  "RecoveryCompleted",
  "AccountSuspended",
  "AuthorizationChanged",
  "ReplacedByNewSession",
  "Expired",
  "AdministrativeRevocation",
];

export class ServerSession {
  private lastSeenAtValue: Date;
  private idleExpiresAtValue: Date;
  private revokedAtValue: Date | null;
  private revocationReasonValue: SessionRevocationReason | null;

  private constructor(private readonly state: ServerSessionState) {
    this.lastSeenAtValue = new Date(state.lastSeenAt);
    this.idleExpiresAtValue = new Date(state.idleExpiresAt);
    this.revokedAtValue = state.revokedAt ? new Date(state.revokedAt) : null;
    this.revocationReasonValue = state.revocationReason;
  }

  static create(input: Omit<ServerSessionState, "lastSeenAt" | "idleExpiresAt" | "absoluteExpiresAt" | "revokedAt" | "revocationReason">): ServerSession {
    const absoluteExpiresAt = new Date(input.createdAt.getTime() + SESSION_ABSOLUTE_TIMEOUT_MS);
    return ServerSession.rehydrate({
      ...input,
      lastSeenAt: input.createdAt,
      idleExpiresAt: new Date(Math.min(input.createdAt.getTime() + SESSION_IDLE_TIMEOUT_MS, absoluteExpiresAt.getTime())),
      absoluteExpiresAt,
      revokedAt: null,
      revocationReason: null,
    });
  }

  static rehydrate(state: ServerSessionState): ServerSession {
    const versionsValid = [state.authorizationVersion, state.passwordVersion, state.digest.keyVersion]
      .every((value) => Number.isSafeInteger(value) && value >= 1);
    const timesValid = state.createdAt <= state.lastSeenAt
      && state.lastSeenAt < state.idleExpiresAt
      && state.idleExpiresAt <= state.absoluteExpiresAt;
    const revocationValid = (state.revokedAt === null) === (state.revocationReason === null)
      && (!state.revokedAt || state.revokedAt >= state.createdAt);
    if (
      !SESSION_CLASSES.includes(state.sessionClass)
      || !versionsValid
      || !/^[a-f0-9]{64}$/.test(state.digest.value)
      || !timesValid
      || !revocationValid
      || (state.revocationReason !== null && !REVOCATION_REASONS.includes(state.revocationReason))
    ) {
      throw new Error("SessionStateInvalid");
    }
    return new ServerSession(state);
  }

  get workspaceId(): WorkspaceId { return this.state.workspaceId; }
  get sessionId(): SessionId { return this.state.sessionId; }
  get digest(): SessionDigestValue { return Object.freeze({ ...this.state.digest }); }
  get actorId(): ActorId { return this.state.actorId; }
  get sessionClass(): SessionClass { return this.state.sessionClass; }
  get authorizationVersion(): number { return this.state.authorizationVersion; }
  get passwordVersion(): number { return this.state.passwordVersion; }
  get createdAt(): Date { return new Date(this.state.createdAt); }
  get lastSeenAt(): Date { return new Date(this.lastSeenAtValue); }
  get idleExpiresAt(): Date { return new Date(this.idleExpiresAtValue); }
  get absoluteExpiresAt(): Date { return new Date(this.state.absoluteExpiresAt); }
  get revokedAt(): Date | null { return this.revokedAtValue ? new Date(this.revokedAtValue) : null; }
  get revocationReason(): SessionRevocationReason | null { return this.revocationReasonValue; }

  availabilityAt(at: Date): SessionAvailability {
    if (this.revokedAtValue) return "Revoked";
    if (at >= this.state.absoluteExpiresAt) return "AbsoluteExpired";
    if (at >= this.idleExpiresAtValue) return "IdleExpired";
    return "Active";
  }

  refreshActivity(at: Date): boolean {
    if (this.availabilityAt(at) !== "Active") return false;
    if (at.getTime() - this.lastSeenAtValue.getTime() < SESSION_LAST_SEEN_THROTTLE_MS) return false;
    this.lastSeenAtValue = new Date(at);
    this.idleExpiresAtValue = new Date(Math.min(
      at.getTime() + SESSION_IDLE_TIMEOUT_MS,
      this.state.absoluteExpiresAt.getTime(),
    ));
    return true;
  }

  revoke(reason: SessionRevocationReason, at: Date): boolean {
    if (this.revokedAtValue) return false;
    if (!REVOCATION_REASONS.includes(reason) || at < this.state.createdAt) {
      throw new Error("SessionRevocationInvalid");
    }
    this.revokedAtValue = new Date(at);
    this.revocationReasonValue = reason;
    return true;
  }

  isCleanupEligible(at: Date, revokedBefore: Date): boolean {
    if (this.revokedAtValue) return this.revokedAtValue <= revokedBefore;
    return this.availabilityAt(at) !== "Active";
  }
}
