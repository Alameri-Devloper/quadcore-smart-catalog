import { createInventoryOperationId, type BrowserCryptoPort } from "./inventory-operation-id";
import type { InventoryReadView, InventoryResult } from "./inventory.types";
import type { TransferBranchOption, TransferCommand, TransferDraft, TransferFailure, TransferInventoryReadPort, TransferPort,
  TransferReadHints, TransferSideState, TransferState } from "./transfer.types";

const emptyDraft = (): TransferDraft => ({ quantity: "", reasonCode: "" });
export const initialTransferState = (sourceBranchId: string | null = null, branches: readonly TransferBranchOption[] = [],
  destinationBranchId: string | null = null, productId: string | null = null): TransferState => ({
  sourceBranchId, destinationBranchId, productId, branches, sourceDetail: { type: "Idle" }, destinationDetail: { type: "Idle" },
  draft: emptyDraft(), operationId: null, review: null, pending: false, reviewRequired: false, failure: null, outcome: null,
});
const uncertain = (kind: TransferFailure) => kind === "NetworkFailure" || kind === "MalformedResponse" || kind === "UnexpectedResponse"
  || kind === "InventoryServiceUnavailable";
const staleBranch = (kind: TransferFailure) => kind === "BranchInactive" || kind === "BranchNotFound";
const staleProduct = (kind: TransferFailure) => kind === "ProductArchived" || kind === "ProductNotFound";
const active = (options: readonly TransferBranchOption[], id: string | null) => Boolean(id && options.some(option => option.branchId === id && option.status === "Active"));
const readState = (result: InventoryResult<InventoryReadView>): TransferSideState => result.ok ? { type: "Ready", value: result.value }
  : result.kind === "Forbidden" ? { type: "ForbiddenRead" } : { type: "Failed", kind: result.kind };
const confirmed = (state: TransferState, operationId: string): TransferCommand | null => {
  const quantity = state.draft.quantity.trim(), reasonCode = state.draft.reasonCode;
  if (!state.sourceBranchId || !state.destinationBranchId || !state.productId || state.sourceBranchId === state.destinationBranchId
    || !active(state.branches, state.sourceBranchId) || !active(state.branches, state.destinationBranchId)
    || !/^[1-9][0-9]*$/u.test(quantity)) return null;
  return { operationId, sourceBranchId: state.sourceBranchId, destinationBranchId: state.destinationBranchId,
    productId: state.productId, quantity, ...(reasonCode ? { reasonCode } : {}) };
};

