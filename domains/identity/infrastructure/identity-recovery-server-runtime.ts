import { createPlatformDatabaseConnection } from "../../../shared/infrastructure/persistence/database";
import { CompletePasswordRecoveryUseCase, CreatePasswordRecoveryChallengeUseCase, FinalizeRecoveryDeliveryUseCase, ResendPasswordRecoveryChallengeUseCase, VerifyPasswordRecoveryChallengeUseCase } from "../application/password-recovery.use-cases";
import { PublicPasswordRecoveryService } from "../application/public-password-recovery.service";
import type { RecoveryDeliveryPort } from "../application/ports";
import { Argon2idPasswordHasher } from "./crypto/argon2-password-hasher";
import { createEnvironmentRecoveryCodeDigest } from "./crypto/environment-recovery-code-digest";
import { CryptographicRecoveryCodeGenerator } from "./crypto/hmac-recovery-code-digest";
import { HmacRecoveryRequestCost } from "./crypto/hmac-recovery-request-cost";
import { createEnvironmentPublicRecoveryFlowToken } from "./crypto/aes-gcm-public-recovery-flow-token";
import { SameOriginRequestPolicy, sameOriginPolicyFromEnvironment } from "./http/same-origin-request-policy";
import { PostgreSqlIdentityUnitOfWork } from "./persistence/postgresql-identity-unit-of-work";
import { recoveryDeliveryFromEnvironment } from "./recovery-delivery/environment-recovery-delivery";
import { RandomIdentityIdentifierGenerator, SystemIdentityClock } from "./system-identity-adapters";
import { createEnvironmentPublicRecoveryTiming } from "./public-recovery-timing";

export interface IdentityRecoveryServerApplication {
  readonly recovery: Pick<PublicPasswordRecoveryService, "available" | "request" | "resend" | "verify" | "reset">;
  readonly origin: SameOriginRequestPolicy;
  close(): Promise<void>;
}

export type IdentityRecoveryServerApplicationFactory = () => IdentityRecoveryServerApplication;

export const openIdentityRecoveryServerApplication = (
  delivery: RecoveryDeliveryPort = recoveryDeliveryFromEnvironment(),
): IdentityRecoveryServerApplication => {
  const connection = createPlatformDatabaseConnection();
  try {
    const unitOfWork = new PostgreSqlIdentityUnitOfWork(connection.database);
    const clock = new SystemIdentityClock();
    const identifiers = new RandomIdentityIdentifierGenerator();
    const digest = createEnvironmentRecoveryCodeDigest();
    const codes = new CryptographicRecoveryCodeGenerator();
    const create = new CreatePasswordRecoveryChallengeUseCase(unitOfWork, digest, codes, clock, identifiers);
    const resend = new ResendPasswordRecoveryChallengeUseCase(unitOfWork, digest, codes, clock, identifiers);
    const verify = new VerifyPasswordRecoveryChallengeUseCase(unitOfWork, digest, clock);
    const complete = new CompletePasswordRecoveryUseCase(unitOfWork, new Argon2idPasswordHasher(), clock);
    const finalize = new FinalizeRecoveryDeliveryUseCase(unitOfWork, clock);
    return Object.freeze({
      recovery: new PublicPasswordRecoveryService(
        unitOfWork,
        create,
        resend,
        verify,
        complete,
        finalize,
        delivery,
        new HmacRecoveryRequestCost(codes, digest),
        createEnvironmentPublicRecoveryFlowToken(clock),
        createEnvironmentPublicRecoveryTiming(),
        identifiers,
        clock,
      ),
      origin: sameOriginPolicyFromEnvironment(),
      close: () => connection.close(),
    });
  } catch (error) {
    void connection.close();
    throw error;
  }
};
