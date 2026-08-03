import { randomUUID } from "node:crypto";
import { ProductCode } from "../../types/product-code.value-object";
import { ProductId, type WorkspaceId } from "../../types/product-identity.value-object";
import type { ProductEntryProductCodeAllocator, ProductEntryProductIdAllocator } from "../ports/product-entry-identity-allocator.port";

export class RandomProductEntryProductIdAllocator implements ProductEntryProductIdAllocator {
  async allocate(workspaceId: WorkspaceId): Promise<ProductId> {
    void workspaceId;
    return ProductId.create(randomUUID());
  }
}

/**
 * Collision-safe Phase 1 fallback. This is not the final human-friendly
 * commercial Product Code policy.
 */
export class FallbackUuidProductEntryProductCodeAllocator implements ProductEntryProductCodeAllocator {
  async allocate(workspaceId: WorkspaceId): Promise<ProductCode> {
    void workspaceId;
    return ProductCode.create(`QSC-${randomUUID()}`);
  }
}
