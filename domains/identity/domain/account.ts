import { ActorId, WorkspaceId } from "../../../shared/domain/scoped-identity";
import { Username } from "./username";

export type AccountStatus = "PendingActivation" | "Active" | "Suspended";

export interface AccountState {
  readonly workspaceId: WorkspaceId;
  readonly actorId: ActorId;
  readonly username: Username;
  readonly status: AccountStatus;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const ACCOUNT_STATUSES: readonly AccountStatus[] = ["PendingActivation", "Active", "Suspended"];

export class Account {
  private statusValue: AccountStatus;
  private updatedAtValue: Date;

  private constructor(private readonly state: AccountState) {
    this.statusValue = state.status;
    this.updatedAtValue = new Date(state.updatedAt);
  }

  static create(input: Omit<AccountState, "status" | "updatedAt">): Account {
    return new Account({ ...input, status: "PendingActivation", updatedAt: input.createdAt });
  }

  static rehydrate(input: AccountState): Account {
    if (!ACCOUNT_STATUSES.includes(input.status) || input.createdAt > input.updatedAt) {
      throw new Error("AccountStateInvalid");
    }
    return new Account(input);
  }

  get workspaceId(): WorkspaceId { return this.state.workspaceId; }
  get actorId(): ActorId { return this.state.actorId; }
  get username(): Username { return this.state.username; }
  get status(): AccountStatus { return this.statusValue; }
  get createdAt(): Date { return new Date(this.state.createdAt); }
  get updatedAt(): Date { return new Date(this.updatedAtValue); }

  activate(at: Date): void {
    if (this.statusValue !== "PendingActivation") throw new Error("AccountTransitionInvalid");
    this.transition("Active", at);
  }

  suspend(at: Date): void {
    if (this.statusValue === "Suspended") throw new Error("AccountTransitionInvalid");
    this.transition("Suspended", at);
  }

  reactivate(at: Date): void {
    if (this.statusValue !== "Suspended") throw new Error("AccountTransitionInvalid");
    this.transition("Active", at);
  }

  private transition(status: AccountStatus, at: Date): void {
    if (at < this.updatedAtValue) throw new Error("AccountTimestampInvalid");
    this.statusValue = status;
    this.updatedAtValue = new Date(at);
  }
}
