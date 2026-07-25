import type { WorkspaceId } from "../../types/product-identity.value-object";
import type { DepartmentStorageSegment } from "../domain/product-media-keys";

export interface DepartmentId {
  readonly value: string;
}

export interface DepartmentStorageSegmentResolver {
  resolve(input: {
    readonly workspaceId: WorkspaceId;
    readonly departmentId: DepartmentId | null;
  }): Promise<DepartmentStorageSegment>;
}
