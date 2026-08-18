import { ChallengeId } from "../../../shared/domain/scoped-identity";
import { WorkspaceCode } from "../../workspace/domain/workspace";
import { Username } from "../domain/username";
import { commitIdentityTransaction, rollbackIdentityTransaction, type IdentityUnitOfWork } from "../repositories/identity.repositories";
import {
  CompletePasswordRecoveryUseCase,
  CreatePasswordRecoveryChallengeUseCase,
  FinalizeRecoveryDeliveryUseCase,
  ResendPasswordRecoveryChallengeUseCase,
  VerifyPasswordRecoveryChallengeUseCase,
  type TrustedRecoveryDelivery,
} from "./password-recovery.use-cases";
import type {
  IdentityClock,
  IdentityIdentifierGenerator,
  PublicRecoveryFlowToken,
  PublicRecoveryFlowTokenPort,
  PublicRecoveryOperation,
  PublicRecoveryTimingPort,
  RecoveryDeliveryPort,
  RecoveryDeliveryResult,
  RecoveryRequestCostPort,
} from "./ports";
import { RECOVERY_RESEND_INTERVAL_MS } from "../domain/password-recovery-challenge";

export type PublicRecoveryRequestResult =
  | { readonly type: "RecoveryRequestAccepted"; readonly recoveryReference: string; readonly retryAfterSeconds: 60 }
  | { readonly type: "RecoveryRequestInvalid" }
  | { readonly type: "RecoveryUnavailable" };

export type PublicRecoveryResendResult =
  | { readonly type: "RecoveryResendAccepted"; readonly recoveryReference: string; readonly retryAfterSeconds: 60 }
  | { readonly type: "RecoveryResendThrottled"; readonly retryAfterSeconds: 60 }
  | { readonly type: "RecoveryFlowInvalid" }
  | { readonly type: "RecoveryUnavailable" };

export type PublicRecoveryVerifyResult =
  | { readonly type: "RecoveryCodeVerified"; readonly recoveryReference: string }
  | { readonly type: "RecoveryCodeInvalidOrExpired" }
  | { readonly type: "RecoveryUnavailable" };

export type PublicRecoveryResetResult =
  | { readonly type: "RecoveryResetCompleted" }
  | { readonly type: "RecoveryResetInvalid" }
  | { readonly type: "RecoveryResetConflict" }
  | { readonly type: "RecoveryUnavailable" };

interface ResolvedReference {
  readonly workspaceId: string;
  readonly challengeId: string;
}

const safeDeliveryFailure = (): RecoveryDeliveryResult => ({ ok: false, error: "TemporaryFailure" });

export class PublicPasswordRecoveryService {
  constructor(
    private readonly unitOfWork: IdentityUnitOfWork,
    private readonly createChallenge: CreatePasswordRecoveryChallengeUseCase,
    private readonly resendChallenge: ResendPasswordRecoveryChallengeUseCase,
    private readonly verifyChallenge: VerifyPasswordRecoveryChallengeUseCase,
    private readonly completeRecovery: CompletePasswordRecoveryUseCase,
    private readonly finalizeDelivery: FinalizeRecoveryDeliveryUseCase,
    private readonly delivery: RecoveryDeliveryPort,
    private readonly genericCost: RecoveryRequestCostPort,
    private readonly flowAuthority: PublicRecoveryFlowTokenPort,
    private readonly timing: PublicRecoveryTimingPort,
    private readonly identifiers: IdentityIdentifierGenerator,
    private readonly clock: IdentityClock,
  ) {}

  get available(): boolean { return this.delivery.available; }

