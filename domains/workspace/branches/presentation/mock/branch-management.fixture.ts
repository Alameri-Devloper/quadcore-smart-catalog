import type { BranchManagementView } from "../branch-management.types";

export const branchManagementFixture = (overrides: Partial<BranchManagementView> = {}): BranchManagementView => ({
  branchId: "branch-one", code: "main", displayName: "Main branch", status: "Active", sortOrder: 0,
  revision: 1, createdAt: "2026-09-01T00:00:00.000Z", updatedAt: "2026-09-01T00:00:00.000Z", ...overrides,
});
