import type { ListingAction, ListingPort, ListingResource, ListingResult, ListingState } from "./listing.types";

export const initialListingState = (): ListingState => ({ detail: { type: "Idle" }, intent: null, pending: false, reviewRequired: false, failure: null, saved: false });
export class ListingCoordinator {
  private state = initialListingState();
  private disposed = false;
  private expired = false;
  private read?: AbortController;
  private write?: AbortController;
  constructor(private readonly port: ListingPort, private readonly resource: ListingResource, private readonly callbacks: {
    readonly onChange: (state: ListingState) => void;
    readonly onAuthenticationRequired: () => void;
    readonly onResourceStale?: () => void;
  }, private readonly inspectionOnly = false) {}
  get snapshot() { return this.state; }
  private publish(patch: Partial<ListingState>) {
    if (this.disposed || this.expired) return;
    this.state = { ...this.state, ...patch }; this.callbacks.onChange(this.state);
  }
  private current(request: AbortController, active: AbortController | undefined) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === active;
  }
  private authenticate<T>(result: ListingResult<T>) {
    if (result.ok || result.kind !== "AuthenticationRequired") return false;
    this.read?.abort(); this.write?.abort();
    this.publish({ ...initialListingState(), detail: { type: "Failed", kind: "AuthenticationRequired" } });
    this.expired = true; this.callbacks.onAuthenticationRequired(); return true;
  }
  async load() {
    if (this.disposed || this.expired || this.state.pending) return;
    await this.refetch();
  }
  private async refetch() {
    this.read?.abort(); const request = this.read = new AbortController();
    this.publish({ detail: { type: "Loading" } });
    const result = await this.port.get(this.resource, request.signal);
    if (!this.current(request, this.read) || this.authenticate(result)) return;
    this.publish({ detail: result.ok ? { type: "Ready", value: result.value } : { type: "Failed", kind: result.kind } });
  }
  choose(action: ListingAction) {
    if (this.disposed || this.expired || this.inspectionOnly || this.state.pending || this.state.intent !== null || this.state.detail.type !== "Ready"
      || !this.state.detail.value.allowedActions.includes(action)) return;
    this.publish({ intent: action, reviewRequired: false, failure: null, saved: false });
  }
  cancel() { if (!this.state.pending) this.publish({ intent: null, reviewRequired: false, failure: null }); }
  reviewLatest() {
    if (!this.state.pending && this.state.detail.type === "Ready" && this.state.intent
      && this.state.detail.value.allowedActions.includes(this.state.intent)) this.publish({ reviewRequired: false, failure: null });
  }
  async submit() {
    const { detail, intent } = this.state;
    if (this.disposed || this.expired || this.inspectionOnly || this.state.pending || this.state.reviewRequired || !intent
      || detail.type !== "Ready" || !detail.value.allowedActions.includes(intent)) return;
    const request = this.write = new AbortController();
    this.publish({ pending: true, failure: null, saved: false });
    const result = await this.port.set(this.resource, { listingStatus: intent === "SetListed" ? "Listed" : "Unlisted",
      expectedRevision: detail.value.revision }, request.signal);
    if (!this.current(request, this.write) || this.authenticate(result)) return;
    if (result.ok) {
      // PUT is an acknowledgement, never the rendered resource/action authority.
      this.publish({ intent: null, reviewRequired: false, saved: true, detail: { type: "Loading" } });
      await this.refetch();
    } else {
      this.publish({ failure: result.kind, reviewRequired: true, detail: { type: "Loading" } });
      // Even uncertain writes require a new read and deliberate review; never replay automatically.
      await this.refetch();
      if (this.current(request, this.write) && (result.kind === "BranchInactive" || result.kind === "ProductArchived"
        || result.kind === "BranchNotFound" || result.kind === "ProductNotFound")) this.callbacks.onResourceStale?.();
    }
    if (this.current(request, this.write)) this.publish({ pending: false });
  }
  dispose() {
    this.disposed = true; this.read?.abort(); this.write?.abort(); this.state = initialListingState();
  }
}
