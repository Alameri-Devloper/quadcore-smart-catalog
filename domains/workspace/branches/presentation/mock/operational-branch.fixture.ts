import type { OperationalBranchView } from "../operational-branch-selector.types";

export const operationalBranchFixture = (overrides: Partial<OperationalBranchView> = {}): OperationalBranchView => ({
  branchId: "branch-main", code: "main", displayName: "Main Branch", status: "Active", ...overrides,
});
