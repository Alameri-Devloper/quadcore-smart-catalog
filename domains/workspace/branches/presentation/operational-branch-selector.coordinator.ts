import type { OperationalBranchPort, OperationalBranchPurpose, OperationalBranchSelection, OperationalBranchState, OperationalBranchView } from "./operational-branch-selector.types";
import { operationalBranchId } from "./operations-query-state";

/** Fresh-work guidance only. The reusable DTO retains inactive returned branches. */
export const freshOperationalBranchEligible = (branch: OperationalBranchView): boolean =>
  branch.status === "Active" && operationalBranchId(branch.branchId) !== null;

export const operationalBranchSelection = (state: OperationalBranchState, purpose: OperationalBranchPurpose, requestedId: string | null): OperationalBranchSelection => {
  if (requestedId === null) return { type: "None" };
  if (state.type !== "Ready" || state.purpose !== purpose) return { type: "Pending" };
  const branch = state.options.find(({ branchId }) => branchId === requestedId);
  if (!branch || !operationalBranchId(requestedId)) return { type: "StaleSelectedBranch" };
  return { type: freshOperationalBranchEligible(branch) ? "Selected" : "Inactive", branch };
};

export class OperationalBranchSelectorCoordinator {
  private state: OperationalBranchState = { type: "Idle" };
  private request?: AbortController;
  private disposed = false;
  private expired = false;
  constructor(private readonly port: OperationalBranchPort, private readonly callbacks: {
    readonly onChange: (state: OperationalBranchState) => void;
    readonly onAuthenticationRequired: () => void;
  }) {}
  get snapshot() { return this.state; }
  private publish(state: OperationalBranchState) {
    if (this.disposed || this.expired) return;
    this.state = state; this.callbacks.onChange(state);
  }
  async load(purpose: OperationalBranchPurpose) {
    if (this.disposed || this.expired) return;
    this.request?.abort();
    const request = this.request = new AbortController();
    // Previous options/selection are unavailable immediately, before the next response.
    this.publish({ type: "Loading", purpose });
    const result = await this.port.list(purpose, request.signal);
    if (this.disposed || this.expired || request !== this.request || request.signal.aborted) return;
    if (!result.ok) {
      this.publish({ type: "Failed", purpose, kind: result.kind });
      if (result.kind === "AuthenticationRequired") { this.expired = true; request.abort(); this.callbacks.onAuthenticationRequired(); }
      return;
    }
    this.publish({ type: "Ready", purpose, options: result.value,
      availability: !result.value.length ? "AuthorizedEmpty" : result.value.every(({ status }) => status === "Inactive") ? "AllInactive" : "Available" });
  }
  dispose() { this.disposed = true; this.request?.abort(); this.state = { type: "Idle" }; }
}

/** Deferred loading avoids a request from React's setup/cleanup probe. */
export const mountOperationalBranchSelector = (port: OperationalBranchPort, purpose: OperationalBranchPurpose,
  callbacks: ConstructorParameters<typeof OperationalBranchSelectorCoordinator>[1]) => {
  const coordinator = new OperationalBranchSelectorCoordinator(port, callbacks);
  void Promise.resolve().then(() => coordinator.load(purpose));
  return coordinator;
};
