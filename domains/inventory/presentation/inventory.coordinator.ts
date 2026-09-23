import { createInventoryOperationId, type BrowserCryptoPort } from "./inventory-operation-id";
import type { InventoryCapabilityHints, InventoryConfirmedCommand, InventoryDraft, InventoryFailure, InventoryMutationRequest,
  InventoryOperation, InventoryPort, InventoryResource, InventoryResult, InventoryState } from "./inventory.types";

const emptyDraft = (): InventoryDraft => ({ quantity: "", reasonCode: "", note: "" });
export const initialInventoryState = (): InventoryState => ({ detail: { type: "Idle" }, operation: null, draft: emptyDraft(), operationId: null,
  review: null, pending: false, reviewRequired: false, failure: null, outcome: null });
const hinted = (hints: InventoryCapabilityHints, operation: InventoryOperation) => operation === "Receive" ? hints.canReceive
  : operation === "Issue" ? hints.canIssue : operation === "MarkDamaged" || operation === "RestoreDamaged" ? hints.canManageDamage : hints.canAdjust;
const uncertain = (kind: InventoryFailure) => kind === "NetworkFailure" || kind === "MalformedResponse" || kind === "UnexpectedResponse"
  || kind === "InventoryServiceUnavailable";
const confirmed = (operation: InventoryOperation, operationId: string, draft: InventoryDraft): InventoryConfirmedCommand | null => {
  const quantity = draft.quantity.trim(), reasonCode = draft.reasonCode.trim(), note = draft.note.trim();
  if (!/^[1-9][0-9]*$/u.test(quantity) || ((operation === "CorrectIncrease" || operation === "CorrectDecrease") && !reasonCode)) return null;
  return { operation, operationId, quantity, reasonCode, note };
};

export class InventoryCoordinator {
  private state = initialInventoryState();
  private disposed = false;
  private expired = false;
  private read?: AbortController;
  private write?: AbortController;
  constructor(private readonly port: InventoryPort, private readonly resource: InventoryResource, private readonly hints: InventoryCapabilityHints,
    private readonly callbacks: { readonly onChange: (state: InventoryState) => void; readonly onAuthenticationRequired: () => void; readonly onResourceStale?: () => void },
    private readonly inspectionOnly = false, private readonly cryptoSource?: BrowserCryptoPort) {}
  get snapshot() { return this.state; }
  private publish(patch: Partial<InventoryState>) {
    if (this.disposed || this.expired) return;
    this.state = { ...this.state, ...patch }; this.callbacks.onChange(this.state);
  }
  private current(request: AbortController, active: AbortController | undefined) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === active;
  }
  private authenticate<T>(result: InventoryResult<T>) {
    if (result.ok || result.kind !== "AuthenticationRequired") return false;
    this.read?.abort(); this.write?.abort(); this.publish({ ...initialInventoryState(), detail: { type: "Failed", kind: "AuthenticationRequired" } });
    this.expired = true; this.callbacks.onAuthenticationRequired(); return true;
  }
  async load() { if (!this.disposed && !this.expired && !this.state.pending) await this.refetch(); }
  private async refetch() {
    this.read?.abort(); const request = this.read = new AbortController();
    this.publish({ detail: { type: "Loading" } });
    const result = await this.port.get(this.resource, request.signal);
    if (!this.current(request, this.read) || this.authenticate(result)) return;
    this.publish({ detail: result.ok ? { type: "Ready", value: result.value }
      : result.kind === "Forbidden" ? { type: "ForbiddenRead" } : { type: "Failed", kind: result.kind } });
  }
  choose(operation: InventoryOperation) {
    if (this.disposed || this.expired || this.inspectionOnly || this.state.pending || !hinted(this.hints, operation)) return;
    this.publish({ operation, draft: emptyDraft(), operationId: createInventoryOperationId(this.cryptoSource), review: null,
      reviewRequired: false, failure: null, outcome: null });
  }
  updateDraft(patch: Partial<InventoryDraft>) {
    if (!this.state.operation || this.state.pending) return;
    this.publish({ draft: { ...this.state.draft, ...patch }, operationId: createInventoryOperationId(this.cryptoSource), review: null,
      reviewRequired: false, failure: null, outcome: null });
  }
  review() {
    if (!this.state.operation || !this.state.operationId || this.state.pending) return;
    const review = confirmed(this.state.operation, this.state.operationId, this.state.draft);
    if (review) this.publish({ review, reviewRequired: false, failure: null });
    else this.publish({ failure: "InvalidInput", reviewRequired: true });
  }
  cancel() { if (!this.state.pending) this.publish({ operation: null, draft: emptyDraft(), operationId: null, review: null, reviewRequired: false, failure: null }); }
  acknowledgeRetry() { if (!this.state.pending && this.state.review) this.publish({ reviewRequired: false, failure: null }); }
  private command(review: InventoryConfirmedCommand): InventoryMutationRequest {
    return { operationId: review.operationId, productId: this.resource.productId, quantity: review.quantity,
      ...(review.reasonCode ? { reasonCode: review.reasonCode } : {}), ...(review.note ? { note: review.note } : {}) };
  }
  private execute(review: InventoryConfirmedCommand, request: AbortController) {
    const command = this.command(review);
    switch (review.operation) {
      case "Receive": return this.port.receive(this.resource, command, request.signal);
      case "Issue": return this.port.issue(this.resource, command, request.signal);
      case "CorrectIncrease": return this.port.correctIncrease(this.resource, { ...command, reasonCode: review.reasonCode }, request.signal);
      case "CorrectDecrease": return this.port.correctDecrease(this.resource, { ...command, reasonCode: review.reasonCode }, request.signal);
      case "MarkDamaged": return this.port.markDamaged(this.resource, command, request.signal);
      case "RestoreDamaged": return this.port.restoreDamaged(this.resource, command, request.signal);
    }
  }
  async submit() {
    const review = this.state.review;
    if (this.disposed || this.expired || this.inspectionOnly || this.state.pending || this.state.reviewRequired || !review
      || !hinted(this.hints, review.operation)) return;
    const request = this.write = new AbortController(); this.publish({ pending: true, failure: null, outcome: null });
    const result = await this.execute(review, request);
    if (!this.current(request, this.write) || this.authenticate(result)) return;
    if (result.ok) {
      this.publish({ pending: false, outcome: result.value, operation: null, draft: emptyDraft(), operationId: createInventoryOperationId(this.cryptoSource),
        review: null, reviewRequired: false, failure: null });
      if (this.state.detail.type !== "ForbiddenRead") await this.refetch();
    } else {
      const nextId = uncertain(result.kind) ? review.operationId : createInventoryOperationId(this.cryptoSource);
      this.publish({ pending: false, failure: result.kind, review: { ...review, operationId: nextId }, operationId: nextId, reviewRequired: true });
      if (result.kind === "BranchInactive" || result.kind === "ProductArchived" || result.kind === "BranchNotFound" || result.kind === "ProductNotFound")
        this.callbacks.onResourceStale?.();
      if (this.state.detail.type !== "ForbiddenRead") await this.refetch();
    }
  }
  dispose() { this.disposed = true; this.read?.abort(); this.write?.abort(); this.state = initialInventoryState(); }
}
