import type { AuthenticatedRequestContextResolver } from "../../../shared/auth/trusted-actor-context";
import { GetOperationalManagementCapabilitiesUseCase } from "../application/get-operational-management-capabilities.use-case";
import { IdentityAuthenticatedRequestContextResolver } from "./identity-server-runtime";

export interface OperationalManagementCapabilityServerApplication {
  readonly context: AuthenticatedRequestContextResolver;
  readonly capabilities: Pick<GetOperationalManagementCapabilitiesUseCase, "execute">;
}

export type OperationalManagementCapabilityServerApplicationFactory =
  () => OperationalManagementCapabilityServerApplication;

export const openOperationalManagementCapabilityServerApplication:
OperationalManagementCapabilityServerApplicationFactory = () => Object.freeze({
  context: new IdentityAuthenticatedRequestContextResolver(),
  capabilities: new GetOperationalManagementCapabilitiesUseCase(),
});
