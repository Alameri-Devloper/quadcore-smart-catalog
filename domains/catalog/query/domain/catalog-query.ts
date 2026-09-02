import { createHash } from "node:crypto";

export const CATALOG_PAGE_SIZE_DEFAULT = 24;
export const CATALOG_PAGE_SIZE_MAX = 60;
export const CATALOG_MONEY_MAX = BigInt("9007199254740991");
const CATALOG_CURSOR_VALUE_MAX_LENGTH = 512;

export const CATALOG_SORTS = ["relevance", "newest", "name-asc", "name-desc", "retail-price-asc", "retail-price-desc"] as const;
export const CATALOG_LIFECYCLES = ["Draft", "Published", "Archived"] as const;
export const CATALOG_LISTING_FILTERS = ["Listed", "Unlisted", "NotConfigured", "Any"] as const;
export const CATALOG_STOCK_FILTERS = ["InStock", "OutOfStock"] as const;
export const CATALOG_DEVICE_CLASSES = ["personal", "business", "gaming", "workstation"] as const;
export const CATALOG_CONDITIONS = ["new", "used", "refurbished"] as const;
export const OPERATIONAL_PRODUCT_SEARCH_PURPOSES = ["Listing", "Inventory", "WorkspacePricing", "BranchPricing", "WorkspaceReferenceCost", "BranchReferenceCost"] as const;

export type CatalogSort = (typeof CATALOG_SORTS)[number];
export type CatalogLifecycle = (typeof CATALOG_LIFECYCLES)[number];
export type CatalogListingFilter = (typeof CATALOG_LISTING_FILTERS)[number];
export type CatalogStockFilter = (typeof CATALOG_STOCK_FILTERS)[number];
export type CatalogDeviceClass = (typeof CATALOG_DEVICE_CLASSES)[number];
export type CatalogCondition = (typeof CATALOG_CONDITIONS)[number];

export interface CatalogSearchFilters {
  readonly departmentId?: string;
  readonly categoryId?: string;
  readonly productTypeId?: string;
  readonly brandId?: string;
  readonly deviceClass?: CatalogDeviceClass;
  readonly condition?: CatalogCondition;
  readonly supplyStatusId?: string;
  readonly lifecycle: CatalogLifecycle;
  readonly listing?: CatalogListingFilter;
  readonly stock?: CatalogStockFilter;
  readonly minRetailPrice?: bigint;
  readonly maxRetailPrice?: bigint;
  readonly retailCurrency?: string;
}

export interface CatalogCursorPosition {
  readonly productId: string;
  readonly value: string;
  readonly nullRank?: 0 | 1;
}

interface CursorPayload extends CatalogCursorPosition {
  readonly version: 1;
  readonly sort: CatalogSort;
  readonly queryFingerprint: string;
}

export interface CatalogSearchShape {
  readonly searchText: string;
  readonly branchId: string | null;
  readonly filters: CatalogSearchFilters;
  readonly sort: CatalogSort;
  readonly visibility: CatalogQueryVisibility;
}

export type OperationalProductSearchPurpose = (typeof OPERATIONAL_PRODUCT_SEARCH_PURPOSES)[number];

export interface OperationalCatalogSearchShape {
  readonly purpose: OperationalProductSearchPurpose;
  readonly searchText: string;
  readonly branchId: string | null;
  readonly sort: CatalogSort;
}

export interface CatalogQueryVisibility {
  readonly retail: boolean;
  readonly wholesale: boolean;
  readonly availability: boolean;
  readonly quantity: boolean;
  readonly referenceCost: boolean;
}

