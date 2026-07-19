import type { DomainEvent } from "./domain-event";
import { ProductCreated } from "./product-created.event";
import {
  ProductIdentity,
  type ProductIdentityInput,
} from "./product-identity.value-object";
import {
  ProductLifecycleState,
  type ProductLifecycleStateValue,
} from "./product-lifecycle-state.value-object";

export interface CreateProductInput extends ProductIdentityInput {
  createdAt: Date;
}

export interface RehydrateProductInput extends ProductIdentityInput {
  lifecycleState: ProductLifecycleStateValue;
  createdAt: Date;
  updatedAt: Date;
}

interface ProductState {
  identity: ProductIdentity;
  lifecycleState: ProductLifecycleState;
  createdAtEpoch: number;
  updatedAtEpoch: number;
}

const getValidTime = (name: string, value: Date): number => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    throw new Error(`${name} must be a valid Date.`);
  }

  return value.getTime();
};

export class Product {
  private readonly domainEvents: DomainEvent[] = [];
  private readonly state: ProductState;

  private constructor(state: ProductState) {
    this.state = state;
  }

  static create(input: CreateProductInput): Product {
    const createdAtEpoch = getValidTime("CreatedAt", input.createdAt);
    const identity = ProductIdentity.create(input);
    const product = new Product({
      identity,
      lifecycleState: ProductLifecycleState.draft(),
      createdAtEpoch,
      updatedAtEpoch: createdAtEpoch,
    });

    product.recordEvent(
      new ProductCreated(
        identity.productId,
        identity.workspaceId,
        identity.catalogId,
        input.createdAt,
      ),
    );

    return product;
  }

  static rehydrate(input: RehydrateProductInput): Product {
    const createdAtEpoch = getValidTime("CreatedAt", input.createdAt);
    const updatedAtEpoch = getValidTime("UpdatedAt", input.updatedAt);

    if (createdAtEpoch > updatedAtEpoch) {
      throw new Error("CreatedAt cannot be later than UpdatedAt.");
    }

    return new Product({
      identity: ProductIdentity.create(input),
      lifecycleState: ProductLifecycleState.rehydrate(input.lifecycleState),
      createdAtEpoch,
      updatedAtEpoch,
    });
  }

  get identity(): ProductIdentity {
    return this.state.identity;
  }

  get lifecycleState(): ProductLifecycleState {
    return this.state.lifecycleState;
  }

  get createdAt(): Date {
    return new Date(this.state.createdAtEpoch);
  }

  get updatedAt(): Date {
    return new Date(this.state.updatedAtEpoch);
  }

  get events(): readonly DomainEvent[] {
    return [...this.domainEvents];
  }

  pullDomainEvents(): readonly DomainEvent[] {
    const recordedEvents = [...this.domainEvents];
    this.domainEvents.length = 0;
    return recordedEvents;
  }

  private recordEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}
