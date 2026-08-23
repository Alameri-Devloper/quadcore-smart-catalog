import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { Branch, type BranchStatus, normalizeBranchCode, normalizeBranchDisplayName, validateBranchSortOrder } from "../domain/branch";
import type { BranchClock, BranchIdentifierGenerator, BranchUnitOfWork } from "../ports/branch-unit-of-work.port";
import { branchFailure, branchSuccess, type BranchResult } from "./branch-results";

const can = (context: TrustedActorContext, permission: "workspace.branches.view" | "workspace.branches.manage") => context.role === "Owner" || context.permissions.includes(permission);
const view = (branch: Branch) => { const value = branch.value; return { ...value, createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt.toISOString() }; };

export class ListBranchesUseCase {
  constructor(private readonly unitOfWork: BranchUnitOfWork) {}
  async execute(command: { readonly context: TrustedActorContext }): Promise<BranchResult<readonly ReturnType<typeof view>[]>> {
    if (!can(command.context, "workspace.branches.view") && !can(command.context, "workspace.branches.manage")) return branchFailure("Forbidden");
    return this.unitOfWork.execute(async ({ branches }) => {
      const values = (await branches.list(command.context.workspaceId)).filter((branch) => command.context.branchScope.type === "AllBranches" || command.context.branchScope.branchIds.includes(branch.value.branchId));
      return branchSuccess(Object.freeze(values.map(view)));
    });
  }
}

export class GetBranchUseCase {
  constructor(private readonly unitOfWork: BranchUnitOfWork) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string }): Promise<BranchResult<ReturnType<typeof view>>> {
    if ((!can(command.context, "workspace.branches.view") && !can(command.context, "workspace.branches.manage")) || (command.context.branchScope.type === "SelectedBranches" && !command.context.branchScope.branchIds.includes(command.branchId))) return branchFailure("NotFound");
    return this.unitOfWork.execute(async ({ branches }) => { const branch = await branches.find(command.context.workspaceId, command.branchId); return branch ? branchSuccess(view(branch)) : branchFailure("NotFound"); });
  }
}

interface Dependencies { readonly unitOfWork: BranchUnitOfWork; readonly clock: BranchClock; readonly identifiers: BranchIdentifierGenerator }

export class CreateBranchUseCase {
  constructor(private readonly dependencies: Dependencies) {}
  async execute(command: { readonly context: TrustedActorContext; readonly code: string; readonly displayName: string; readonly sortOrder: number }): Promise<BranchResult<ReturnType<typeof view>>> {
    if (!can(command.context, "workspace.branches.manage")) return branchFailure("Forbidden");
    try {
      const now = this.dependencies.clock.now();
      const branch = Branch.create({ workspaceId: command.context.workspaceId, branchId: this.dependencies.identifiers.next(), code: normalizeBranchCode(command.code), displayName: normalizeBranchDisplayName(command.displayName), sortOrder: validateBranchSortOrder(command.sortOrder), createdAt: now });
      return this.dependencies.unitOfWork.execute(async ({ branches, audit }) => {
        const outcome = await branches.create(branch);
        if (outcome !== "Created") return branchFailure(outcome === "CodeConflict" ? "CodeConflict" : "Conflict");
        await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "BranchCreated", branchId: branch.value.branchId, metadata: { code: branch.value.code }, occurredAt: now });
        return branchSuccess(view(branch));
      });
    } catch { return branchFailure("InvalidInput"); }
  }
}

export class UpdateBranchUseCase {
  constructor(private readonly dependencies: Omit<Dependencies, "identifiers">) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly expectedRevision: number; readonly displayName?: string; readonly sortOrder?: number; readonly status?: BranchStatus }): Promise<BranchResult<ReturnType<typeof view>>> {
    if (!can(command.context, "workspace.branches.manage")) return branchFailure("Forbidden");
    try {
      const now = this.dependencies.clock.now();
      return this.dependencies.unitOfWork.execute(async ({ branches, audit }) => {
        const branch = await branches.find(command.context.workspaceId, command.branchId, true);
        if (!branch) return branchFailure("NotFound");
        if (branch.value.revision !== command.expectedRevision) return branchFailure("Conflict");
        const previousStatus = branch.value.status;
        branch.update({ ...(command.displayName !== undefined ? { displayName: command.displayName } : {}), ...(command.sortOrder !== undefined ? { sortOrder: command.sortOrder } : {}), ...(command.status !== undefined ? { status: command.status } : {}) }, now);
        const outcome = await branches.update(branch, command.expectedRevision);
        if (outcome !== "Updated") return branchFailure(outcome === "NotFound" ? "NotFound" : "Conflict");
        const eventType = command.status && command.status !== previousStatus ? (command.status === "Active" ? "BranchActivated" : "BranchDeactivated") : "BranchUpdated";
        await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType, branchId: command.branchId, metadata: { revision: branch.value.revision }, occurredAt: now });
        return branchSuccess(view(branch));
      });
    } catch { return branchFailure("InvalidInput"); }
  }
}