export class TransferCoordinator {
  private state: TransferState;
  private disposed = false;
  private expired = false;
  private read?: AbortController;
  private write?: AbortController;
  constructor(private readonly port: TransferPort, private readonly inventory: TransferInventoryReadPort, sourceBranchId: string,
    branches: readonly TransferBranchOption[], destinationBranchId: string | null, productId: string | null, private readonly hints: TransferReadHints,
    private readonly callbacks: { readonly onChange: (state: TransferState) => void; readonly onAuthenticationRequired: () => void;
      readonly onBranchesStale: () => void; readonly onProductStale: (kind: "ProductArchived" | "ProductNotFound") => void },
    private readonly cryptoSource?: BrowserCryptoPort) {
    this.state = initialTransferState(sourceBranchId, branches, destinationBranchId, productId);
  }
  get snapshot() { return this.state; }
  private publish(patch: Partial<TransferState>) {
    if (this.disposed || this.expired) return;
    this.state = { ...this.state, ...patch }; this.callbacks.onChange(this.state);
  }
  private current(request: AbortController, activeRequest: AbortController | undefined) {
    return !this.disposed && !this.expired && !request.signal.aborted && request === activeRequest;
  }
  private authenticate<T>(result: InventoryResult<T>) {
    if (result.ok || result.kind !== "AuthenticationRequired") return false;
    this.read?.abort(); this.write?.abort(); this.state = initialTransferState(); this.callbacks.onChange(this.state);
    this.expired = true; this.callbacks.onAuthenticationRequired(); return true;
  }
  async load() { if (!this.disposed && !this.expired && !this.state.pending) await this.refetch(); }
  async sync(branches: readonly TransferBranchOption[], destinationBranchId: string | null, productId: string | null) {
    if (this.disposed || this.expired || this.state.pending) return;
    const destinationChanged = destinationBranchId !== this.state.destinationBranchId;
    const productChanged = productId !== this.state.productId;
    const next: Partial<TransferState> = { branches, destinationBranchId, productId };
    if (destinationChanged) Object.assign(next, { operationId: null, review: null, reviewRequired: false, failure: null, outcome: null });
    if (productChanged) Object.assign(next, { draft: emptyDraft(), operationId: null, review: null, reviewRequired: false, failure: null, outcome: null });
    if (!active(branches, this.state.sourceBranchId) || destinationBranchId && !active(branches, destinationBranchId))
      Object.assign(next, { operationId: null, review: null, reviewRequired: false, outcome: null });
    this.publish(next);
    if (destinationChanged || productChanged) await this.refetch();
  }
  changeSource(sourceBranchId: string, branches: readonly TransferBranchOption[]) {
    if (this.disposed || this.expired) return;
    this.read?.abort(); this.write?.abort(); this.state = initialTransferState(sourceBranchId, branches); this.callbacks.onChange(this.state);
  }
  updateDraft(patch: Partial<TransferDraft>) {
    if (this.disposed || this.expired || this.state.pending) return;
    this.publish({ draft: { ...this.state.draft, ...patch }, operationId: null, review: null, reviewRequired: false, failure: null, outcome: null });
  }
  review() {
    if (this.disposed || this.expired || this.state.pending) return;
    const operationId = createInventoryOperationId(this.cryptoSource), review = confirmed(this.state, operationId);
    if (review) this.publish({ operationId, review, reviewRequired: false, failure: null });
    else this.publish({ operationId: null, review: null, reviewRequired: false, failure: "InvalidInput" });
  }
  cancel() { if (!this.state.pending) this.publish({ operationId: null, review: null, reviewRequired: false, failure: null }); }
  acknowledgeRetry() { if (!this.state.pending && this.state.review) this.publish({ reviewRequired: false, failure: null }); }
  async submit() {
    const review = this.state.review;
    if (this.disposed || this.expired || this.state.pending || this.state.reviewRequired || !review || confirmed(this.state, review.operationId) === null) return;
    const request = this.write = new AbortController(); this.publish({ pending: true, failure: null, outcome: null });
    const result = await this.port.transfer(review, request.signal);
    if (!this.current(request, this.write) || this.authenticate(result)) return;
    if (result.ok) {
      this.publish({ pending: false, draft: emptyDraft(), operationId: null, review: null, reviewRequired: false, failure: null, outcome: result.value });
      await this.refetch(); return;
    }
    if (uncertain(result.kind)) {
      this.publish({ pending: false, failure: result.kind, operationId: review.operationId, review, reviewRequired: true });
    } else {
      const productFailure = staleProduct(result.kind);
      this.publish({ pending: false, failure: result.kind, operationId: null, review: null, reviewRequired: false,
        ...(productFailure ? { productId: null } : {}) });
      if (staleBranch(result.kind)) this.callbacks.onBranchesStale();
      if (productFailure) this.callbacks.onProductStale(result.kind as "ProductArchived" | "ProductNotFound");
    }
    await this.refetch();
  }
  private async refetch() {
    this.read?.abort();
    if (!this.hints.canViewAvailability && !this.hints.canViewQuantities) {
      this.publish({ sourceDetail: { type: "Idle" }, destinationDetail: { type: "Idle" } }); return;
    }
    const { sourceBranchId, destinationBranchId, productId } = this.state;
    if (!sourceBranchId || !destinationBranchId || !productId) {
      this.publish({ sourceDetail: { type: "Idle" }, destinationDetail: { type: "Idle" } }); return;
    }
    const request = this.read = new AbortController(); this.publish({ sourceDetail: { type: "Loading" }, destinationDetail: { type: "Loading" } });
    const [source, destination] = await Promise.all([
      this.inventory.get({ branchId: sourceBranchId, productId }, request.signal),
      this.inventory.get({ branchId: destinationBranchId, productId }, request.signal),
    ]);
    if (!this.current(request, this.read) || this.authenticate(source) || this.authenticate(destination)) return;
    this.publish({ sourceDetail: readState(source), destinationDetail: readState(destination) });
  }
  dispose() { this.disposed = true; this.read?.abort(); this.write?.abort(); this.state = initialTransferState(); }
}
