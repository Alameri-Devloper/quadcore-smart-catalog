import { NextResponse } from "next/server";
import { productEntryRuntimeErrorHttpResponse, serializeSubmitProductEntryResult, submitProductEntryHttpStatus } from "../../../../domains/catalog/product-entry/application/product-entry-api-response";
import { createProductEntryServerRuntime, type ProductEntryServerApplication } from "../../../../domains/catalog/product-entry/infrastructure/product-entry-server-runtime";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  let application: ProductEntryServerApplication | undefined;
  let response: NextResponse;
  try {
    const serverRuntime = createProductEntryServerRuntime();
    const context = await serverRuntime.trustedContextResolver.resolve();
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ type: "InvalidRequest", reasons: [{ code: "InvalidStructure" }] }, { status: 400 });
    }
    application = serverRuntime.open(true);
    const result = await application.submit.execute(context, body);
    response = NextResponse.json(serializeSubmitProductEntryResult(result), { status: submitProductEntryHttpStatus(result) });
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
