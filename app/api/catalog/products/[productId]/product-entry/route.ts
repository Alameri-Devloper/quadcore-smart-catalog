import { NextResponse } from "next/server";
import { productEntryRuntimeErrorHttpResponse } from "@/domains/catalog/product-entry/application/product-entry-api-response";
import { createProductEntryServerRuntime, type ProductEntryServerApplication } from "@/domains/catalog/product-entry/infrastructure/product-entry-server-runtime";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  routeContext: { readonly params: Promise<{ readonly productId: string }> },
): Promise<NextResponse> {
  let application: ProductEntryServerApplication | undefined;
  let response: NextResponse;
  try {
    const serverRuntime = createProductEntryServerRuntime();
    const context = await serverRuntime.trustedContextResolver.resolve();
    application = serverRuntime.open(false);
    const { productId } = await routeContext.params;
    const result = await application.getProduct.execute(context, productId);
    const status = result.type === "Found" ? 200 : result.type === "NotFound" ? 404 : result.type === "Forbidden" ? 403 : 400;
    response = NextResponse.json(result, { status });
  } catch (error) {
    const unavailable = productEntryRuntimeErrorHttpResponse(error);
    response = NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  try { await application?.close(); }
  catch (error) {
    const unavailable = productEntryRuntimeErrorHttpResponse(error);
    return NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  return response;
}
