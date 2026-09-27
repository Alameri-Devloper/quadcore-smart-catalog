import { createInventoryOperationId, type BrowserCryptoPort } from "./inventory-operation-id";
import type { ReservationConfirmedCommand, ReservationDraft, ReservationFailure, ReservationNavigation,
  ReservationOperation, ReservationPort, ReservationResource, ReservationResult, ReservationState } from "./reservation.types";

const emptyDraft = (): ReservationDraft => ({ quantity: "", reasonCode: "" });
export const initialReservationState = (navigation: ReservationNavigation = { reservationCursor: null, reservationId: null }): ReservationState => ({
  collection: { type: "Idle" }, detail: { type: "Idle" }, navigation, cursorReset: false, operation: null, draft: emptyDraft(), operationId: null,
  review: null, pending: false, reviewRequired: false, failure: null, outcome: null,
});
const positive = (value: string) => /^[1-9][0-9]*$/u.test(value);
const uncertain = (kind: ReservationFailure) => kind === "NetworkFailure" || kind === "MalformedResponse" || kind === "UnexpectedResponse"
  || kind === "InventoryServiceUnavailable";
const resourceStale = (kind: ReservationFailure) => kind === "BranchInactive" || kind === "BranchNotFound" || kind === "ProductNotFound" || kind === "ProductArchived";

