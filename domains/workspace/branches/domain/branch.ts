export type BranchStatus = "Active" | "Inactive";

export interface BranchState {
  readonly workspaceId: string;
  readonly branchId: string;
  readonly code: string;
  readonly displayName: string;
  readonly status: BranchStatus;
  readonly sortOrder: number;
  readonly revision: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export const normalizeBranchCode = (value: string): string => {
  const code = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (code.length < 1 || code.length > 64 || !CODE_PATTERN.test(code)) throw new Error("InvalidBranchCode");
  return code;
};

export const normalizeBranchDisplayName = (value: string): string => {
  const displayName = value.trim();
  if (displayName.length < 1 || displayName.length > 160) throw new Error("InvalidBranchDisplayName");
  return displayName;
};

export const validateBranchSortOrder = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) throw new Error("InvalidBranchSortOrder");
  return value;
};

export class Branch {
  private constructor(private state: BranchState) {}

  static create(input: Omit<BranchState, "status" | "revision" | "updatedAt">): Branch {
    return Branch.rehydrate({ ...input, code: normalizeBranchCode(input.code), displayName: normalizeBranchDisplayName(input.displayName), sortOrder: validateBranchSortOrder(input.sortOrder), status: "Active", revision: 1, updatedAt: input.createdAt });
  }

  static rehydrate(input: BranchState): Branch {
    if (!input.workspaceId.trim() || !input.branchId.trim() || !Number.isSafeInteger(input.revision) || input.revision < 1 || input.createdAt > input.updatedAt || !["Active", "Inactive"].includes(input.status)) throw new Error("InvalidBranchState");
    return new Branch(Object.freeze({ ...input, code: normalizeBranchCode(input.code), displayName: normalizeBranchDisplayName(input.displayName), sortOrder: validateBranchSortOrder(input.sortOrder), createdAt: new Date(input.createdAt), updatedAt: new Date(input.updatedAt) }));
  }

  get value(): BranchState { return Object.freeze({ ...this.state, createdAt: new Date(this.state.createdAt), updatedAt: new Date(this.state.updatedAt) }); }

  update(input: { readonly displayName?: string; readonly sortOrder?: number; readonly status?: BranchStatus }, now: Date): void {
    if (now < this.state.updatedAt) throw new Error("InvalidBranchTimestamp");
    this.state = Object.freeze({
      ...this.state,
      ...(input.displayName !== undefined ? { displayName: normalizeBranchDisplayName(input.displayName) } : {}),
      ...(input.sortOrder !== undefined ? { sortOrder: validateBranchSortOrder(input.sortOrder) } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      revision: this.state.revision + 1,
      updatedAt: new Date(now),
    });
  }
}
