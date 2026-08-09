import { WorkspaceId } from "../../types/product-identity.value-object";
import { PRODUCT_ENTRY_PERMISSIONS, ProductEntryActorId, type ProductEntryExecutionContext, type ProductEntryPermission } from "../application/product-entry-execution-context";
import {
  ProductEntryTrustedContextUnavailableError,
  type ProductEntryTrustedContextResolver,
} from "../ports/product-entry-trusted-context.port";

const SUPPORTED_PERMISSIONS = new Set<string>(Object.values(PRODUCT_ENTRY_PERMISSIONS));

export type ProductEntryTrustedContextEnvironment = Readonly<{
  NODE_ENV?: string;
  QSC_TRUSTED_WORKSPACE_ID?: string;
  QSC_TRUSTED_ACTOR_ID?: string;
  QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS?: string;
}>;

export class DevelopmentEnvironmentProductEntryTrustedContextResolver implements ProductEntryTrustedContextResolver {
  constructor(private readonly environment: ProductEntryTrustedContextEnvironment = process.env) {}

  async resolve(request: Request): Promise<ProductEntryExecutionContext> {
    void request;
    if (this.environment.NODE_ENV !== "development" && this.environment.NODE_ENV !== "test") {
      throw new ProductEntryTrustedContextUnavailableError();
    }

    const workspaceId = this.environment.QSC_TRUSTED_WORKSPACE_ID?.trim();
    const actorId = this.environment.QSC_TRUSTED_ACTOR_ID?.trim();
    const configuredPermissions = this.environment.QSC_TRUSTED_PRODUCT_ENTRY_PERMISSIONS?.trim();
    if (!workspaceId || !actorId || !configuredPermissions) {
      throw new ProductEntryTrustedContextUnavailableError();
    }

    const permissions = configuredPermissions.split(",").map((value) => value.trim());
    if (
      permissions.length === 0 ||
      permissions.some((permission) => permission.length === 0 || !SUPPORTED_PERMISSIONS.has(permission)) ||
      new Set(permissions).size !== permissions.length
    ) {
      throw new ProductEntryTrustedContextUnavailableError();
    }

    try {
      return Object.freeze({
        workspaceId: WorkspaceId.create(workspaceId),
        actorId: ProductEntryActorId.create(actorId),
        permissions: new Set(permissions as ProductEntryPermission[]),
      });
    } catch {
      throw new ProductEntryTrustedContextUnavailableError();
    }
  }
}

export class FailClosedProductEntryTrustedContextResolver implements ProductEntryTrustedContextResolver {
  async resolve(request: Request): Promise<ProductEntryExecutionContext> {
    void request;
    throw new ProductEntryTrustedContextUnavailableError();
  }
}

export const productEntryTrustedContextResolverForEnvironment = (
  environment: ProductEntryTrustedContextEnvironment = process.env,
): ProductEntryTrustedContextResolver => environment.NODE_ENV === "development" || environment.NODE_ENV === "test"
  ? new DevelopmentEnvironmentProductEntryTrustedContextResolver(environment)
  : new FailClosedProductEntryTrustedContextResolver();
