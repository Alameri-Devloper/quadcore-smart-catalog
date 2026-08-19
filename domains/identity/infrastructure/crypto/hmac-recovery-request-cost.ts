import type { RecoveryCodeDigest, RecoveryCodeGenerator, RecoveryRequestCostPort } from "../../application/ports";

export class HmacRecoveryRequestCost implements RecoveryRequestCostPort {
  constructor(
    private readonly codes: RecoveryCodeGenerator,
    private readonly digest: RecoveryCodeDigest,
  ) {}

  async perform(): Promise<void> {
    await this.digest.create(this.codes.generate());
  }
}
