import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { PasswordHash } from "./password";

export type PasswordLifecycle = "Temporary" | "Permanent";

export interface PasswordCredentialState {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly passwordHash: PasswordHash;
  readonly lifecycle: PasswordLifecycle;
  readonly passwordVersion: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export class PasswordCredential {
  private hashValue: PasswordHash;
  private lifecycleValue: PasswordLifecycle;
  private versionValue: number;
  private updatedAtValue: Date;

  private constructor(private readonly state: PasswordCredentialState) {
    this.hashValue = state.passwordHash;
    this.lifecycleValue = state.lifecycle;
    this.versionValue = state.passwordVersion;
    this.updatedAtValue = new Date(state.updatedAt);
  }

  static createTemporary(input: Omit<PasswordCredentialState, "lifecycle" | "passwordVersion" | "updatedAt">): PasswordCredential {
    return new PasswordCredential({
      ...input,
      lifecycle: "Temporary",
      passwordVersion: 1,
      updatedAt: input.createdAt,
    });
  }

  static rehydrate(input: PasswordCredentialState): PasswordCredential {
    if (
      !["Temporary", "Permanent"].includes(input.lifecycle)
      || !Number.isSafeInteger(input.passwordVersion)
      || input.passwordVersion < 1
      || input.createdAt > input.updatedAt
    ) {
      throw new Error("PasswordCredentialStateInvalid");
    }
    return new PasswordCredential(input);
  }

  get workspaceId(): WorkspaceId { return this.state.workspaceId; }
  get actorId(): ActorId { return this.state.actorId; }
  get passwordHash(): PasswordHash { return this.hashValue; }
  get lifecycle(): PasswordLifecycle { return this.lifecycleValue; }
  get passwordVersion(): number { return this.versionValue; }
  get createdAt(): Date { return new Date(this.state.createdAt); }
  get updatedAt(): Date { return new Date(this.updatedAtValue); }

  replace(hash: PasswordHash, lifecycle: PasswordLifecycle, at: Date): number {
    if (at < this.updatedAtValue || this.versionValue >= Number.MAX_SAFE_INTEGER) {
      throw new Error("PasswordCredentialUpdateInvalid");
    }
    const expectedVersion = this.versionValue;
    this.hashValue = hash;
    this.lifecycleValue = lifecycle;
    this.versionValue += 1;
    this.updatedAtValue = new Date(at);
    return expectedVersion;
  }
}
