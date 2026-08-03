import type { ProductCode } from "../../types/product-code.value-object";
import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";

export interface ProductEntryProductIdAllocator {
  allocate(workspaceId: WorkspaceId): Promise<ProductId>;
}

export interface ProductEntryProductCodeAllocator {
  allocate(workspaceId: WorkspaceId): Promise<ProductCode>;
}
