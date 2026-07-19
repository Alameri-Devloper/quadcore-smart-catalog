const assertIdentifierValue = (name: string, value: string): void => {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} cannot be empty.`);
  }
};

export class ProductId {
  private readonly internalValue: string;

  private constructor(value: string) {
    this.internalValue = value;
    Object.freeze(this);
  }

  static create(value: string): ProductId {
    assertIdentifierValue("ProductId", value);
    return new ProductId(value);
  }

  get value(): string {
    return this.internalValue;
  }
}

export class WorkspaceId {
  private readonly internalValue: string;

  private constructor(value: string) {
    this.internalValue = value;
    Object.freeze(this);
  }

  static create(value: string): WorkspaceId {
    assertIdentifierValue("WorkspaceId", value);
    return new WorkspaceId(value);
  }

  get value(): string {
    return this.internalValue;
  }
}

export class CatalogId {
  private readonly internalValue: string;

  private constructor(value: string) {
    this.internalValue = value;
    Object.freeze(this);
  }

  static create(value: string): CatalogId {
    assertIdentifierValue("CatalogId", value);
    return new CatalogId(value);
  }

  get value(): string {
    return this.internalValue;
  }
}

export interface ProductIdentityInput {
  productId: ProductId;
  workspaceId: WorkspaceId;
  catalogId: CatalogId;
}

export class ProductIdentity {
  private readonly internalProductId: ProductId;
  private readonly internalWorkspaceId: WorkspaceId;
  private readonly internalCatalogId: CatalogId;

  private constructor(
    productId: ProductId,
    workspaceId: WorkspaceId,
    catalogId: CatalogId,
  ) {
    this.internalProductId = productId;
    this.internalWorkspaceId = workspaceId;
    this.internalCatalogId = catalogId;
    Object.freeze(this);
  }

  static create(input: ProductIdentityInput): ProductIdentity {
    return new ProductIdentity(
      input.productId,
      input.workspaceId,
      input.catalogId,
    );
  }

  get productId(): ProductId {
    return this.internalProductId;
  }

  get workspaceId(): WorkspaceId {
    return this.internalWorkspaceId;
  }

  get catalogId(): CatalogId {
    return this.internalCatalogId;
  }
}
