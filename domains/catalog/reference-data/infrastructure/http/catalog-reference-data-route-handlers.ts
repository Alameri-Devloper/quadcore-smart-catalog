import { AuthenticatedContextUnavailableError, RestrictedSessionContextError, type TrustedActorContext } from "../../../../../shared/auth/trusted-actor-context";
import type { CatalogReferenceDataResult } from "../../application/catalog-reference-data-result";
import type { CatalogReferenceDataServerApplication } from "../catalog-reference-data-server-runtime";
import { CatalogReferencePersistenceConflictError } from "../persistence/postgresql-catalog-reference-data-unit-of-work";

type OpenApplication = () => CatalogReferenceDataServerApplication;
type Body = Record<string, unknown>;

const json = (value: unknown, status = 200) => Response.json(value, { status });
const resultResponse = <T>(result: CatalogReferenceDataResult<T>, successStatus = 200): Response => {
  if (result.ok) return json({ type: "Success", value: result.value }, successStatus);
  const status = result.error === "Forbidden" ? 403 : result.error === "NotFound" ? 404 : result.error === "Conflict" ? 409 : 400;
  return json({ type: result.error }, status);
};
const bodyOf = async (request: Request): Promise<Body | null> => {
  try { const value = await request.json() as unknown; return value && typeof value === "object" && !Array.isArray(value) ? value as Body : null; }
  catch { return null; }
};
const string = (body: Body, key: string): string | undefined => typeof body[key] === "string" ? body[key] : undefined;
const number = (body: Body, key: string): number | undefined => typeof body[key] === "number" ? body[key] : undefined;

const withApplication = async (open: OpenApplication, request: Request, write: boolean, work: (application: CatalogReferenceDataServerApplication, context: TrustedActorContext) => Promise<Response>): Promise<Response> => {
  let application: CatalogReferenceDataServerApplication | undefined;
  try {
    application = open();
    if (write && !application.origin.allows(request)) return json({ type: "OriginNotAllowed" }, 403);
    const context = await application.context.resolve(request);
    return await work(application, context);
  } catch (error) {
    if (error instanceof RestrictedSessionContextError) return json({ type: "ForbiddenForRestrictedSession" }, 403);
    if (error instanceof AuthenticatedContextUnavailableError) return json({ type: "AuthenticationRequired" }, 401);
    if (error instanceof CatalogReferencePersistenceConflictError) return json({ type: "Conflict" }, 409);
    return json({ type: "CatalogReferenceDataServiceUnavailable" }, 503);
  } finally { try { await application?.close(); } catch { /* response already selected */ } }
};

const createCommand = (context: TrustedActorContext, body: Body) => {
  const code = string(body, "code"); const displayName = string(body, "displayName"); const sortOrder = number(body, "sortOrder");
  return code !== undefined && displayName !== undefined && sortOrder !== undefined ? { context, code, displayName, sortOrder } : null;
};
const updateCommand = (context: TrustedActorContext, id: string, body: Body) => {
  const expectedVersion = number(body, "expectedVersion");
  if (expectedVersion === undefined) return null;
  return { context, id, expectedVersion, ...(string(body, "displayName") !== undefined ? { displayName: string(body, "displayName") } : {}), ...(number(body, "sortOrder") !== undefined ? { sortOrder: number(body, "sortOrder") } : {}), ...(string(body, "status") !== undefined ? { status: string(body, "status") } : {}) };
};

export const createCatalogReferenceDataRouteHandlers = (open: OpenApplication) => ({
  get: (request: Request) => withApplication(open, request, false, async (application, context) => resultResponse(await application.get.execute({ context, includeInactive: new URL(request.url).searchParams.get("includeInactive") === "true" }))),
  createDepartment: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && createCommand(context, body); return command ? resultResponse(await application.createDepartment.execute(command), 201) : json({ type: "InvalidInput" }, 400); }),
  updateDepartment: (request: Request, id: string) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && updateCommand(context, id, body); return command ? resultResponse(await application.updateDepartment.execute(command)) : json({ type: "InvalidInput" }, 400); }),
  createCategory: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && createCommand(context, body); const departmentId = body && string(body, "departmentId"); return command && departmentId ? resultResponse(await application.createCategory.execute({ ...command, departmentId }), 201) : json({ type: "InvalidInput" }, 400); }),
  updateCategory: (request: Request, id: string) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && updateCommand(context, id, body); return command ? resultResponse(await application.updateCategory.execute(command)) : json({ type: "InvalidInput" }, 400); }),
  createProductType: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && createCommand(context, body); const categoryId = body && string(body, "categoryId"); return command && categoryId ? resultResponse(await application.createProductType.execute({ ...command, categoryId }), 201) : json({ type: "InvalidInput" }, 400); }),
  updateProductType: (request: Request, id: string) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && updateCommand(context, id, body); return command ? resultResponse(await application.updateProductType.execute(command)) : json({ type: "InvalidInput" }, 400); }),
  createBrand: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && createCommand(context, body); return command ? resultResponse(await application.createBrand.execute(command), 201) : json({ type: "InvalidInput" }, 400); }),
  updateBrand: (request: Request, id: string) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && updateCommand(context, id, body); return command ? resultResponse(await application.updateBrand.execute(command)) : json({ type: "InvalidInput" }, 400); }),
  createSupplyStatus: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && createCommand(context, body); return command ? resultResponse(await application.createSupplyStatus.execute(command), 201) : json({ type: "InvalidInput" }, 400); }),
  updateSupplyStatus: (request: Request, id: string) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && updateCommand(context, id, body); return command ? resultResponse(await application.updateSupplyStatus.execute(command)) : json({ type: "InvalidInput" }, 400); }),
  createSpecificationDefinition: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && createCommand(context, body); const valueType = body && string(body, "valueType"); const unit = body && (body.unit === null ? null : string(body, "unit")); return command && valueType ? resultResponse(await application.createSpecificationDefinition.execute({ ...command, valueType, ...(unit !== undefined ? { unit } : {}) }), 201) : json({ type: "InvalidInput" }, 400); }),
  updateSpecificationDefinition: (request: Request, id: string) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); const command = body && updateCommand(context, id, body); const unit = body && (body.unit === null ? null : string(body, "unit")); return command ? resultResponse(await application.updateSpecificationDefinition.execute({ ...command, ...(body && string(body, "valueType") !== undefined ? { valueType: string(body, "valueType") } : {}), ...(unit !== undefined ? { unit } : {}) })) : json({ type: "InvalidInput" }, 400); }),
  configureConditions: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); return body && Array.isArray(body.values) ? resultResponse(await application.configureConditions.execute({ context, values: body.values as { code: string; enabled: boolean; sortOrder: number }[] })) : json({ type: "InvalidInput" }, 400); }),
  configureCurrencies: (request: Request) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); return body && Array.isArray(body.values) ? resultResponse(await application.configureCurrencies.execute({ context, values: body.values as { code: string; enabled: boolean; sortOrder: number }[] })) : json({ type: "InvalidInput" }, 400); }),
  configureTemplate: (request: Request, productTypeId: string) => withApplication(open, request, true, async (application, context) => { const body = await bodyOf(request); return body && Array.isArray(body.entries) ? resultResponse(await application.configureTemplate.execute({ context, productTypeId, entries: body.entries as { specificationDefinitionId: string; sortOrder: number; required?: boolean }[], ...(number(body, "expectedVersion") !== undefined ? { expectedVersion: number(body, "expectedVersion") } : {}) })) : json({ type: "InvalidInput" }, 400); }),
});
