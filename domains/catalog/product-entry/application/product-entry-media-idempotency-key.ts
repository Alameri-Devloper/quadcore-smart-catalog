import { createHash } from "node:crypto";

export interface ProductEntryMediaIdempotencyIdentity {
  readonly workspaceId: string;
  readonly submissionId: string;
  readonly productId: string;
  readonly requestFingerprint: string;
}

export class ProductEntryMediaIdempotencyKeyService {
  calculate(identity: ProductEntryMediaIdempotencyIdentity): string {
    const canonical = JSON.stringify([
      identity.workspaceId,
      identity.submissionId,
      identity.productId,
      identity.requestFingerprint,
    ]);
    return createHash("sha256").update(canonical, "utf8").digest("hex");
  }
}