  async request(input: { readonly workspaceCode: string; readonly username: string }): Promise<PublicRecoveryRequestResult> {
    let workspaceCode: WorkspaceCode;
    let username: Username;
    try {
      workspaceCode = WorkspaceCode.create(input.workspaceCode);
      username = Username.create(input.username);
    } catch {
      return { type: "RecoveryRequestInvalid" };
    }
    const startedAt = this.clock.now();
    return this.withTiming("Request", startedAt, async () => {
      if (!this.delivery.available) return { type: "RecoveryUnavailable" };
      try { await this.genericCost.perform(); }
      catch { return { type: "RecoveryUnavailable" }; }

      const decoyChallengeId = this.identifiers.challengeId();
      let resolved: { readonly workspaceId: string; readonly actorId: string } | null;
      try {
        resolved = await this.unitOfWork.execute(async (context) => {
          const workspace = await context.workspaceRepository.findByCode(workspaceCode);
          if (!workspace || workspace.passwordRecoveryPolicy !== "WhatsAppOtpWithOwnerFallback") {
            return rollbackIdentityTransaction(null);
          }
          const account = await context.accountRepository.findByUsername(workspace.workspaceId, username);
          if (!account || account.status === "Suspended") return rollbackIdentityTransaction(null);
          const profile = await context.memberProfileRepository.findByActorId(workspace.workspaceId, account.actorId);
          if (!profile) return rollbackIdentityTransaction(null);
          return commitIdentityTransaction({ workspaceId: workspace.workspaceId.value, actorId: account.actorId.value });
        });
      } catch {
        return { type: "RecoveryUnavailable" };
      }
      if (!resolved) return this.acceptedFlow("Decoy", decoyChallengeId, startedAt);

      const prepared = await this.createChallenge.execute(resolved);
      if (!prepared.ok) return this.acceptedFlow("Decoy", decoyChallengeId, startedAt);
      const finalized = await this.deliver(prepared.value);
      return finalized
        ? this.acceptedFlow("Real", prepared.value.challengeId, startedAt)
        : this.acceptedFlow("Decoy", decoyChallengeId, startedAt);
    });
  }

  async resend(input: { readonly recoveryReference: string }): Promise<PublicRecoveryResendResult> {
    const startedAt = this.clock.now();
    return this.withTiming("Resend", startedAt, async () => {
      if (!this.delivery.available) return { type: "RecoveryUnavailable" };
      const flow = this.flowAuthority.read(input.recoveryReference);
      if (!flow) return { type: "RecoveryFlowInvalid" };
      if (startedAt.getTime() - flow.issuedAt.getTime() < RECOVERY_RESEND_INTERVAL_MS) {
        return { type: "RecoveryResendThrottled", retryAfterSeconds: 60 };
      }
      const decoyChallengeId = this.identifiers.challengeId();
      if (flow.kind === "Decoy") return this.resentFlow("Decoy", decoyChallengeId, startedAt);
      const resolved = await this.resolveReference(flow.challengeId);
      if (!resolved || resolved === "Unavailable") return this.resentFlow("Decoy", decoyChallengeId, startedAt);
      const prepared = await this.resendChallenge.execute(resolved);
      if (!prepared.ok) return this.resentFlow("Decoy", decoyChallengeId, startedAt);
      const finalized = await this.deliver(prepared.value);
      return finalized
        ? this.resentFlow("Real", prepared.value.challengeId, startedAt)
        : this.resentFlow("Decoy", decoyChallengeId, startedAt);
    });
  }

  async verify(input: { readonly recoveryReference: string; readonly otp: string }): Promise<PublicRecoveryVerifyResult> {
    const startedAt = this.clock.now();
    return this.withTiming("Verify", startedAt, async () => {
      const flow = this.flowAuthority.read(input.recoveryReference);
      if (!flow || flow.kind === "Decoy") return { type: "RecoveryCodeInvalidOrExpired" };
      const resolved = await this.resolveReference(flow.challengeId);
      if (resolved === "Unavailable") return { type: "RecoveryUnavailable" };
      if (!resolved) return { type: "RecoveryCodeInvalidOrExpired" };
      const result = await this.verifyChallenge.execute({ ...resolved, code: input.otp });
      if (result.ok) return { type: "RecoveryCodeVerified", recoveryReference: input.recoveryReference };
      return result.error === "InfrastructureUnavailable"
        ? { type: "RecoveryUnavailable" }
        : { type: "RecoveryCodeInvalidOrExpired" };
    });
  }

