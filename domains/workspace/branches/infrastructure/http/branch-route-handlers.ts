import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { BranchResult } from "../../application/branch-results";
import type { BranchServerApplication } from "../branch-server-runtime";

type Open = () => BranchServerApplication; type Body = Record<string, unknown>;
const json = (value: unknown, status = 200) => Response.json(value, { status });
const response = <T>(result: BranchResult<T>, created = false) => result.ok ? json({ type: "Success", value: result.value }, created ? 201 : 200) : json({ type: result.error }, result.error === "Forbidden" ? 403 : result.error === "NotFound" ? 404 : result.error === "Conflict" || result.error === "CodeConflict" ? 409 : 400);
const bodyOf = async (request: Request): Promise<Body | null> => { try { const body = await request.json() as unknown; return body && typeof body === "object" && !Array.isArray(body) ? body as Body : null; } catch { return null; } };
const withApp = async (open: Open, request: Request, write: boolean, work: (app: BranchServerApplication, context: TrustedActorContext) => Promise<Response>) => { let app: BranchServerApplication | undefined; try { app = open(); if (write && !app.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403); return await work(app, await app.context.resolve(request)); } catch (error) { if (error instanceof AuthenticatedContextUnavailableError) return json({ type: "AuthenticationRequired" }, 401); if (error instanceof RestrictedSessionContextError) return json({ type: "ForbiddenForRestrictedSession" }, 403); return json({ type: "BranchServiceUnavailable" }, 503); } finally { try { await app?.close(); } catch {} } };

export const createBranchRouteHandlers = (open: Open) => ({
  list: (request: Request) => withApp(open, request, false, async (app, context) => response(await app.list.execute({ context }))),
  get: (request: Request, branchId: string) => withApp(open, request, false, async (app, context) => response(await app.get.execute({ context, branchId }))),
  create: (request: Request) => withApp(open, request, true, async (app, context) => { const body = await bodyOf(request); return body && typeof body.code === "string" && typeof body.displayName === "string" && typeof body.sortOrder === "number" ? response(await app.create.execute({ context, code: body.code, displayName: body.displayName, sortOrder: body.sortOrder }), true) : json({ type: "InvalidInput" }, 400); }),
  update: (request: Request, branchId: string) => withApp(open, request, true, async (app, context) => { const body = await bodyOf(request); if (!body || typeof body.expectedRevision !== "number") return json({ type: "InvalidInput" }, 400); return response(await app.update.execute({ context, branchId, expectedRevision: body.expectedRevision, ...(typeof body.displayName === "string" ? { displayName: body.displayName } : {}), ...(typeof body.sortOrder === "number" ? { sortOrder: body.sortOrder } : {}), ...(body.status === "Active" || body.status === "Inactive" ? { status: body.status } : {}) })); }),
});
