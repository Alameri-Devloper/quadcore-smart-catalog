import type {
  BranchMoneyView, BranchPricingAction, BranchPricingField, BranchPricingFieldState, BranchPricingManagementView,
  BranchPricingPort, BranchPricingResult, BranchPricingSlot, BranchPricingState,
} from "./branch-pricing.types";

export type BranchPricingSurface = "prices" | "reference-cost";

export const initialBranchPricingFieldState = (): BranchPricingFieldState => ({
  intent: null, pending: false, reviewRequired: false, failure: null, validation: null, saved: false,
});
export const initialBranchPricingState = (): BranchPricingState => ({
  detail: { type: "Idle" }, refreshing: false, activeField: null, fields: {},
});

export const validBranchAmountMinor = (value: string): boolean => /^(?:0|[1-9]\d*)$/u.test(value)
  && BigInt(value) <= BigInt(Number.MAX_SAFE_INTEGER);
export const validBranchCurrencyDraft = (value: string): boolean => /^[A-Z]{3}$/u.test(value);

const projectSurface = (value: BranchPricingManagementView, surface: BranchPricingSurface): BranchPricingManagementView => {
  const prices: Partial<Record<BranchPricingField, BranchPricingSlot>> = {};
  if (surface === "prices") {
    if (value.prices.Retail) prices.Retail = value.prices.Retail;
    if (value.prices.Wholesale) prices.Wholesale = value.prices.Wholesale;
  } else if (value.prices.ReferenceCost) prices.ReferenceCost = value.prices.ReferenceCost;
  return Object.freeze({ branchId: value.branchId, productId: value.productId,
    ...(surface === "prices" && value.baseProductRevision !== undefined ? { baseProductRevision: value.baseProductRevision } : {}),
    ...(surface === "reference-cost" && value.baseReferenceCostRevision !== undefined
      ? { baseReferenceCostRevision: value.baseReferenceCostRevision } : {}), prices: Object.freeze(prices) });
};

const slotOf = (value: BranchPricingManagementView, field: BranchPricingField) => value.prices[field];
const containsField = (value: BranchPricingManagementView, field: BranchPricingField) => Object.prototype.hasOwnProperty.call(value.prices, field);

