import type { PublicShareClipboardPort, PublicShareManagementClientPort, PublicShareManagementFailure, PublicShareManagementOperation } from "./public-product-share-management.types";
export interface PublicShareManagementState {
  readonly busy: boolean;
  readonly message: "Idle" | "Created" | "Reused" | "Found" | "Replaced" | "Revoked" | "AlreadyRevoked" | "Copied" | "ClipboardDenied" | PublicShareManagementFailure;
  readonly grantId?: string; readonly url?: string;
  readonly confirmation?: { readonly operation: "revoke" | "replace"; readonly grantId: string };
}
export const emptyPublicShareManagementState: PublicShareManagementState = Object.freeze({ busy: false, message: "Idle" });
/** Transient instance per authenticated capability/Product/Branch context. No automatic reads. */
export class PublicShareManagementCoordinator {
  private state = emptyPublicShareManagementState;
  private generation = 0;
  private controller: AbortController | null = null;
  private disposed = false;
  constructor(private readonly client: PublicShareManagementClientPort, private readonly clipboard: PublicShareClipboardPort,
    private readonly context: { readonly productId: string; readonly branchId?: string; readonly canRetrieve: boolean; readonly canRevoke: boolean },
    private readonly onChange: (state: PublicShareManagementState) => void) {}
  getState() { return this.state; }
  private publish(state: PublicShareManagementState) { this.state = Object.freeze(state); this.onChange(this.state); }
  clear() { this.generation++; this.controller?.abort(); this.controller = null; this.publish(emptyPublicShareManagementState); }
  dispose() { this.disposed = true; this.generation++; this.controller?.abort(); this.controller = null; this.state = emptyPublicShareManagementState; }
  confirm(operation: "revoke" | "replace", grantId = this.state.grantId) {
    if (this.disposed || this.state.busy || !grantId || (operation === "revoke" ? !this.context.canRevoke : !this.context.canRetrieve)) return;
    this.publish({ busy: false, message: "Idle", grantId, confirmation: { operation, grantId } });
  }
  cancel() { if (!this.state.busy) this.publish({ busy: false, message: "Idle", grantId: this.state.grantId }); }
  async accept() { const confirmation = this.state.confirmation; if (confirmation) await this.run(confirmation.operation, confirmation.grantId); }
  async run(operation: PublicShareManagementOperation, grantId?: string) {
    if (this.disposed || this.state.busy || (operation === "revoke" ? !this.context.canRevoke : !this.context.canRetrieve)) return;
    if (["revoke", "replace"].includes(operation) && (this.state.confirmation?.operation !== operation || this.state.confirmation.grantId !== grantId)) return;
    const generation = ++this.generation, controller = new AbortController(); this.controller = controller;
    this.publish({ busy: true, message: "Idle" });
    const current = () => !this.disposed && this.generation === generation && !controller.signal.aborted;
    try {
      const result = await this.client.execute(operation, { productId: this.context.productId, branchId: this.context.branchId, grantId }, controller.signal);
      if (!current()) return;
      if (!result.ok) { this.publish({ busy: false, message: result.error }); return; }
      if (!("url" in result)) { this.publish({ busy: false, message: result.type }); return; }
      let message: PublicShareManagementState["message"] = result.type;
      if (operation === "copy") {
        try { await this.clipboard.writeText(result.url); message = "Copied"; } catch { message = "ClipboardDenied"; }
        if (!current()) return;
      }
      this.publish({ busy: false, message, grantId: result.grantId, url: result.url });
    } catch { if (current()) this.publish({ busy: false, message: "ServiceUnavailable" }); }
    finally { if (current()) this.controller = null; }
  }
}