  async reset(input: { readonly recoveryReference: string; readonly newPassword: string }): Promise<PublicRecoveryResetResult> {
    const startedAt = this.clock.now();
    return this.withTiming("Reset", startedAt, async () => {
      const flow = this.flowAuthority.read(input.recoveryReference);
      if (!flow || flow.kind === "Decoy") return { type: "RecoveryResetInvalid" };
      const resolved = await this.resolveReference(flow.challengeId);
      if (resolved === "Unavailable") return { type: "RecoveryUnavailable" };
      if (!resolved) return { type: "RecoveryResetInvalid" };
      const result = await this.completeRecovery.execute(Object.freeze({ ...resolved, ...input }));
      if (result.ok) return { type: "RecoveryResetCompleted" };
      if (result.error === "PasswordInvalid") return { type: "RecoveryResetInvalid" };
      if (result.error === "CredentialUpdateConflict") return { type: "RecoveryResetConflict" };
      return result.error === "InfrastructureUnavailable"
        ? { type: "RecoveryUnavailable" }
        : { type: "RecoveryResetInvalid" };
    });
  }

  private acceptedFlow(kind: PublicRecoveryFlowToken["kind"], challengeId: string, issuedAt: Date): PublicRecoveryRequestResult {
    return {
      type: "RecoveryRequestAccepted",
      recoveryReference: this.flowAuthority.issue({ kind, challengeId, issuedAt }),
      retryAfterSeconds: 60,
    };
  }

  private resentFlow(kind: PublicRecoveryFlowToken["kind"], challengeId: string, issuedAt: Date): PublicRecoveryResendResult {
    return {
      type: "RecoveryResendAccepted",
      recoveryReference: this.flowAuthority.issue({ kind, challengeId, issuedAt }),
      retryAfterSeconds: 60,
    };
  }

  private async withTiming<T>(operation: PublicRecoveryOperation, startedAt: Date, work: () => Promise<T>): Promise<T> {
    try { return await work(); }
    finally { await this.timing.waitForMinimum(operation, startedAt); }
  }

  private async resolveReference(reference: string): Promise<ResolvedReference | null | "Unavailable"> {
    let challengeId: ChallengeId;
    try {
      if (!/^[A-Za-z0-9-]{20,200}$/.test(reference)) return null;
      challengeId = ChallengeId.create(reference);
    } catch {
      return null;
    }
    try {
      return await this.unitOfWork.execute(async (context) => {
        const challenge = await context.passwordRecoveryChallengeRepository.findByPublicReference(challengeId);
        if (!challenge) return rollbackIdentityTransaction(null);
        return commitIdentityTransaction({
          workspaceId: challenge.workspaceId.value,
          challengeId: challenge.challengeId.value,
        });
      });
    } catch {
      return "Unavailable";
    }
  }

  private async deliver(prepared: TrustedRecoveryDelivery): Promise<boolean> {
    const startedAt = this.clock.now().getTime();
    let result: RecoveryDeliveryResult;
    try {
      result = await this.delivery.deliverCode({
        workspaceId: prepared.workspaceId,
        workspaceDisplayName: prepared.workspaceDisplayName,
        recoveryReference: prepared.challengeId,
        idempotencyKey: prepared.deliveryIdempotencyKey,
        channel: prepared.channel,
        destination: prepared.destination,
        locale: prepared.locale,
        code: prepared.code,
        expiresAt: prepared.expiresAt,
      });
    } catch {
      result = safeDeliveryFailure();
    }
    const finalized = await this.finalizeDelivery.execute({
      workspaceId: prepared.workspaceId,
      challengeId: prepared.challengeId,
      adapterName: this.delivery.adapterName,
      latencyMs: this.clock.now().getTime() - startedAt,
      result,
    });
    return finalized.ok;
  }
}
