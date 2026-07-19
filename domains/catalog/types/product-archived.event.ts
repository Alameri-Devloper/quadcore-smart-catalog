import type { DomainEvent } from "./domain-event";
import type {
  CatalogId,
  ProductId,
  WorkspaceId,
} from "./product-identity.value-object";
import type { ProductLifecycleStateValue } from "./product-lifecycle-state.value-object";

export const PRODUCT_ARCHIVED_EVENT_NAME = "ProductArchived" as const;

export class ProductArchived implements DomainEvent {
  readonly eventName = PRODUCT_ARCHIVED_EVENT_NAME;
  readonly productId: ProductId;
  readonly workspaceId: WorkspaceId;
  readonly catalogId: CatalogId;
  readonly previousLifecycleState: ProductLifecycleStateValue;
  readonly currentLifecycleState: ProductLifecycleStateValue;
  readonly resultingRevision: number;
  private readonly occurredAtEpoch: number;

  constructor(
    productId: ProductId,
    workspaceId: WorkspaceId,
    catalogId: CatalogId,
    occurredAt: Date,
    previousLifecycleState: ProductLifecycleStateValue,
    currentLifecycleState: ProductLifecycleStateValue,
    resultingRevision: number,
  ) {
    this.productId = productId;
    this.workspaceId = workspaceId;
    this.catalogId = catalogId;
    this.previousLifecycleState = previousLifecycleState;
    this.currentLifecycleState = currentLifecycleState;
    this.resultingRevision = resultingRevision;
    this.occurredAtEpoch = occurredAt.getTime();
    Object.freeze(this);
  }

  get occurredAt(): Date {
    return new Date(this.occurredAtEpoch);
  }
}