export interface CatalogMoneyProjection { readonly amountMinor: bigint; readonly currency: string; readonly source: "WorkspaceBase" | "BranchOverride" }
export interface CatalogReferenceProjection { readonly id: string; readonly displayName: string }
export interface CatalogClassificationProjection {
  readonly department: CatalogReferenceProjection | null;
  readonly category: CatalogReferenceProjection | null;
  readonly productType: CatalogReferenceProjection | null;
  readonly brand: CatalogReferenceProjection | null;
  readonly deviceClass: string | null;
  readonly condition: string | null;
  readonly supplyStatus: CatalogReferenceProjection | null;
}
export interface CatalogMediaProjection { readonly mediaId: string; readonly altText: string | null; readonly position: number; readonly isMain: boolean }
export interface CatalogMediaStorageProjection {
  readonly productId: string;
  readonly mediaId: string;
  readonly lifecycle: CatalogLifecycle;
  readonly storageRootKey: string;
  readonly storageKey: string;
  readonly checksumSha256: string;
  readonly mimeType: "image/webp";
}
export interface CatalogInventoryProjection { readonly available: bigint; readonly onHand: bigint; readonly reserved: bigint; readonly damaged: bigint }
export interface CatalogProductProjection {
  readonly productId: string;
  readonly productCode: string | null;
  readonly productName: string | null;
  readonly lifecycle: CatalogLifecycle;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly classification: CatalogClassificationProjection;
  readonly mainMedia: CatalogMediaProjection | null;
  readonly listingStatus: "Listed" | "Unlisted" | "NotConfigured";
  readonly inventory: CatalogInventoryProjection;
  readonly retail: CatalogMoneyProjection | null;
  readonly wholesale: CatalogMoneyProjection | null;
  readonly referenceCost: CatalogMoneyProjection | null;
}
export interface CatalogProductSearchRow { readonly product: CatalogProductProjection; readonly cursor: CatalogCursorPosition }

export interface CatalogSpecificationProjection {
  readonly specificationDefinitionId: string;
  readonly displayName: string;
  readonly valueType: "Text" | "Number" | "Boolean";
  readonly unit: string | null;
  readonly value: string | boolean;
  readonly sortOrder: number;
}

export interface CatalogProductDetailsProjection extends CatalogProductProjection {
  readonly media: readonly CatalogMediaProjection[];
  readonly specifications: readonly CatalogSpecificationProjection[];
}

export interface CatalogFilterReferenceProjection extends CatalogReferenceProjection { readonly parentId?: string }
export interface CatalogFilterOptionsProjection {
  readonly departments: readonly CatalogFilterReferenceProjection[];
  readonly categories: readonly CatalogFilterReferenceProjection[];
  readonly productTypes: readonly CatalogFilterReferenceProjection[];
  readonly brands: readonly CatalogFilterReferenceProjection[];
  readonly supplyStatuses: readonly CatalogFilterReferenceProjection[];
  readonly branches: readonly CatalogFilterReferenceProjection[];
  readonly enabledConditions: readonly string[];
  readonly enabledCurrencies: readonly string[];
}

export const normalizeCatalogSearchText = (value: string | undefined): string => {
  const normalized = (value ?? "").trim().replace(/\s+/gu, " ");
  if (normalized.length > 200) throw new Error("InvalidSearchText");
  return normalized;
};

