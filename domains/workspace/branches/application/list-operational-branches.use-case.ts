import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { BranchUnitOfWork } from "../ports/branch-unit-of-work.port";
import { branchFailure, branchSuccess, type BranchResult } from "./branch-results";
import {
  canSelectOperationalBranches,
  isOperationalBranchSelectorPurpose,
  type OperationalBranchOption,
} from "./operational-branch-selector";

export class ListOperationalBranchesUseCase {
  constructor(private readonly unitOfWork: BranchUnitOfWork) {}

  async execute(command: {
    readonly context: TrustedActorContext;
    readonly purpose: string;
  }): Promise<BranchResult<readonly OperationalBranchOption[]>> {
    if (!isOperationalBranchSelectorPurpose(command.purpose)) return branchFailure("InvalidInput");
    if (!canSelectOperationalBranches(command.context, command.purpose)) return branchFailure("Forbidden");

    return this.unitOfWork.execute(async ({ branches }) => {
      const values = (await branches.list(command.context.workspaceId)).map((branch) => branch.value);
      // A tenant mismatch is an infrastructure failure, even for a row outside selected scope.
      if (values.some((branch) => branch.workspaceId !== command.context.workspaceId)) {
        throw new Error("InvalidOperationalBranchWorkspace");
      }
      const scope = command.context.branchScope;
      const scoped = scope.type === "AllBranches"
        ? values
        : values.filter((branch) => scope.branchIds.includes(branch.branchId));
      return branchSuccess(Object.freeze(scoped.map((branch): OperationalBranchOption => Object.freeze({
        branchId: branch.branchId,
        code: branch.code,
        displayName: branch.displayName,
        status: branch.status,
      }))));
    });
  }
}
