import { TrustedActorProductEntryContextAdapter } from "../../../domains/catalog/product-entry/infrastructure/trusted-actor-product-entry-context.adapter";
import { productEntryTrustedContextResolverForEnvironment } from "../../../domains/catalog/product-entry/infrastructure/environment-product-entry-trusted-context";
import { createProductEntryServerRuntime } from "../../../domains/catalog/product-entry/infrastructure/product-entry-server-runtime";
import { IdentityAuthenticatedRequestContextResolver } from "../../../domains/identity/infrastructure/identity-server-runtime";

export const createRequestProductEntryServerRuntime = () => createProductEntryServerRuntime(
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"
    ? productEntryTrustedContextResolverForEnvironment()
    : new TrustedActorProductEntryContextAdapter(new IdentityAuthenticatedRequestContextResolver()),
);
