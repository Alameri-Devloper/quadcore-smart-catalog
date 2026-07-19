import type { DomainEvent } from "./domain-event";
import type {
  CatalogId,
  ProductId,
  WorkspaceId,
} from "./product-identity.value-object";

export const PRODUCT_CREATED_EVENT_NAME = "ProductCreated" as const;

export class ProductCreated implements DomainEvent {
  readonly eventName = PRODUCT_CREATED_EVENT_NAME;
  readonly productId: ProductId;
  readonly workspaceId: WorkspaceId;
  readonly catalogId: CatalogId;

  private readonly occurredAtEpoch: number;

  constructor(
    productId: ProductId,
    workspaceId: WorkspaceId,
    catalogId: CatalogId,
    occurredAt: Date,
  ) {
    this.productId = productId;
    this.workspaceId = workspaceId;
    this.catalogId = catalogId;
    this.occurredAtEpoch = occurredAt.getTime();
  }

  get occurredAt(): Date {
    return new Date(this.occurredAtEpoch);
  }
}
