import { ActorId, ChallengeId, WorkspaceId } from "../../../shared/domain/scoped-identity";

export const RECOVERY_CODE_DIGITS = 8;
export const RECOVERY_CHALLENGE_VALIDITY_MS = 10 * 60 * 1_000;
export const RECOVERY_CHALLENGE_MAX_ATTEMPTS = 5;
export const RECOVERY_RESEND_INTERVAL_MS = 60 * 1_000;
export const RECOVERY_SEND_WINDOW_MS = 60 * 60 * 1_000;
export const RECOVERY_MAX_SENDS_PER_WINDOW = 3;

export type RecoveryChannel = "PrimaryRecoveryContact";
export type RecoveryChallengeStatus = "Active" | "Verified" | "Consumed" | "Invalidated" | "Expired";

export interface RecoveryCodeDigestValue {
  readonly value: string;
  readonly keyVersion: number;
}

export interface PasswordRecoveryChallengeState {
  readonly workspaceId: WorkspaceId;
  readonly challengeId: ChallengeId;
  readonly actorId: ActorId;
  readonly channel: RecoveryChannel;
  readonly destinationVersion: number;
  readonly digest: RecoveryCodeDigestValue;
  readonly status: RecoveryChallengeStatus;
  readonly attemptCount: number;
  readonly createdAt: Date;
  readonly expiresAt: Date;
  readonly verifiedAt: Date | null;
  readonly consumedAt: Date | null;
  readonly invalidatedAt: Date | null;
}

export class PasswordRecoveryChallenge {
  private statusValue: RecoveryChallengeStatus;
  private attemptCountValue: number;
  private verifiedAtValue: Date | null;
  private consumedAtValue: Date | null;
  private invalidatedAtValue: Date | null;

  private constructor(private readonly state: PasswordRecoveryChallengeState) {
    this.statusValue = state.status;
    this.attemptCountValue = state.attemptCount;
    this.verifiedAtValue = state.verifiedAt ? new Date(state.verifiedAt) : null;
    this.consumedAtValue = state.consumedAt ? new Date(state.consumedAt) : null;
    this.invalidatedAtValue = state.invalidatedAt ? new Date(state.invalidatedAt) : null;
  }

  static create(input: Omit<PasswordRecoveryChallengeState, "status" | "attemptCount" | "expiresAt" | "verifiedAt" | "consumedAt" | "invalidatedAt">): PasswordRecoveryChallenge {
    if (!Number.isSafeInteger(input.destinationVersion) || input.destinationVersion < 1) {
      throw new Error("RecoveryDestinationVersionInvalid");
    }
    return new PasswordRecoveryChallenge({
      ...input,
      status: "Active",
      attemptCount: 0,
      expiresAt: new Date(input.createdAt.getTime() + RECOVERY_CHALLENGE_VALIDITY_MS),
      verifiedAt: null,
      consumedAt: null,
      invalidatedAt: null,
    });
  }

  static rehydrate(state: PasswordRecoveryChallengeState): PasswordRecoveryChallenge {
    if (
      !["Active", "Verified", "Consumed", "Invalidated", "Expired"].includes(state.status)
      || !Number.isSafeInteger(state.attemptCount)
      || state.attemptCount < 0
      || state.attemptCount > RECOVERY_CHALLENGE_MAX_ATTEMPTS
      || state.expiresAt <= state.createdAt
    ) {
      throw new Error("RecoveryChallengeStateInvalid");
    }
    return new PasswordRecoveryChallenge(state);
  }

  get workspaceId(): WorkspaceId { return this.state.workspaceId; }
  get challengeId(): ChallengeId { return this.state.challengeId; }
  get actorId(): ActorId { return this.state.actorId; }
  get channel(): RecoveryChannel { return this.state.channel; }
  get destinationVersion(): number { return this.state.destinationVersion; }
  get digest(): RecoveryCodeDigestValue { return this.state.digest; }
  get status(): RecoveryChallengeStatus { return this.statusValue; }
  get attemptCount(): number { return this.attemptCountValue; }
  get createdAt(): Date { return new Date(this.state.createdAt); }
  get expiresAt(): Date { return new Date(this.state.expiresAt); }
  get verifiedAt(): Date | null { return this.verifiedAtValue ? new Date(this.verifiedAtValue) : null; }
  get consumedAt(): Date | null { return this.consumedAtValue ? new Date(this.consumedAtValue) : null; }
  get invalidatedAt(): Date | null { return this.invalidatedAtValue ? new Date(this.invalidatedAtValue) : null; }

  expireIfNeeded(at: Date): boolean {
    if ((this.statusValue === "Active" || this.statusValue === "Verified") && at >= this.state.expiresAt) {
      this.statusValue = "Expired";
      return true;
    }
    return false;
  }

  recordFailedVerification(at: Date): "FailureRecorded" | "AttemptsExceeded" | "Expired" {
    if (this.expireIfNeeded(at)) return "Expired";
    if (this.statusValue !== "Active") throw new Error(`RecoveryChallenge${this.statusValue}`);
    this.attemptCountValue += 1;
    if (this.attemptCountValue >= RECOVERY_CHALLENGE_MAX_ATTEMPTS) {
      this.statusValue = "Invalidated";
      this.invalidatedAtValue = new Date(at);
      return "AttemptsExceeded";
    }
    return "FailureRecorded";
  }

  verify(at: Date): void {
    if (this.expireIfNeeded(at)) throw new Error("RecoveryChallengeExpired");
    if (this.statusValue !== "Active") throw new Error(`RecoveryChallenge${this.statusValue}`);
    this.statusValue = "Verified";
    this.verifiedAtValue = new Date(at);
  }

  consume(at: Date): void {
    if (this.expireIfNeeded(at)) throw new Error("RecoveryChallengeExpired");
    if (this.statusValue !== "Verified") throw new Error("RecoveryChallengeNotVerified");
    this.statusValue = "Consumed";
    this.consumedAtValue = new Date(at);
  }

  invalidate(at: Date): boolean {
    if (!["Active", "Verified"].includes(this.statusValue)) return false;
    this.statusValue = "Invalidated";
    this.invalidatedAtValue = new Date(at);
    return true;
  }
}
