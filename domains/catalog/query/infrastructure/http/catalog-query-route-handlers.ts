import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { CatalogQueryResult } from "../../application/catalog-query-results";
import type { CatalogSearchInput } from "../../application/catalog-query.use-cases";
import type { CatalogQueryServerApplication } from "../catalog-query-server-runtime";

type Open = () => CatalogQueryServerApplication;
const json = (value: unknown, status = 200) => Response.json(value, { status, headers: { "cache-control": "private, no-store" } });
const response = <T>(result: CatalogQueryResult<T>) => result.ok ? json({ type: "Success", value: result.value }) : json({ type: result.error }, result.error === "Forbidden" ? 403 : result.error === "BranchNotFound" || result.error === "ProductNotFound" || result.error === "MediaUnavailable" ? 404 : 400);
const withApp = async (open: Open, request: Request, work: (app: CatalogQueryServerApplication, context: TrustedActorContext) => Promise<Response>) => { let app: CatalogQueryServerApplication | undefined; try { app = open(); return await work(app, await app.context.resolve(request)); } catch (error) { if (error instanceof AuthenticatedContextUnavailableError) return json({ type: "AuthenticationRequired" }, 401); if (error instanceof RestrictedSessionContextError) return json({ type: "ForbiddenForRestrictedSession" }, 403); return json({ type: "CatalogQueryServiceUnavailable" }, 503); } finally { try { await app?.close(); } catch {} } };
const allowed = new Set(["q","branchId","departmentId","categoryId","productTypeId","brandId","deviceClass","condition","supplyStatusId","lifecycle","listing","stock","minRetailPrice","maxRetailPrice","retailCurrency","sort","cursor","limit"]);
const parseSearch = (request: Request): CatalogSearchInput | null => { const params = new URL(request.url).searchParams; for (const key of params.keys()) if (!allowed.has(key) || params.getAll(key).length !== 1) return null; const value = (key: string) => params.get(key) ?? undefined; const rawLimit=value("limit"); if(rawLimit!==undefined&&!/^[1-9][0-9]*$/u.test(rawLimit))return null; return { q:value("q"),branchId:value("branchId"),departmentId:value("departmentId"),categoryId:value("categoryId"),productTypeId:value("productTypeId"),brandId:value("brandId"),deviceClass:value("deviceClass"),condition:value("condition"),supplyStatusId:value("supplyStatusId"),lifecycle:value("lifecycle"),listing:value("listing"),stock:value("stock"),minRetailPrice:value("minRetailPrice"),maxRetailPrice:value("maxRetailPrice"),retailCurrency:value("retailCurrency"),sort:value("sort"),cursor:value("cursor"),limit:rawLimit===undefined?undefined:Number(rawLimit) }; };

export const createCatalogQueryRouteHandlers = (open: Open) => ({
  search: (request: Request) => withApp(open, request, async (app, context) => { const input=parseSearch(request); return input ? response(await app.search.execute({context,input})) : json({type:"InvalidQuery"},400); }),
  details: (request: Request, productId: string) => withApp(open, request, async (app, context) => { const params=new URL(request.url).searchParams; if([...params.keys()].some((key)=>key!=="branchId")||params.getAll("branchId").length>1)return json({type:"InvalidQuery"},400); return response(await app.details.execute({context,productId,branchId:params.get("branchId")??undefined})); }),
  filters: (request: Request) => withApp(open, request, async (app, context) => new URL(request.url).search ? json({type:"InvalidQuery"},400) : response(await app.filters.execute({context}))),
  media: (request: Request, productId: string, mediaId: string) => withApp(open, request, async (app, context) => {
    if (new URL(request.url).search) return json({ type: "InvalidQuery" }, 400);
    const result = await app.media.execute({ context, productId, mediaId });
    if (!result.ok) return response(result);
    return new Response(Uint8Array.from(result.value.bytes).buffer, { status: 200, headers: { "cache-control": "private, no-store", "content-type": result.value.contentType, "content-length": String(result.value.bytes.byteLength), "x-content-type-options": "nosniff" } });
  }),
});
