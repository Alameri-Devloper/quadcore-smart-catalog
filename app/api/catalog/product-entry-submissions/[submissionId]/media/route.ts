import { NextResponse } from "next/server";
import {
  getProductEntryMediaStatusHttpStatus,
  productEntryMediaRuntimeErrorHttpResponse,
  uploadProductEntryMediaHttpStatus,
} from "../../../../../../domains/catalog/product-entry/application/product-entry-media-api-response";
import type { ProductEntryMediaUploadPart } from "../../../../../../domains/catalog/product-entry/application/product-entry-media-source-mapping";
import {
  createProductEntryServerRuntime,
  type ProductEntryMediaStatusServerApplication,
  type ProductEntryMediaUploadServerApplication,
} from "../../../../../../domains/catalog/product-entry/infrastructure/product-entry-server-runtime";
import {
  PRODUCT_ENTRY_MEDIA_MULTIPART_LIMITS,
  validateProductEntryMediaContentLength,
} from "../../../../../../domains/catalog/product-entry/infrastructure/product-entry-media-multipart-policy";

export const runtime = "nodejs";

const malformedMultipart = (code = "MALFORMED_MULTIPART") => NextResponse.json({
  type: "InvalidRequest",
  code,
}, { status: 400 });

const oversizedMultipart = () => NextResponse.json({
  type: "InvalidRequest",
  code: "SOURCE_TOO_LARGE",
  operationId: null,
}, { status: 413 });

export async function POST(
  request: Request,
  routeContext: { readonly params: Promise<{ readonly submissionId: string }> },
): Promise<NextResponse> {
  let application: ProductEntryMediaUploadServerApplication | undefined;
  let response: NextResponse;
  try {
    const serverRuntime = createProductEntryServerRuntime();
    const executionContext = await serverRuntime.trustedContextResolver.resolve();
    if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) {
      return malformedMultipart();
    }
    const contentLength = validateProductEntryMediaContentLength(request.headers.get("content-length"));
    if (contentLength.type === "Malformed") return malformedMultipart("INVALID_CONTENT_LENGTH");
    if (contentLength.type === "TooLarge") return oversizedMultipart();
    let formData: FormData;
    try { formData = await request.formData(); }
    catch { return malformedMultipart(); }
    const parts: ProductEntryMediaUploadPart[] = [];
    for (const [fieldName, value] of formData.entries()) {
      if (parts.length >= PRODUCT_ENTRY_MEDIA_MULTIPART_LIMITS.maximumEntries) {
        return malformedMultipart("MULTIPART_ENTRY_LIMIT_EXCEEDED");
      }
      if (typeof value === "string") return malformedMultipart();
      parts.push({
        fieldName,
        bytes: new Uint8Array(await value.arrayBuffer()),
        clientMediaType: value.type || null,
      });
    }
    application = await serverRuntime.openMediaUpload();
    const { submissionId } = await routeContext.params;
    const result = await application.upload.execute(executionContext, submissionId, parts);
    response = NextResponse.json(result, { status: uploadProductEntryMediaHttpStatus(result) });
  } catch (error) {
    const unavailable = productEntryMediaRuntimeErrorHttpResponse(error);
    response = NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  try { await application?.close(); }
  catch (error) {
    const unavailable = productEntryMediaRuntimeErrorHttpResponse(error);
    return NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  return response;
}

export async function GET(
  _request: Request,
  routeContext: { readonly params: Promise<{ readonly submissionId: string }> },
): Promise<NextResponse> {
  let application: ProductEntryMediaStatusServerApplication | undefined;
  let response: NextResponse;
  try {
    const serverRuntime = createProductEntryServerRuntime();
    const executionContext = await serverRuntime.trustedContextResolver.resolve();
    application = serverRuntime.openMediaStatus();
    const { submissionId } = await routeContext.params;
    const result = await application.status.execute(executionContext, submissionId);
    response = NextResponse.json(result, { status: getProductEntryMediaStatusHttpStatus(result) });
  } catch (error) {
    const unavailable = productEntryMediaRuntimeErrorHttpResponse(error);
    response = NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  try { await application?.close(); }
  catch (error) {
    const unavailable = productEntryMediaRuntimeErrorHttpResponse(error);
    return NextResponse.json(unavailable.body, { status: unavailable.status });
  }
  return response;
}
