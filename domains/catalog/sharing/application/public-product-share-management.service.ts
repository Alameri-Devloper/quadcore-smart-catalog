import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { PublicShareManagementReadinessPort } from "../ports/public-share-management-readiness.port";
import type { PublicShareManagementAdmissionPort, PublicShareManagementOperation } from "../ports/public-share-management-admission.port";
import { authorizePublicShareManagement, type PublicProductShareLifecycle, type PublicShareLinkResult, type PublicShareRevokeResult } from "./public-product-share.use-cases";
import type { PublicShareManagementResult } from "./public-product-share.types";
type Tuple = { readonly context: TrustedActorContext; readonly productId: string; readonly branchId: string };
type Lifecycle = Pick<PublicProductShareLifecycle, "issue" | "copy" | "replace" | "revoke">;
const canonicalId = (value: string) => typeof value === "string" && value.length > 0 && value.trim() === value;
/** P4 owns lifecycle transactions. Admission commits before readiness or lifecycle work. */
export class PublicProductShareManagementService {
  constructor(private readonly lifecycle: Lifecycle, private readonly readiness: PublicShareManagementReadinessPort,
    private readonly admission: PublicShareManagementAdmissionPort) {}
  private async admitted<T>(context: TrustedActorContext, operation: PublicShareManagementOperation,
    work: () => Promise<PublicShareManagementResult<T>>): Promise<PublicShareManagementResult<T>> {
    try {
      const result = await this.admission.admit({ workspaceId: context.workspaceId, actorId: context.actorId, operation });
      if (result.type === "Unavailable") return { ok: false, error: "ServiceUnavailable" };
      if (result.type === "Denied") {
        if (!Number.isFinite(result.retryAfterSeconds)) return { ok: false, error: "ServiceUnavailable" };
        return { ok: false, error: "AdmissionDenied", retryAfterSeconds: Math.max(1, Math.min(60, Math.ceil(result.retryAfterSeconds))) };
      }
      if (result.type !== "Allowed") return { ok: false, error: "ServiceUnavailable" };
      return await work();
    } catch { return { ok: false, error: "ServiceUnavailable" }; }
  }
  private async link(command: Tuple, operation: PublicShareManagementOperation,
    work: () => Promise<PublicShareManagementResult<PublicShareLinkResult>>): Promise<PublicShareManagementResult<PublicShareLinkResult>> {
    const denied = authorizePublicShareManagement(command.context, true);
    if (denied) return { ok: false, error: denied };
    if (!canonicalId(command.productId) || !canonicalId(command.branchId)) return { ok: false, error: "NotFound" };
    if (command.context.branchScope.type === "SelectedBranches" && !command.context.branchScope.branchIds.includes(command.branchId)) return { ok: false, error: "BranchScopeDenied" };
    return this.admitted(command.context, operation, async () => {
      const readiness = await this.readiness.check();
      return readiness === "Ready" ? work() : { ok: false, error: readiness };
    });
  }
  issue(command: Tuple) { return this.link(command, "Issue", () => this.lifecycle.issue(command)); }
  copy(command: Tuple) { return this.link(command, "Copy", () => this.lifecycle.copy(command)); }
  replace(command: Tuple & { readonly expectedCurrentGrantId: string }) {
    return this.link(command, "Replace", () => this.lifecycle.replace(command));
  }
  async revoke(command: { readonly context: TrustedActorContext; readonly grantId: string }): Promise<PublicShareManagementResult<PublicShareRevokeResult>> {
    const denied = authorizePublicShareManagement(command.context, false);
    if (denied) return { ok: false, error: denied };
    if (!canonicalId(command.grantId)) return { ok: false, error: "NotFound" };
    return this.admitted(command.context, "Revoke", async () => {
      const result = await this.lifecycle.revoke(command);
      return !result.ok && result.error === "BranchScopeDenied" ? { ok: false, error: "NotFound" } : result;
    });
  }
}