export const validateCatalogId = (value: string | undefined): string | undefined => {
  if (value === undefined) return undefined;
  if (value !== value.trim() || value.length < 1 || value.length > 160 || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error("InvalidIdentifier");
  return value;
};

export const parseCatalogMoney = (value: string | undefined): bigint | undefined => {
  if (value === undefined) return undefined;
  if (!/^(0|[1-9][0-9]{0,15})$/u.test(value)) throw new Error("InvalidMoney");
  const amount = BigInt(value);
  if (amount > CATALOG_MONEY_MAX) throw new Error("InvalidMoney");
  return amount;
};

export const catalogQueryFingerprint = (shape: CatalogSearchShape): string => createHash("sha256").update(JSON.stringify({
  q: shape.searchText,
  branchId: shape.branchId,
  filters: { ...shape.filters, minRetailPrice: shape.filters.minRetailPrice?.toString(), maxRetailPrice: shape.filters.maxRetailPrice?.toString() },
  sort: shape.sort,
  visibility: shape.visibility,
})).digest("hex");

export const operationalCatalogQueryFingerprint = (shape: OperationalCatalogSearchShape): string => createHash("sha256").update(JSON.stringify({
  version: 1,
  type: "OperationalProductSearch",
  purpose: shape.purpose,
  q: shape.searchText,
  branchId: shape.branchId,
  lifecycles: ["Draft", "Published"],
  sort: shape.sort,
})).digest("hex");

const validateCatalogCursorPosition = (position: Partial<CatalogCursorPosition>, sort: CatalogSort): CatalogCursorPosition => {
  if (typeof position.productId !== "string" || validateCatalogId(position.productId) !== position.productId) throw new Error("InvalidCursor");
  if (typeof position.value !== "string" || position.value.length > CATALOG_CURSOR_VALUE_MAX_LENGTH) throw new Error("InvalidCursor");

  if (sort === "relevance") {
    if (position.nullRank !== undefined || !/^(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:e[+-]?[0-9]+)?$/u.test(position.value)) throw new Error("InvalidCursor");
    const score = Number(position.value);
    if (!Number.isFinite(score) || score < 0 || String(score) !== position.value) throw new Error("InvalidCursor");
  } else if (sort === "newest") {
    if (position.nullRank !== undefined || !/^(?:[0-9]{4}|[+-][0-9]{6})-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u.test(position.value)) throw new Error("InvalidCursor");
    const timestamp = new Date(position.value);
    if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== position.value) throw new Error("InvalidCursor");
  } else if (sort === "name-asc" || sort === "name-desc") {
    if (position.nullRank !== undefined || position.value !== position.value.toLowerCase() || /[\u0000-\u001f\u007f]/u.test(position.value)) throw new Error("InvalidCursor");
  } else {
    if (position.nullRank !== 0 && position.nullRank !== 1) throw new Error("InvalidCursor");
    if (position.nullRank === 1) {
      if (position.value !== "0") throw new Error("InvalidCursor");
    } else {
      if (!/^(0|[1-9][0-9]{0,15})$/u.test(position.value)) throw new Error("InvalidCursor");
      if (BigInt(position.value) > CATALOG_MONEY_MAX) throw new Error("InvalidCursor");
    }
  }

  return Object.freeze({ productId: position.productId, value: position.value, ...(position.nullRank !== undefined ? { nullRank: position.nullRank } : {}) });
};

export const encodeCatalogCursor = (sort: CatalogSort, queryFingerprint: string, position: CatalogCursorPosition): string => {
  const validated = validateCatalogCursorPosition(position, sort);
  return Buffer.from(JSON.stringify({ version: 1, sort, queryFingerprint, ...validated } satisfies CursorPayload), "utf8").toString("base64url");
};

export const decodeCatalogCursor = (value: string, expectedSort: CatalogSort, expectedFingerprint: string): CatalogCursorPosition => {
  try {
    if (!/^[A-Za-z0-9_-]{1,2048}$/u.test(value)) throw new Error("InvalidCursor");
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<CursorPayload>;
    if (Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url") !== value) throw new Error("InvalidCursor");
    const keys = Object.keys(decoded).sort().join(",");
    const expectedKeys = decoded.nullRank === undefined ? "productId,queryFingerprint,sort,value,version" : "nullRank,productId,queryFingerprint,sort,value,version";
    if (keys !== expectedKeys || decoded.version !== 1 || decoded.sort !== expectedSort || decoded.queryFingerprint !== expectedFingerprint) throw new Error("InvalidCursor");
    return validateCatalogCursorPosition(decoded, expectedSort);
  } catch { throw new Error("InvalidCursor"); }
};

export const isCatalogSort = (value: string): value is CatalogSort => (CATALOG_SORTS as readonly string[]).includes(value);
export const isCatalogLifecycle = (value: string): value is CatalogLifecycle => (CATALOG_LIFECYCLES as readonly string[]).includes(value);
export const isCatalogListingFilter = (value: string): value is CatalogListingFilter => (CATALOG_LISTING_FILTERS as readonly string[]).includes(value);
export const isCatalogStockFilter = (value: string): value is CatalogStockFilter => (CATALOG_STOCK_FILTERS as readonly string[]).includes(value);
export const isCatalogDeviceClass = (value: string): value is CatalogDeviceClass => (CATALOG_DEVICE_CLASSES as readonly string[]).includes(value);
export const isCatalogCondition = (value: string): value is CatalogCondition => (CATALOG_CONDITIONS as readonly string[]).includes(value);
export const isOperationalProductSearchPurpose = (value: string): value is OperationalProductSearchPurpose => (OPERATIONAL_PRODUCT_SEARCH_PURPOSES as readonly string[]).includes(value);
