import { NextResponse } from "next/server";
import { PRODUCT_ENTRY_DEVELOPMENT_SCOPE } from "@/domains/catalog/product-entry/product-entry.development-config";
import { createProductEntryServerRuntime } from "@/domains/catalog/product-entry/infrastructure/product-entry-server-runtime";
import { PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE } from "@/domains/catalog/product-entry/ports/product-entry-trusted-context.port";

export const runtime = "nodejs";

const configuredCatalogId = (workspaceId: string): string => {
  const value = process.env.QSC_PRODUCT_PUBLICATION_REQUIREMENTS_JSON;
  if (!value) return PRODUCT_ENTRY_DEVELOPMENT_SCOPE.catalogId;
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Unavailable");
  const matches = parsed.flatMap((item) => {
    if (typeof item !== "object" || item === null) return [];
    const record = item as Readonly<Record<string, unknown>>;
    return record.workspaceId === workspaceId && typeof record.catalogId === "string" && record.catalogId.trim()
      ? [record.catalogId.trim()]
      : [];
  });
  const unique = [...new Set(matches)];
  if (unique.length !== 1) throw new Error("Unavailable");
  return unique[0];
};

export async function GET(request: Request): Promise<NextResponse> {
  try {
    if (process.env.NODE_ENV !== "development" && process.env.NODE_ENV !== "test") throw new Error("Unavailable");
    const trusted = await createProductEntryServerRuntime().trustedContextResolver.resolve(request);
    if (trusted.workspaceId.value !== PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId) throw new Error("Unavailable");
    return NextResponse.json({
      type: "Available",
      context: {
        companyId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
        workspaceId: trusted.workspaceId.value,
        actorId: trusted.actorId.value,
        catalogId: configuredCatalogId(trusted.workspaceId.value),
        locale: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.locale,
      },
    });
  } catch {
    return NextResponse.json({
      type: "Unavailable",
      code: PRODUCT_ENTRY_TRUSTED_CONTEXT_UNAVAILABLE_CODE,
    }, { status: 503 });
  }
}
