import { operationalProductRequestKey } from "./operational-product-query-state";
import type { OperationalProductPort, OperationalProductRequest, OperationalProductState } from "./operational-product-selector.types";

export const operationalProductSelection = (state: OperationalProductState, key: string, productId: string | null) => {
  if (!productId) return { type: "None" as const };
  if (state.type !== "Ready" || state.key !== key) return { type: "Pending" as const };
  const product = state.value.items.find((item) => item.productId === productId);
  return product ? { type: "Selected" as const, product } : { type: "Stale" as const };
};

/** Model B: every load replaces the bounded page; URL coordination clears selection on replacement. */
export class OperationalProductSelectorCoordinator {
  private state: OperationalProductState = { type: "Idle" };
  private request?: AbortController;
  private disposed = false;
  private expired = false;
  constructor(private readonly port: OperationalProductPort, private readonly callbacks: {
    readonly onChange: (state: OperationalProductState) => void;
    readonly onAuthenticationRequired: () => void;
  }) {}
  get snapshot() { return this.state; }
  private publish(state: OperationalProductState) { this.state = state; this.callbacks.onChange(state); }
  async load(input: OperationalProductRequest) {
    if (this.disposed || this.expired) return;
    this.request?.abort();
    const request = this.request = new AbortController(), key = operationalProductRequestKey(input);
    this.publish({ type: "Loading", key });
    const result = await this.port.search(input, request.signal);
    if (this.disposed || this.expired || this.request !== request || request.signal.aborted) return;
    if (!result.ok) {
      this.publish({ type: "Failed", key, kind: result.kind });
      if (result.kind === "AuthenticationRequired") { this.expired = true; request.abort(); this.callbacks.onAuthenticationRequired(); }
    } else this.publish({ type: "Ready", key, value: result.value });
  }
  dispose() { this.disposed = true; this.request?.abort(); this.state = { type: "Idle" }; }
}
export const mountOperationalProductSelector = (port: OperationalProductPort, request: OperationalProductRequest,
  callbacks: ConstructorParameters<typeof OperationalProductSelectorCoordinator>[1]) => {
  const coordinator = new OperationalProductSelectorCoordinator(port, callbacks);
  void Promise.resolve().then(() => coordinator.load(request));
  return coordinator;
};
