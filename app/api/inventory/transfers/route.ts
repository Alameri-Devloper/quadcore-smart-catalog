import { createInventoryRouteHandlers } from "@/domains/inventory/infrastructure/http/inventory-route-handlers";
import { openInventoryServerApplication } from "@/domains/inventory/infrastructure/inventory-server-runtime";
export const runtime = "nodejs";
export const POST = (request: Request) => createInventoryRouteHandlers(openInventoryServerApplication).transfer(request);
