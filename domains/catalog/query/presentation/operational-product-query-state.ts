import { normalizeCatalogPresentationSearch } from "./catalog-query-state";
import type { OperationalProductQuery, OperationalProductRequest } from "./operational-product-selector.types";

export const operationalProductId = (value: unknown): string | null =>
  typeof value === "string" && value.length > 0 && value.length <= 160 && value === value.trim() && !/[\u0000-\u001f\u007f]/u.test(value) ? value : null;
/** Syntax/size bound only. The cursor is never decoded or manufactured here. */
export const operationalProductCursor = (value: unknown): string | null =>
  typeof value === "string" && /^[A-Za-z0-9_-]{1,2048}$/u.test(value) ? value : null;
export const emptyOperationalProductQuery = (): OperationalProductQuery => ({ q: "", productCursor: null, productId: null, issue: null });
export const parseOperationalProductQuery = (input: { getAll(key: string): readonly string[] }): OperationalProductQuery => {
  const q = input.getAll("q"), cursor = input.getAll("productCursor"), id = input.getAll("productId");
  const normalized = normalizeCatalogPresentationSearch(q[0] ?? "");
  if ([q, cursor, id].some((values) => values.length > 1) || normalized === null) return { ...emptyOperationalProductQuery(), issue: "InvalidQuery" };
  if (cursor.length && !operationalProductCursor(cursor[0])) return { ...emptyOperationalProductQuery(), q: normalized, issue: "InvalidCursor" };
  return { q: normalized, productCursor: cursor[0] ?? null, productId: operationalProductId(id[0]), issue: null };
};
/** Page replacement model: search and pagination navigation always clear selection. */
export const changeOperationalProductSearch = (q: string): OperationalProductQuery => {
  const normalized = normalizeCatalogPresentationSearch(q);
  return { ...emptyOperationalProductQuery(), q: normalized ?? "", issue: normalized === null ? "InvalidQuery" : null };
};
export const operationalProductRequestKey = (request: OperationalProductRequest): string =>
  JSON.stringify([request.purpose, request.branchId ?? null, request.q, request.cursor ?? null, request.limit ?? null]);
