import { createIdentityRecoveryRouteHandlers } from "@/domains/identity/infrastructure/http/identity-recovery-route-handlers";
import { openIdentityRecoveryServerApplication } from "@/domains/identity/infrastructure/identity-recovery-server-runtime";

const handlers = createIdentityRecoveryRouteHandlers(() => openIdentityRecoveryServerApplication());

export const POST = handlers.request;

