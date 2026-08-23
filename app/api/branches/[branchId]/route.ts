import { createBranchRouteHandlers } from "@/domains/workspace/branches/infrastructure/http/branch-route-handlers";
import { openBranchServerApplication } from "@/domains/workspace/branches/infrastructure/branch-server-runtime";
export const runtime = "nodejs";
type Context = { params: Promise<{ branchId: string }> };
export const GET = async (request: Request, context: Context) => createBranchRouteHandlers(openBranchServerApplication).get(request, (await context.params).branchId);
export const PATCH = async (request: Request, context: Context) => createBranchRouteHandlers(openBranchServerApplication).update(request, (await context.params).branchId);
