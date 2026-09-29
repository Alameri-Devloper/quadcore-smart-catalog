import type {
  WorkspaceMoneyView, WorkspacePricingAction, WorkspacePricingField,
  WorkspacePricingManagementView, WorkspacePricingPort, WorkspacePricingResult, WorkspacePricingSlot, WorkspacePricingState,
} from "./workspace-pricing.types";

export type WorkspacePricingSurface = "prices" | "reference-cost";
export const initialWorkspacePricingState = (): WorkspacePricingState => ({
  detail: { type: "Idle" }, intent: null, pendingField: null, reviewRequired: false,
  failure: null, validation: null, savedField: null,
});

export const validAmountMinor = (value: string): boolean => /^(?:0|[1-9]\d*)$/u.test(value)
  && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER);
export const validCurrencyDraft = (value: string): boolean => /^[A-Z]{3}$/u.test(value);

const projectSurface = (value: WorkspacePricingManagementView, surface: WorkspacePricingSurface): WorkspacePricingManagementView => surface === "prices"
  ? Object.freeze({ productId: value.productId, productRevision: value.productRevision,
    ...(value.retail ? { retail: value.retail } : {}), ...(value.wholesale ? { wholesale: value.wholesale } : {}) })
  : Object.freeze({ productId: value.productId, productRevision: value.productRevision,
    ...(value.referenceCost ? { referenceCost: value.referenceCost } : {}) });

const slotOf = (value: WorkspacePricingManagementView, field: WorkspacePricingField): WorkspacePricingSlot | undefined =>
  field === "Retail" ? value.retail : field === "Wholesale" ? value.wholesale : value.referenceCost;

export class WorkspacePricingCoordinator {
  private state = initialWorkspacePricingState();
  private disposed = false;
  private expired = false;
  private read?: AbortController;
  private write?: AbortController;
  constructor(private readonly port: WorkspacePricingPort, private readonly productId: string, private readonly surface: WorkspacePricingSurface,
    private readonly callbacks: { readonly onChange: (state: WorkspacePricingState) => void; readonly onAuthenticationRequired: () => void;
      readonly onProductStale?: () => void }) {}
  get snapshot() { return this.state; }
  private publish(patch: Partial<WorkspacePricingState>) {
    if (this.disposed || this.expired) return;
    this.state = { ...this.state, ...patch }; this.callbacks.onChange(this.state);
  }
  private current(request: AbortController, active: AbortController | undefined) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === active;
  }
  private authenticate<T>(result: WorkspacePricingResult<T>) {
    if (result.ok || result.kind !== "AuthenticationRequired") return false;
    this.read?.abort(); this.write?.abort();
    this.publish({ ...initialWorkspacePricingState(), detail: { type: "Failed", kind: "AuthenticationRequired" } });
    this.expired = true; this.callbacks.onAuthenticationRequired(); return true;
  }
  async load() {
    if (this.disposed || this.expired || this.state.pendingField) return;
    await this.refetch();
  }
  private async refetch() {
    this.read?.abort(); const request = this.read = new AbortController();
    this.publish({ detail: { type: "Loading" } });
    const result = await this.port.get(this.productId, request.signal);
    if (!this.current(request, this.read) || this.authenticate(result)) return;
    this.publish({ detail: result.ok ? { type: "Ready", value: projectSurface(result.value, this.surface) }
      : { type: "Failed", kind: result.kind } });
  }
  choose(field: WorkspacePricingField, action: WorkspacePricingAction, draft?: WorkspaceMoneyView) {
    const detail = this.state.detail;
    if (this.disposed || this.expired || this.state.pendingField || detail.type !== "Ready") return;
    const slot = slotOf(detail.value, field);
    if (!slot?.allowedActions.includes(action) || (this.surface === "prices") !== (field !== "ReferenceCost")) return;
    if (action === "Set") {
      if (!draft || !validAmountMinor(draft.amountMinor)) return this.publish({ validation: "Amount", failure: null, savedField: null });
      if (!validCurrencyDraft(draft.currency)) return this.publish({ validation: "Currency", failure: null, savedField: null });
      this.publish({ intent: { field, action, ...draft }, reviewRequired: false, failure: null, validation: null, savedField: null });
    } else this.publish({ intent: { field, action }, reviewRequired: false, failure: null, validation: null, savedField: null });
  }
  cancel() { if (!this.state.pendingField) this.publish({ intent: null, reviewRequired: false, failure: null, validation: null }); }
  reviewLatest() {
    const { detail, intent } = this.state;
    if (!this.state.pendingField && detail.type === "Ready" && intent && slotOf(detail.value, intent.field)?.allowedActions.includes(intent.action))
      this.publish({ reviewRequired: false, failure: null });
  }
  private expectedRevision(value: WorkspacePricingManagementView, field: WorkspacePricingField): number | null {
    if (field !== "ReferenceCost") return value.productRevision;
    return value.referenceCost?.referenceCostRevision ?? null;
  }
  async submit() {
    const { detail, intent } = this.state;
    if (this.disposed || this.expired || this.state.pendingField || this.state.reviewRequired || !intent || detail.type !== "Ready") return;
    const slot = slotOf(detail.value, intent.field), expectedRevision = this.expectedRevision(detail.value, intent.field);
    if (!slot?.allowedActions.includes(intent.action) || expectedRevision === null) return;
    const request = this.write = new AbortController();
    this.publish({ pendingField: intent.field, failure: null, savedField: null, detail: { type: "Loading" } });
    const result = intent.action === "Set"
      ? await this.port.set(this.productId, intent.field, { amountMinor: intent.amountMinor, currency: intent.currency, expectedRevision }, request.signal)
      : await this.port.clear(this.productId, intent.field, { expectedRevision }, request.signal);
    if (!this.current(request, this.write) || this.authenticate(result)) return;
    if (result.ok) {
      this.publish({ intent: null, reviewRequired: false, savedField: intent.field });
      await this.refetch();
    } else {
      this.publish({ failure: result.kind, reviewRequired: true });
      await this.refetch();
      if (this.current(request, this.write) && (result.kind === "ProductArchived" || result.kind === "ProductNotFound"))
        this.callbacks.onProductStale?.();
    }
    if (this.current(request, this.write)) this.publish({ pendingField: null });
  }
  dispose() {
    this.disposed = true; this.read?.abort(); this.write?.abort(); this.state = initialWorkspacePricingState();
  }
}