export class ReservationCoordinator {
  private state: ReservationState;
  private disposed = false;
  private expired = false;
  private collectionRequest?: AbortController;
  private detailRequest?: AbortController;
  private writeRequest?: AbortController;
  constructor(private readonly port: ReservationPort, private readonly resource: ReservationResource, navigation: ReservationNavigation,
    private readonly canReserveHint: boolean,
    private readonly callbacks: { readonly onChange: (state: ReservationState) => void; readonly onAuthenticationRequired: () => void;
      readonly onNavigationChange: (navigation: ReservationNavigation) => void; readonly onResourceStale?: () => void },
    private readonly inactiveBranch = false, private readonly cryptoSource?: BrowserCryptoPort) {
    this.state = initialReservationState(navigation);
  }
  get snapshot() { return this.state; }
  private publish(patch: Partial<ReservationState>) {
    if (this.disposed || this.expired) return;
    this.state = { ...this.state, ...patch }; this.callbacks.onChange(this.state);
  }
  private current(request: AbortController, active: AbortController | undefined) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === active;
  }
  private authenticate<T>(result: ReservationResult<T>) {
    if (result.ok || result.kind !== "AuthenticationRequired") return false;
    this.collectionRequest?.abort(); this.detailRequest?.abort(); this.writeRequest?.abort();
    this.publish({ ...initialReservationState(), collection: { type: "Failed", kind: "AuthenticationRequired" } });
    this.expired = true; this.callbacks.onAuthenticationRequired(); return true;
  }
  async load() {
    if (this.disposed || this.expired || this.state.pending) return;
    await Promise.all([this.loadCollection(), this.loadDetail()]);
  }
  async syncNavigation(navigation: ReservationNavigation) {
    if (this.disposed || this.expired) return;
    const cursorChanged = navigation.reservationCursor !== this.state.navigation.reservationCursor;
    const selectionChanged = navigation.reservationId !== this.state.navigation.reservationId;
    if (!cursorChanged && !selectionChanged) return;
    this.publish({ navigation, cursorReset: false, ...(selectionChanged ? { detail: { type: "Idle" }, operation: null, draft: emptyDraft(), operationId: null,
      review: null, reviewRequired: false, failure: null, outcome: null } : {}) });
    await Promise.all([cursorChanged ? this.loadCollection() : Promise.resolve(), selectionChanged ? this.loadDetail() : Promise.resolve()]);
  }
  private async loadCollection() {
    if (!this.resource.productId) { this.collectionRequest?.abort(); this.publish({ collection: { type: "Idle" } }); return; }
    this.collectionRequest?.abort(); const request = this.collectionRequest = new AbortController();
    this.publish({ collection: { type: "Loading" } });
    const result = await this.port.list({ branchId: this.resource.branchId, productId: this.resource.productId,
      ...(this.state.navigation.reservationCursor ? { cursor: this.state.navigation.reservationCursor } : {}) }, request.signal);
    if (!this.current(request, this.collectionRequest) || this.authenticate(result)) return;
    if (!result.ok && result.kind === "InvalidCursor" && this.state.navigation.reservationCursor) {
      const navigation = { ...this.state.navigation, reservationCursor: null };
      this.publish({ navigation, cursorReset: true }); this.callbacks.onNavigationChange(navigation); await this.loadCollection(); return;
    }
    if (!result.ok && resourceStale(result.kind)) this.callbacks.onResourceStale?.();
    this.publish({ collection: result.ok ? { type: "Ready", value: result.value } : { type: "Failed", kind: result.kind } });
  }
  private async loadDetail() {
    const reservationId = this.state.navigation.reservationId;
    if (!reservationId) { this.detailRequest?.abort(); this.publish({ detail: { type: "Idle" } }); return; }
    this.detailRequest?.abort(); const request = this.detailRequest = new AbortController();
    this.publish({ detail: { type: "Loading" } });
    const result = await this.port.detail({ branchId: this.resource.branchId, reservationId }, request.signal);
    if (!this.current(request, this.detailRequest) || this.authenticate(result)) return;
    if (!result.ok && result.kind === "ReservationNotFound") {
      const navigation = { ...this.state.navigation, reservationId: null };
      this.publish({ navigation, detail: { type: "Idle" }, failure: "ReservationNotFound" }); this.callbacks.onNavigationChange(navigation);
      if (this.resource.productId) await this.loadCollection(); return;
    }
    if (!result.ok && resourceStale(result.kind)) this.callbacks.onResourceStale?.();
    this.publish({ detail: result.ok ? { type: "Ready", value: result.value } : { type: "Failed", kind: result.kind } });
  }
  async nextPage() {
    if (this.state.pending || this.state.collection.type !== "Ready" || !this.state.collection.value.nextCursor) return;
    const navigation = { ...this.state.navigation, reservationCursor: this.state.collection.value.nextCursor };
    this.publish({ navigation, cursorReset: false }); this.callbacks.onNavigationChange(navigation); await this.loadCollection();
  }
  async restartCollection() {
    if (this.state.pending) return;
    const navigation = { ...this.state.navigation, reservationCursor: null };
    this.publish({ navigation, cursorReset: false }); this.callbacks.onNavigationChange(navigation); await this.loadCollection();
  }
  async recoverInvalidCursor() {
    if (this.disposed || this.expired || this.state.pending) return;
    const navigation = { ...this.state.navigation, reservationCursor: null };
    this.publish({ navigation, cursorReset: true }); this.callbacks.onNavigationChange(navigation); await this.loadCollection();
  }
  async select(reservationId: string) {
    if (this.state.pending || reservationId === this.state.navigation.reservationId) return;
    const navigation = { ...this.state.navigation, reservationId };
    this.publish({ navigation, detail: { type: "Idle" }, operation: null, draft: emptyDraft(), operationId: null, review: null,
      reviewRequired: false, failure: null, outcome: null }); this.callbacks.onNavigationChange(navigation); await this.loadDetail();
  }
  choose(operation: ReservationOperation) {
    if (this.disposed || this.expired || this.state.pending) return;
    if (operation === "Reserve") {
      if (!this.canReserveHint || this.inactiveBranch || !this.resource.productId) return;
    } else {
      if (this.state.detail.type !== "Ready" || !this.state.detail.value.allowedActions.includes(operation)) return;
    }
    this.publish({ operation, draft: emptyDraft(), operationId: createInventoryOperationId(this.cryptoSource), review: null,
      reviewRequired: false, failure: null, outcome: null });
  }
  updateDraft(patch: Partial<ReservationDraft>) {
    if (!this.state.operation || this.state.pending) return;
    this.publish({ draft: { ...this.state.draft, ...patch }, operationId: createInventoryOperationId(this.cryptoSource), review: null,
      reviewRequired: false, failure: null, outcome: null });
  }
  review() {
    const operation = this.state.operation, operationId = this.state.operationId; if (!operation || !operationId || this.state.pending) return;
    const detail = this.state.detail.type === "Ready" ? this.state.detail.value : null;
    const productId = operation === "Reserve" ? this.resource.productId : detail?.productId;
    const reservationId = operation === "Reserve" ? null : detail?.reservationId;
    if (!positive(this.state.draft.quantity) || !productId || operation !== "Reserve" && (!reservationId || !detail?.allowedActions.includes(operation))) {
      this.publish({ failure: "InvalidInput", reviewRequired: true }); return;
    }
    const review: ReservationConfirmedCommand = { operation, operationId, productId, reservationId: reservationId ?? null,
      quantity: this.state.draft.quantity, reasonCode: this.state.draft.reasonCode.trim() };
    this.publish({ review, reviewRequired: false, failure: null });
  }
  cancel() {
    if (!this.state.pending) this.publish({ operation: null, draft: emptyDraft(), operationId: null, review: null, reviewRequired: false, failure: null });
  }
  acknowledgeRetry() { if (!this.state.pending && this.state.review) this.publish({ reviewRequired: false, failure: null }); }
  private execute(review: ReservationConfirmedCommand, request: AbortController) {
    if (review.operation === "Reserve") return this.port.reserve({ branchId: this.resource.branchId, productId: review.productId }, {
      operationId: review.operationId, productId: review.productId, quantity: review.quantity, ...(review.reasonCode ? { reasonCode: review.reasonCode } : {}),
    }, request.signal);
    const target = { branchId: this.resource.branchId, productId: review.productId, reservationId: review.reservationId! };
    const command = { operationId: review.operationId, quantity: review.quantity };
    return review.operation === "Release" ? this.port.release(target, command, request.signal) : this.port.fulfill(target, command, request.signal);
  }
  async submit() {
    const review = this.state.review;
    if (this.disposed || this.expired || this.state.pending || this.state.reviewRequired || !review) return;
    if (review.operation === "Reserve" && (!this.canReserveHint || this.inactiveBranch)
      || review.operation !== "Reserve" && (this.state.detail.type !== "Ready" || !this.state.detail.value.allowedActions.includes(review.operation))) return;
    const request = this.writeRequest = new AbortController(); this.publish({ pending: true, failure: null, outcome: null });
    const result = await this.execute(review, request);
    if (!this.current(request, this.writeRequest) || this.authenticate(result)) return;
    if (result.ok) {
      const navigation = { reservationCursor: null, reservationId: result.value.reservationId };
      this.publish({ pending: false, outcome: result.value, operation: null, draft: emptyDraft(), operationId: createInventoryOperationId(this.cryptoSource),
        review: null, reviewRequired: false, failure: null, navigation, cursorReset: false });
      this.callbacks.onNavigationChange(navigation); await Promise.all([this.loadCollection(), this.loadDetail()]);
      return;
    }
    const nextId = uncertain(result.kind) ? review.operationId : createInventoryOperationId(this.cryptoSource);
    const navigation = { ...this.state.navigation, reservationCursor: null };
    this.publish({ pending: false, failure: result.kind, review: { ...review, operationId: nextId }, operationId: nextId,
      reviewRequired: true, navigation });
    this.callbacks.onNavigationChange(navigation); if (resourceStale(result.kind)) this.callbacks.onResourceStale?.();
    await Promise.all([this.loadCollection(), this.loadDetail()]);
  }
  dispose() {
    this.disposed = true; this.collectionRequest?.abort(); this.detailRequest?.abort(); this.writeRequest?.abort();
    this.state = initialReservationState();
  }
}
