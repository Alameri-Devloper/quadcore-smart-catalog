import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";

export const LOGIN_FAILURE_LIMIT = 5;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1_000;
export const INITIAL_LOCK_DURATION_MS = 5 * 60 * 1_000;
export const MAX_LOCK_DURATION_MS = 60 * 60 * 1_000;

export interface LoginProtectionState {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly failedAttemptCount: number;
  readonly failureWindowStartedAt: Date | null;
  readonly lockedUntil: Date | null;
  readonly lockLevel: number;
  readonly lastFailedAt: Date | null;
  readonly updatedAt: Date;
}

export type LoginFailureOutcome = "FailureRecorded" | "Locked" | "AlreadyLocked";

export class LoginProtection {
  private failedAttemptCountValue: number;
  private failureWindowStartedAtValue: Date | null;
  private lockedUntilValue: Date | null;
  private lockLevelValue: number;
  private lastFailedAtValue: Date | null;
  private updatedAtValue: Date;

  private constructor(private readonly state: LoginProtectionState) {
    this.failedAttemptCountValue = state.failedAttemptCount;
    this.failureWindowStartedAtValue = state.failureWindowStartedAt ? new Date(state.failureWindowStartedAt) : null;
    this.lockedUntilValue = state.lockedUntil ? new Date(state.lockedUntil) : null;
    this.lockLevelValue = state.lockLevel;
    this.lastFailedAtValue = state.lastFailedAt ? new Date(state.lastFailedAt) : null;
    this.updatedAtValue = new Date(state.updatedAt);
  }

  static create(workspaceId: WorkspaceId, actorId: ActorId, at: Date): LoginProtection {
    return new LoginProtection({
      workspaceId,
      actorId,
      failedAttemptCount: 0,
      failureWindowStartedAt: null,
      lockedUntil: null,
      lockLevel: 0,
      lastFailedAt: null,
      updatedAt: at,
    });
  }

  static rehydrate(state: LoginProtectionState): LoginProtection {
    if (
      !Number.isSafeInteger(state.failedAttemptCount)
      || state.failedAttemptCount < 0
      || state.failedAttemptCount >= LOGIN_FAILURE_LIMIT
      || !Number.isSafeInteger(state.lockLevel)
      || state.lockLevel < 0
    ) {
      throw new Error("LoginProtectionStateInvalid");
    }
    return new LoginProtection(state);
  }

  get workspaceId(): WorkspaceId { return this.state.workspaceId; }
  get actorId(): ActorId { return this.state.actorId; }
  get failedAttemptCount(): number { return this.failedAttemptCountValue; }
  get failureWindowStartedAt(): Date | null { return this.failureWindowStartedAtValue ? new Date(this.failureWindowStartedAtValue) : null; }
  get lockedUntil(): Date | null { return this.lockedUntilValue ? new Date(this.lockedUntilValue) : null; }
  get lockLevel(): number { return this.lockLevelValue; }
  get lastFailedAt(): Date | null { return this.lastFailedAtValue ? new Date(this.lastFailedAtValue) : null; }
  get updatedAt(): Date { return new Date(this.updatedAtValue); }

  isLocked(at: Date): boolean {
    return this.lockedUntilValue !== null && this.lockedUntilValue > at;
  }

  registerFailure(at: Date): LoginFailureOutcome {
    if (at < this.updatedAtValue) throw new Error("LoginProtectionTimestampInvalid");
    if (this.isLocked(at)) return "AlreadyLocked";

    const windowExpired = this.failureWindowStartedAtValue === null
      || at.getTime() - this.failureWindowStartedAtValue.getTime() >= LOGIN_FAILURE_WINDOW_MS;
    if (windowExpired) {
      this.failureWindowStartedAtValue = new Date(at);
      this.failedAttemptCountValue = 1;
    } else {
      this.failedAttemptCountValue += 1;
    }
    this.lastFailedAtValue = new Date(at);
    this.updatedAtValue = new Date(at);

    if (this.failedAttemptCountValue < LOGIN_FAILURE_LIMIT) return "FailureRecorded";

    this.lockLevelValue += 1;
    const duration = Math.min(
      INITIAL_LOCK_DURATION_MS * (2 ** (this.lockLevelValue - 1)),
      MAX_LOCK_DURATION_MS,
    );
    this.lockedUntilValue = new Date(at.getTime() + duration);
    this.failedAttemptCountValue = 0;
    this.failureWindowStartedAtValue = null;
    return "Locked";
  }

  clear(at: Date): void {
    if (at < this.updatedAtValue) throw new Error("LoginProtectionTimestampInvalid");
    this.failedAttemptCountValue = 0;
    this.failureWindowStartedAtValue = null;
    this.lockedUntilValue = null;
    this.lockLevelValue = 0;
    this.lastFailedAtValue = null;
    this.updatedAtValue = new Date(at);
  }
}
