import { NextResponse } from "next/server";
import { getProductEntryHttpStatus, productEntryRuntimeErrorHttpResponse } from "../../../../../domains/catalog/product-entry/application/product-entry-api-response";
import type { ProductEntryServerApplication } from "../../../../../domains/catalog/product-entry/infrastructure/product-entry-server-runtime";
import { createRequestProductEntryServerRuntime } from "../../product-entry-server-runtime";

export const runtime = "nodejs";

export async function GET(
  request: Request,
  context: { readonly params: Promise<{ readonly submissionId: string }> },
): Promise<NextResponse> {
  let application: ProductEntryServerApplication | undefined;
  let response: NextResponse;
  try {
    const serverRuntime = createRequestProductEntryServerRuntime();
    const executionContext = await serverRuntime.trustedContextResolver.resolve(request);
    application = serverRuntime.open(false);
    const { submissionId } = await context.params;
    const result = await application.get.execute(executionContext, submissionId);
    response = NextResponse.json(result, { status: getProductEntryHttpStatus(result) });
  } catch (error) {
    const unavailable = productEntryRuntimeErrorHttpResponse(error);
    response = NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  try {
    await application?.close();
  } catch (error) {
    const unavailable = productEntryRuntimeErrorHttpResponse(error);
    return NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  return response;
}
