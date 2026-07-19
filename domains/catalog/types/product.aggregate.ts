import type { DomainEvent } from "./domain-event";
import { ProductArchived } from "./product-archived.event";
import { ProductCreated } from "./product-created.event";
import {
  ProductClassification,
  type ProductClassificationInput,
} from "./product-classification.value-object";
import {
  ProductCommercialDetails,
  type ProductCommercialDetailsInput,
} from "./product-commercial-details.value-object";
import {
  ProductIdentity,
  type ProductIdentityInput,
} from "./product-identity.value-object";
import {
  createProductImages,
  type ProductImage,
  type ProductImageInput,
} from "./product-image.value-object";
import {
  PRODUCT_LIFECYCLE_STATES,
  ProductLifecycleState,
  type ProductLifecycleStateValue,
} from "./product-lifecycle-state.value-object";
import {
  assertCurrentApprovedPublicationDecision,
  type ProductPublicationDecision,
} from "./product-publication-policy";
import { ProductPublished } from "./product-published.event";
import { ProductRestored } from "./product-restored.event";
import { ProductRevision } from "./product-revision.value-object";
import {
  createProductSpecificationValues,
  type ProductSpecificationValue,
  type ProductSpecificationValueInput,
} from "./product-specification-value.value-object";

export interface CreateProductInput extends ProductIdentityInput {
  createdAt: Date;
  classification?: ProductClassificationInput;
  commercialDetails?: ProductCommercialDetailsInput;
  specificationValues?: readonly ProductSpecificationValueInput[];
  images?: readonly ProductImageInput[];
}

export interface RehydrateProductInput extends ProductIdentityInput {
  lifecycleState: ProductLifecycleStateValue;
  revision: number;
  createdAt: Date;
  updatedAt: Date;
  classification?: ProductClassificationInput;
  commercialDetails?: ProductCommercialDetailsInput;
  specificationValues?: readonly ProductSpecificationValueInput[];
  images?: readonly ProductImageInput[];
}

interface ProductState {
  identity: ProductIdentity;
  lifecycleState: ProductLifecycleState;
  classification?: ProductClassification;
  commercialDetails?: ProductCommercialDetails;
  specificationValues: ProductSpecificationValue[];
  images: ProductImage[];
  revision: ProductRevision;
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
      classification: input.classification
        ? ProductClassification.create(input.classification)
        : undefined,
      commercialDetails: ProductCommercialDetails.create(
        input.commercialDetails,
      ),
      specificationValues: createProductSpecificationValues(
        input.specificationValues ?? [],
      ),
      images: createProductImages(input.images ?? []),
      revision: ProductRevision.initial(),
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
      classification: input.classification
        ? ProductClassification.create(input.classification)
        : undefined,
      commercialDetails: input.commercialDetails
        ? ProductCommercialDetails.create(input.commercialDetails)
        : undefined,
      specificationValues: createProductSpecificationValues(
        input.specificationValues ?? [],
      ),
      images: createProductImages(input.images ?? []),
      revision: ProductRevision.rehydrate(input.revision),
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

  get classification(): ProductClassification | undefined {
    return this.state.classification;
  }

  get commercialDetails(): ProductCommercialDetails | undefined {
    return this.state.commercialDetails;
  }

  get specificationValues(): readonly ProductSpecificationValue[] {
    return [...this.state.specificationValues];
  }

  get images(): readonly ProductImage[] {
    return [...this.state.images];
  }

