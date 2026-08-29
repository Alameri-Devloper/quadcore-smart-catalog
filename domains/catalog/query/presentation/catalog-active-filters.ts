import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import type { CatalogQueryState } from "./catalog-query-state";
import { catalogText, type CatalogTextKey } from "./catalog-presentation.i18n";
import type { CatalogFilterOptionsView } from "./catalog-presentation.types";

export interface CatalogActiveFilterItem {
  readonly key: string;
  readonly label: string;
  readonly value: string;
}

const fixedValueKeys: Readonly<Record<string, CatalogTextKey>> = {
  Published: "published", Draft: "draft", Archived: "archived",
  Listed: "listed", Unlisted: "unlisted", NotConfigured: "notConfigured", Any: "any",
  InStock: "inStock", OutOfStock: "outOfStock",
  personal: "personal", business: "business", gaming: "gaming", workstation: "workstation",
  new: "newCondition", used: "used", refurbished: "refurbished",
};

export const catalogFixedValueText = (locale: Locale, value: string): string => fixedValueKeys[value] ? catalogText(locale, fixedValueKeys[value]) : value;
const displayName = (values: readonly { readonly id: string; readonly displayName: string }[], id: string | undefined): string | undefined => id ? values.find((value) => value.id === id)?.displayName : undefined;
const item = (key: string, label: string, value: string | undefined): CatalogActiveFilterItem | null => value ? Object.freeze({ key, label, value }) : null;

export const catalogBranchContextDisplayName = (state: CatalogQueryState, options: CatalogFilterOptionsView): string | undefined => displayName(options.branches, state.branchId);

export const catalogActiveFilterItems = (state: CatalogQueryState, options: CatalogFilterOptionsView, locale: Locale): readonly CatalogActiveFilterItem[] => Object.freeze([
  item("department", catalogText(locale, "department"), displayName(options.departments, state.departmentId)),
  item("category", catalogText(locale, "category"), displayName(options.categories, state.categoryId)),
  item("productType", catalogText(locale, "productType"), displayName(options.productTypes, state.productTypeId)),
  item("brand", catalogText(locale, "brand"), displayName(options.brands, state.brandId)),
  item("deviceClass", catalogText(locale, "deviceClass"), state.deviceClass ? catalogFixedValueText(locale, state.deviceClass) : undefined),
  item("condition", catalogText(locale, "condition"), state.condition ? catalogFixedValueText(locale, state.condition) : undefined),
  item("supplyStatus", catalogText(locale, "supplyStatus"), displayName(options.supplyStatuses, state.supplyStatusId)),
  item("lifecycle", catalogText(locale, "lifecycle"), state.lifecycle !== "Published" ? catalogFixedValueText(locale, state.lifecycle) : undefined),
  item("listing", catalogText(locale, "listing"), state.listing ? catalogFixedValueText(locale, state.listing) : undefined),
  item("stock", catalogText(locale, "stock"), state.stock ? catalogFixedValueText(locale, state.stock) : undefined),
  item("minRetailPrice", catalogText(locale, "minRetail"), state.minRetailPrice ? `${state.minRetailPrice}${state.retailCurrency ? ` ${state.retailCurrency}` : ""}` : undefined),
  item("maxRetailPrice", catalogText(locale, "maxRetail"), state.maxRetailPrice ? `${state.maxRetailPrice}${state.retailCurrency ? ` ${state.retailCurrency}` : ""}` : undefined),
  item("retailCurrency", catalogText(locale, "retailCurrency"), state.retailCurrency),
].filter((value): value is CatalogActiveFilterItem => value !== null));

export const catalogHasActiveFilters = (state: CatalogQueryState): boolean => Boolean(state.departmentId || state.categoryId || state.productTypeId || state.brandId || state.deviceClass || state.condition || state.supplyStatusId || state.lifecycle !== "Published" || state.listing || state.stock || state.minRetailPrice || state.maxRetailPrice || state.retailCurrency);

export const resetCatalogFilters = (state: CatalogQueryState): CatalogQueryState => Object.freeze({
  q: state.q,
  ...(state.branchId ? { branchId: state.branchId } : {}),
  lifecycle: "Published",
  sort: state.sort.startsWith("retail-price") ? (state.q ? "relevance" : "newest") : state.sort,
});
