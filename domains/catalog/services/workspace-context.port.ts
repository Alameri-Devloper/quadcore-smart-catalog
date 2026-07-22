import type { WorkspaceId } from "../types/product-identity.value-object";

export interface WorkspaceContext {
  getCurrentWorkspaceId(): WorkspaceId;
}