  get revision(): ProductRevision {
    return this.state.revision;
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

  updateClassification(
    input: ProductClassificationInput | undefined,
    updatedAt: Date,
  ): boolean {
    const updatedAtEpoch = this.getValidUpdateTime(updatedAt);
    const classification = input
      ? ProductClassification.create(input)
      : undefined;

    if (optionalClassificationEquals(this.state.classification, classification)) {
      return false;
    }

    const resultingRevision = this.state.revision.next();
    this.state.classification = classification;
    this.state.updatedAtEpoch = updatedAtEpoch;
    this.state.revision = resultingRevision;
    return true;
  }

  updateCommercialDetails(
    input: ProductCommercialDetailsInput,
    updatedAt: Date,
  ): boolean {
    const updatedAtEpoch = this.getValidUpdateTime(updatedAt);
    const commercialDetails = ProductCommercialDetails.create(input);

    if (this.state.commercialDetails?.equals(commercialDetails) === true) {
      return false;
    }

    const resultingRevision = this.state.revision.next();
    this.state.commercialDetails = commercialDetails;
    this.state.updatedAtEpoch = updatedAtEpoch;
    this.state.revision = resultingRevision;
    return true;
  }

  replaceSpecificationValues(
    inputs: readonly ProductSpecificationValueInput[],
    updatedAt: Date,
  ): boolean {
    const updatedAtEpoch = this.getValidUpdateTime(updatedAt);
    const specificationValues = createProductSpecificationValues(inputs);

    if (arraysEqual(this.state.specificationValues, specificationValues)) {
      return false;
    }

    const resultingRevision = this.state.revision.next();
    this.state.specificationValues = specificationValues;
    this.state.updatedAtEpoch = updatedAtEpoch;
    this.state.revision = resultingRevision;
    return true;
  }

  replaceImages(
    inputs: readonly ProductImageInput[],
    updatedAt: Date,
  ): boolean {
    const updatedAtEpoch = this.getValidUpdateTime(updatedAt);
    const images = createProductImages(inputs);

    if (arraysEqual(this.state.images, images)) {
      return false;
    }

    const resultingRevision = this.state.revision.next();
    this.state.images = images;
    this.state.updatedAtEpoch = updatedAtEpoch;
    this.state.revision = resultingRevision;
    return true;
  }

  publish(
    decision: ProductPublicationDecision,
    effectiveTime: Date,
  ): void {
    if (this.state.lifecycleState.value !== PRODUCT_LIFECYCLE_STATES.draft) {
      throw new Error("Only a Draft Product can be published.");
    }

    const effectiveTimeEpoch = this.getValidUpdateTime(effectiveTime);
    assertCurrentApprovedPublicationDecision(
      decision,
      this.state.identity.productId,
      this.state.revision,
    );

    const resultingRevision = this.state.revision.next();
    const lifecycleState = ProductLifecycleState.published();
    const event = new ProductPublished(
      this.state.identity.productId,
      this.state.identity.workspaceId,
      this.state.identity.catalogId,
      new Date(effectiveTimeEpoch),
      this.state.lifecycleState.value,
      lifecycleState.value,
      resultingRevision.value,
    );

    this.state.lifecycleState = lifecycleState;
    this.state.updatedAtEpoch = effectiveTimeEpoch;
    this.state.revision = resultingRevision;
    this.recordEvent(event);
  }

  archive(effectiveTime: Date): void {
    if (
      this.state.lifecycleState.value !== PRODUCT_LIFECYCLE_STATES.published
    ) {
      throw new Error("Only a Published Product can be archived.");
    }

    const effectiveTimeEpoch = this.getValidUpdateTime(effectiveTime);
    const resultingRevision = this.state.revision.next();
    const lifecycleState = ProductLifecycleState.archived();
    const event = new ProductArchived(
      this.state.identity.productId,
      this.state.identity.workspaceId,
      this.state.identity.catalogId,
      new Date(effectiveTimeEpoch),
      this.state.lifecycleState.value,
      lifecycleState.value,
      resultingRevision.value,
    );

    this.state.lifecycleState = lifecycleState;
    this.state.updatedAtEpoch = effectiveTimeEpoch;
    this.state.revision = resultingRevision;
    this.recordEvent(event);
  }

  restore(
    decision: ProductPublicationDecision,
    effectiveTime: Date,
  ): void {
    if (this.state.lifecycleState.value !== PRODUCT_LIFECYCLE_STATES.archived) {
      throw new Error("Only an Archived Product can be restored.");
    }

    const effectiveTimeEpoch = this.getValidUpdateTime(effectiveTime);
    assertCurrentApprovedPublicationDecision(
      decision,
      this.state.identity.productId,
      this.state.revision,
    );

    const resultingRevision = this.state.revision.next();
    const lifecycleState = ProductLifecycleState.published();
    const event = new ProductRestored(
      this.state.identity.productId,
      this.state.identity.workspaceId,
      this.state.identity.catalogId,
      new Date(effectiveTimeEpoch),
      this.state.lifecycleState.value,
      lifecycleState.value,
      resultingRevision.value,
    );

    this.state.lifecycleState = lifecycleState;
    this.state.updatedAtEpoch = effectiveTimeEpoch;
    this.state.revision = resultingRevision;
    this.recordEvent(event);
  }

  private getValidUpdateTime(updatedAt: Date): number {
    const updatedAtEpoch = getValidTime("UpdatedAt", updatedAt);

    if (updatedAtEpoch < this.state.updatedAtEpoch) {
      throw new Error("UpdatedAt cannot move backwards.");
    }

    return updatedAtEpoch;
  }

  private recordEvent(event: DomainEvent): void {
    this.domainEvents.push(event);
  }
}

const optionalClassificationEquals = (
  left: ProductClassification | undefined,
  right: ProductClassification | undefined,
): boolean =>
  left === undefined ? right === undefined : left.equals(right);

interface Equatable<T> {
  equals(other: T): boolean;
}

const arraysEqual = <T extends Equatable<T>>(
  left: readonly T[],
  right: readonly T[],
): boolean =>
  left.length === right.length &&
  left.every((value, index) => value.equals(right[index]));
