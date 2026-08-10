import {
  AuthenticatedContextUnavailableError,
  RestrictedSessionContextError,
  type AuthenticatedRequestContextResolver,
  type TrustedActorContext,
} from "../../../../shared/auth/trusted-actor-context";
import { WorkspaceId } from "../../types/product-identity.value-object";
import {
  PRODUCT_ENTRY_PERMISSIONS,
  ProductEntryActorId,
  type ProductEntryExecutionContext,
  type ProductEntryPermission,
} from "../application/product-entry-execution-context";
import {
  ProductEntryAuthenticationRequiredError,
  ProductEntryRestrictedSessionError,
  ProductEntryTrustedContextUnavailableError,
  type ProductEntryTrustedContextResolver,
} from "../ports/product-entry-trusted-context.port";

const PRODUCT_ENTRY_PERMISSION_SET = new Set<string>(Object.values(PRODUCT_ENTRY_PERMISSIONS));

const permissionsFor = (context: TrustedActorContext): ReadonlySet<ProductEntryPermission> =>
  new Set(context.permissions.filter((permission): permission is ProductEntryPermission => PRODUCT_ENTRY_PERMISSION_SET.has(permission)));

export class TrustedActorProductEntryContextAdapter implements ProductEntryTrustedContextResolver {
  constructor(private readonly authenticated: AuthenticatedRequestContextResolver) {}

  async resolve(request: Request): Promise<ProductEntryExecutionContext> {
    try {
      const trusted = await this.authenticated.resolve(request);
      return Object.freeze({
        workspaceId: WorkspaceId.create(trusted.workspaceId),
        actorId: ProductEntryActorId.create(trusted.actorId),
        permissions: permissionsFor(trusted),
        branchScope: trusted.branchScope.type === "SelectedBranches"
          ? Object.freeze({ branchIds: new Set(trusted.branchScope.branchIds) })
          : undefined,
      });
    } catch (error) {
      if (error instanceof RestrictedSessionContextError) throw new ProductEntryRestrictedSessionError();
      if (error instanceof AuthenticatedContextUnavailableError) throw new ProductEntryAuthenticationRequiredError();
      throw new ProductEntryTrustedContextUnavailableError();
    }
  }
}
