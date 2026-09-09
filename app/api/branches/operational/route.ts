import { createBranchRouteHandlers } from "@/domains/workspace/branches/infrastructure/http/branch-route-handlers";
import { openBranchServerApplication } from "@/domains/workspace/branches/infrastructure/branch-server-runtime";

export const runtime = "nodejs";
export const GET = (request: Request) => createBranchRouteHandlers(openBranchServerApplication).operationalList(request);
