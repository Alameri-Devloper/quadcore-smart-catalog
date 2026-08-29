export const CATALOG_PRESENTATION_SORTS = ["relevance", "newest", "name-asc", "name-desc", "retail-price-asc", "retail-price-desc"] as const;
export const CATALOG_PRESENTATION_LIFECYCLES = ["Published", "Draft", "Archived"] as const;
export const CATALOG_PRESENTATION_LISTING_FILTERS = ["Listed", "Unlisted", "NotConfigured", "Any"] as const;
export const CATALOG_PRESENTATION_STOCK_FILTERS = ["InStock", "OutOfStock"] as const;
export const CATALOG_PRESENTATION_DEVICE_CLASSES = ["personal", "business", "gaming", "workstation"] as const;
export const CATALOG_PRESENTATION_CONDITIONS = ["new", "used", "refurbished"] as const;

export type CatalogPresentationSort = (typeof CATALOG_PRESENTATION_SORTS)[number];
export type CatalogPresentationLifecycle = (typeof CATALOG_PRESENTATION_LIFECYCLES)[number];
export type CatalogPresentationListingFilter = (typeof CATALOG_PRESENTATION_LISTING_FILTERS)[number];
export type CatalogPresentationStockFilter = (typeof CATALOG_PRESENTATION_STOCK_FILTERS)[number];
export type CatalogPresentationDeviceClass = (typeof CATALOG_PRESENTATION_DEVICE_CLASSES)[number];
export type CatalogPresentationCondition = (typeof CATALOG_PRESENTATION_CONDITIONS)[number];
export type CatalogPresentationPriceMode = "Retail" | "Wholesale";

export interface CatalogMoneyView { readonly amountMinor: string; readonly currency: string; readonly source: "WorkspaceBase" | "BranchOverride" }
export interface CatalogReferenceView { readonly id: string; readonly displayName: string }
export interface CatalogFilterReferenceView extends CatalogReferenceView { readonly parentId?: string }
export interface CatalogClassificationView {
  readonly department: CatalogReferenceView | null;
  readonly category: CatalogReferenceView | null;
  readonly productType: CatalogReferenceView | null;
  readonly brand: CatalogReferenceView | null;
  readonly deviceClass: string | null;
  readonly condition: string | null;
  readonly supplyStatus: CatalogReferenceView | null;
}
export interface CatalogMediaView { readonly mediaId: string; readonly altText: string | null; readonly position: number; readonly isMain: boolean; readonly downloadUrl: string }
export interface CatalogInventoryView { readonly available: string; readonly onHand: string; readonly reserved: string; readonly damaged: string }

export interface CatalogProductCardView {
  readonly productId: string;
  readonly productCode: string | null;
  readonly productName: string | null;
  readonly lifecycle: CatalogPresentationLifecycle;
  readonly branchId?: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly classification: CatalogClassificationView;
  readonly mainMedia: CatalogMediaView | null;
  readonly listingStatus: "Listed" | "Unlisted" | "NotConfigured";
  readonly availability?: "InStock" | "OutOfStock";
  readonly inventory?: CatalogInventoryView;
  readonly retail?: CatalogMoneyView | null;
  readonly wholesale?: CatalogMoneyView | null;
}

export interface CatalogSpecificationView {
  readonly specificationDefinitionId: string;
  readonly displayName: string;
  readonly valueType: "Text" | "Number" | "Boolean";
  readonly unit: string | null;
  readonly value: string | boolean;
  readonly sortOrder: number;
}

export interface CatalogProductDetailsView extends CatalogProductCardView {
  readonly media: readonly CatalogMediaView[];
  readonly specifications: readonly CatalogSpecificationView[];
  readonly referenceCost?: CatalogMoneyView | null;
  readonly capabilities: { readonly directSharePriceModes: readonly CatalogPresentationPriceMode[] };
}

export interface CatalogSearchView { readonly items: readonly CatalogProductCardView[]; readonly nextCursor: string | null }
export interface CatalogFilterOptionsView {
  readonly departments: readonly CatalogFilterReferenceView[];
  readonly categories: readonly CatalogFilterReferenceView[];
  readonly productTypes: readonly CatalogFilterReferenceView[];
  readonly brands: readonly CatalogFilterReferenceView[];
  readonly supplyStatuses: readonly CatalogFilterReferenceView[];
  readonly branches: readonly CatalogFilterReferenceView[];
  readonly enabledConditions: readonly CatalogPresentationCondition[];
  readonly enabledCurrencies: readonly string[];
  readonly capabilities: {
    readonly lifecycles: readonly CatalogPresentationLifecycle[];
    readonly listingFilters: readonly CatalogPresentationListingFilter[];
    readonly stockFilters: readonly CatalogPresentationStockFilter[];
    readonly retailPrice: boolean;
  };
}

export type CatalogApiFailureKind = "Unauthorized" | "Forbidden" | "NotFound" | "InvalidQuery" | "Unavailable" | "UnexpectedError";
export type CatalogApiResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly kind: CatalogApiFailureKind; readonly code: string; readonly status: number };
