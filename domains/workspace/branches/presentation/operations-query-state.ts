import type { OperationalManagementCapabilitiesView } from "../../../identity/presentation/operational-management-capabilities.types";
import type { OperationalBranchPurpose } from "./operational-branch-selector.types";
import type { OperationalProductPurpose, OperationalProductQuery } from "../../../catalog/query/presentation/operational-product-selector.types";
import { emptyOperationalProductQuery, operationalProductCursor, operationalProductId, parseOperationalProductQuery } from "../../../catalog/query/presentation/operational-product-query-state";
import { operationsSectionHref, parseOperationsSection, resolveOperationsSection } from "./operations-section-state";

export type OperationsContext =
  | { readonly section: "Branches"; readonly branchTool: "details" | "listing" }
  | { readonly section: "Inventory"; readonly inventoryTool: "stock" | "reservations" | "transfer" }
  | { readonly section: "Pricing"; readonly pricingScope: "workspace" | "branch"; readonly pricingField: "prices" | "reference-cost" };

/** Pure Presentation context mapping, never a permission or resource-access decision. */
export const operationalBranchPurpose = (context: OperationsContext | null): OperationalBranchPurpose | null => {
  if (!context) return null;
  switch (context.section) {
    case "Branches": return context.branchTool === "listing" ? "Listing" : null;
    case "Inventory": return context.inventoryTool === "transfer" ? "Transfer" : "Inventory";
    case "Pricing": return context.pricingScope === "workspace" ? null : context.pricingField === "reference-cost" ? "BranchReferenceCost" : "BranchPricing";
  }
};

export const operationalProductPurpose = (context: OperationsContext | null): OperationalProductPurpose | null => {
  if (!context) return null;
  switch (context.section) {
    case "Branches": return context.branchTool === "listing" ? "Listing" : null;
    case "Inventory": return "Inventory";
    case "Pricing": return context.pricingScope === "workspace"
      ? context.pricingField === "reference-cost" ? "WorkspaceReferenceCost" : "WorkspacePricing"
      : context.pricingField === "reference-cost" ? "BranchReferenceCost" : "BranchPricing";
  }
};

/** Bounded URL syntax only; identifiers still require membership in the current A6 response. */
export const operationalBranchId = (value: unknown): string | null =>
  typeof value === "string" && value.trim() === value && /^[a-zA-Z0-9][a-zA-Z0-9_-]{0,127}$/u.test(value) ? value : null;

export interface OperationsQueryInput { getAll(key: string): readonly string[] }
const keys = ["section", "branchTool", "inventoryTool", "pricingScope", "pricingField", "branchId"] as const;
const choice = <T extends string>(values: readonly string[], options: readonly T[], fallback: T): { value: T; valid: boolean } =>
  values.length === 0 ? { value: fallback, valid: true }
    : values.length === 1 && options.includes(values[0] as T) ? { value: values[0] as T, valid: true }
      : { value: fallback, valid: false };

export const resolveOperationsQuery = (query: OperationsQueryInput, capabilities: OperationalManagementCapabilitiesView) => {
  // Read only approved context and Product keys. Unknown input is never propagated.
  const input = Object.fromEntries(keys.map((key) => [key, query.getAll(key)])) as Record<(typeof keys)[number], readonly string[]>;
  const productInput = parseOperationalProductQuery(query);
  const { sections, selected } = resolveOperationsSection(input.section, capabilities);
  if (!selected) return { sections, context: null, branchId: null, products: emptyOperationalProductQuery() };
  const compatibleSection = parseOperationsSection(input.section) === selected;
  const duplicates = keys.some((key) => input[key].length > 1);
  const read = (key: (typeof keys)[number]) => compatibleSection ? input[key] : [];
  let context: OperationsContext, compatible: boolean;
  if (selected === "Branches") {
    const tool = choice(read("branchTool"), ["details", "listing"], "details");
    context = { section: selected, branchTool: tool.value };
    compatible = tool.valid && !input.inventoryTool.length && !input.pricingScope.length && !input.pricingField.length;
  } else if (selected === "Inventory") {
    const tool = choice(read("inventoryTool"), ["stock", "reservations", "transfer"], "stock");
    context = { section: selected, inventoryTool: tool.value };
    compatible = tool.valid && !input.branchTool.length && !input.pricingScope.length && !input.pricingField.length;
  } else {
    const scope = choice(read("pricingScope"), ["workspace", "branch"], "workspace");
    const field = choice(read("pricingField"), ["prices", "reference-cost"], "prices");
    context = { section: selected, pricingScope: scope.value, pricingField: field.value };
    compatible = scope.valid && field.valid && !input.branchTool.length && !input.inventoryTool.length;
  }
  const branchId = compatibleSection && !duplicates && compatible && operationalBranchPurpose(context) !== null
    ? operationalBranchId(input.branchId[0]) : null;
  const products = compatibleSection && !duplicates && compatible && operationalProductPurpose(context) &&
    (operationalBranchPurpose(context) === null || branchId !== null) ? productInput : emptyOperationalProductQuery();
  return { sections, context, branchId, products };
};

/** Context navigation calls this without an ID, clearing the preceding selection. */
export const operationsContextHref = (context: OperationsContext, branchId: string | null = null, products?: OperationalProductQuery): string => {
  const query = new URLSearchParams();
  if (context.section === "Branches") query.set("branchTool", context.branchTool);
  if (context.section === "Inventory") query.set("inventoryTool", context.inventoryTool);
  if (context.section === "Pricing") { query.set("pricingScope", context.pricingScope); query.set("pricingField", context.pricingField); }
  const id = operationalBranchId(branchId);
  if (id && operationalBranchPurpose(context)) query.set("branchId", id);
  if (products && operationalProductPurpose(context) && (!operationalBranchPurpose(context) || id)) {
    // Reparse before serialization; never spread URL input or authority fields.
    const productQuery = new URLSearchParams();
    if (products.q) productQuery.set("q", products.q);
    const cursor = operationalProductCursor(products.productCursor), productId = operationalProductId(products.productId);
    if (cursor) productQuery.set("productCursor", cursor);
    if (productId) productQuery.set("productId", productId);
    const normalized = parseOperationalProductQuery(productQuery);
    if (normalized.q) query.set("q", normalized.q);
    if (normalized.productCursor) query.set("productCursor", normalized.productCursor);
    if (normalized.productId) query.set("productId", normalized.productId);
  }
  return `${operationsSectionHref(context.section)}&${query}`;
};
