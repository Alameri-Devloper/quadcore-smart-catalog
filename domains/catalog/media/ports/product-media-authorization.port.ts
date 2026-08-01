import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";

export interface TrustedActorContext {
  readonly workspaceId: WorkspaceId;
  readonly actorId: string;
}

export interface ProductEditAuthorizationPort {
  canEditProduct(actor: TrustedActorContext, productId: ProductId): Promise<boolean>;
}
