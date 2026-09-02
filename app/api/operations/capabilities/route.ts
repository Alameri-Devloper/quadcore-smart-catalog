import { createOperationalManagementCapabilityRouteHandler } from "@/domains/identity/infrastructure/http/operational-management-capability-route-handler";
import { openOperationalManagementCapabilityServerApplication } from "@/domains/identity/infrastructure/operational-management-capability-server-runtime";

export const runtime = "nodejs";

export const GET = createOperationalManagementCapabilityRouteHandler(
  openOperationalManagementCapabilityServerApplication,
);