export class BranchPricingCoordinator {
  private state = initialBranchPricingState();
  private disposed = false;
  private expired = false;
  private read?: AbortController;
  private readonly writes = new Map<BranchPricingField, AbortController>();
  constructor(private readonly port: BranchPricingPort, private readonly branchId: string, private readonly productId: string,
    private readonly surface: BranchPricingSurface, private readonly callbacks: {
      readonly onChange: (state: BranchPricingState) => void;
      readonly onAuthenticationRequired: () => void;
      readonly onBranchStale?: () => void;
      readonly onProductStale?: () => void;
    }) {}
  get snapshot() { return this.state; }
  private publish(patch: Partial<BranchPricingState>) {
    if (this.disposed || this.expired) return;
    this.state = { ...this.state, ...patch }; this.callbacks.onChange(this.state);
  }
  private publishField(field: BranchPricingField, patch: Partial<BranchPricingFieldState>) {
    const current = this.state.fields[field] ?? initialBranchPricingFieldState();
    this.publish({ fields: Object.freeze({ ...this.state.fields, [field]: Object.freeze({ ...current, ...patch }) }) });
  }
  private currentRead(request: AbortController) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === this.read;
  }
  private currentWrite(field: BranchPricingField, request: AbortController) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === this.writes.get(field);
  }
  private authenticate<T>(result: BranchPricingResult<T>) {
    if (result.ok || result.kind !== "AuthenticationRequired") return false;
    this.read?.abort(); for (const request of this.writes.values()) request.abort(); this.writes.clear();
    this.publish({ ...initialBranchPricingState(), detail: { type: "Failed", kind: "AuthenticationRequired" } });
    this.expired = true; this.callbacks.onAuthenticationRequired(); return true;
  }
  async load() { if (!this.disposed && !this.expired && ![...this.writes.values()].some(request => !request.signal.aborted)) await this.refetch(); }
  private async refetch() {
    this.read?.abort(); const request = this.read = new AbortController();
    const hadReady = this.state.detail.type === "Ready";
    this.publish(hadReady ? { refreshing: true } : { detail: { type: "Loading" }, refreshing: true });
    const result = await this.port.get(this.branchId, this.productId, request.signal);
    if (!this.currentRead(request) || this.authenticate(result)) return false;
    if (!result.ok) { this.publish({ detail: { type: "Failed", kind: result.kind }, refreshing: false }); return false; }
    const value = projectSurface(result.value, this.surface), fields: Partial<Record<BranchPricingField, BranchPricingFieldState>> = {};
    for (const field of ["Retail", "Wholesale", "ReferenceCost"] as const)
      if (containsField(value, field) && this.state.fields[field]) fields[field] = this.state.fields[field];
    this.publish({ detail: { type: "Ready", value }, refreshing: false, fields: Object.freeze(fields),
      activeField: this.state.activeField && containsField(value, this.state.activeField) ? this.state.activeField : null });
    return true;
  }
  choose(field: BranchPricingField, action: BranchPricingAction, draft?: BranchMoneyView) {
    const detail = this.state.detail, workflow = this.state.fields[field] ?? initialBranchPricingFieldState();
    if (this.disposed || this.expired || workflow.pending || this.state.activeField !== null || detail.type !== "Ready") return;
    const slot = slotOf(detail.value, field);
    if (!slot?.allowedActions.includes(action) || (this.surface === "prices") !== (field !== "ReferenceCost")) return;
    if (action === "SetOverride") {
      if (!draft || !validBranchAmountMinor(draft.amountMinor)) return this.publishField(field, { validation: "Amount", failure: null, saved: false });
      if (!validBranchCurrencyDraft(draft.currency)) return this.publishField(field, { validation: "Currency", failure: null, saved: false });
      this.publishField(field, { intent: { field, action, ...draft }, reviewRequired: false, failure: null, validation: null, saved: false });
    } else this.publishField(field, { intent: { field, action }, reviewRequired: false, failure: null, validation: null, saved: false });
    this.publish({ activeField: field });
  }
  activate(field: BranchPricingField) {
    const detail = this.state.detail, workflow = this.state.fields[field];
    if (!this.state.activeField && detail.type === "Ready" && workflow?.intent && !workflow.pending
      && slotOf(detail.value, field)?.allowedActions.includes(workflow.intent.action)) this.publish({ activeField: field });
  }
  cancel() {
    const field = this.state.activeField, workflow = field ? this.state.fields[field] : undefined;
    if (!field || workflow?.pending) return;
    this.publishField(field, { intent: null, reviewRequired: false, failure: null, validation: null }); this.publish({ activeField: null });
  }
  reviewLatest() {
    const field = this.state.activeField, detail = this.state.detail, workflow = field ? this.state.fields[field] : undefined;
    if (field && detail.type === "Ready" && workflow?.intent && !workflow.pending
      && slotOf(detail.value, field)?.allowedActions.includes(workflow.intent.action))
      this.publishField(field, { reviewRequired: false, failure: null });
  }
  async submit() {
    const field = this.state.activeField, detail = this.state.detail, workflow = field ? this.state.fields[field] : undefined;
    if (!field || detail.type !== "Ready" || !workflow?.intent || workflow.pending || workflow.reviewRequired) return;
    const slot = slotOf(detail.value, field), intent = workflow.intent;
    if (!slot?.allowedActions.includes(intent.action)) return;
    const request = new AbortController(); this.writes.set(field, request);
    this.publishField(field, { pending: true, failure: null, saved: false }); this.publish({ activeField: null });
    const result = intent.action === "SetOverride"
      ? await this.port.set(this.branchId, this.productId, field,
        { amountMinor: intent.amountMinor, currency: intent.currency, expectedRevision: slot.overrideRevision }, request.signal)
      : await this.port.clear(this.branchId, this.productId, field, { expectedRevision: slot.overrideRevision }, request.signal);
    if (!this.currentWrite(field, request) || this.authenticate(result)) return;
    if (result.ok) this.publishField(field, { intent: null, reviewRequired: false, failure: null, saved: true });
    else this.publishField(field, { reviewRequired: true, failure: result.kind, saved: false });
    await this.refetch();
    if (!this.currentWrite(field, request)) return;
    this.writes.delete(field);
    if (this.state.detail.type === "Ready" && containsField(this.state.detail.value, field)) {
      this.publishField(field, { pending: false });
      if (!result.ok && !this.state.activeField) this.publish({ activeField: field });
    } else if (this.state.detail.type === "Failed") this.publishField(field, { pending: false });
    if (!result.ok && (result.kind === "BranchInactive" || result.kind === "BranchNotFound")) this.callbacks.onBranchStale?.();
    if (!result.ok && (result.kind === "ProductArchived" || result.kind === "ProductNotFound")) this.callbacks.onProductStale?.();
  }
  dispose() {
    this.disposed = true; this.read?.abort(); for (const request of this.writes.values()) request.abort(); this.writes.clear();
    this.state = initialBranchPricingState();
  }
}
