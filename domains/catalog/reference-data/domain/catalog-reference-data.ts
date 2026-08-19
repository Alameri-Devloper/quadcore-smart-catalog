export type CatalogReferenceStatus = "Active" | "Inactive";
export type SpecificationValueType = "Text" | "Number" | "Boolean";

export interface CatalogReferenceRecord {
  readonly workspaceId: string;
  readonly id: string;
  readonly code: string;
  readonly displayName: string;
  readonly status: CatalogReferenceStatus;
  readonly sortOrder: number;
  readonly version: number;
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export type Department = CatalogReferenceRecord;
export interface Category extends CatalogReferenceRecord { readonly departmentId: string }
export interface ProductType extends CatalogReferenceRecord { readonly categoryId: string }
export type Brand = CatalogReferenceRecord;
export type SupplyStatus = CatalogReferenceRecord;
export interface SpecificationDefinition extends CatalogReferenceRecord {
  readonly valueType: SpecificationValueType;
  readonly unit: string | null;
}

export interface WorkspaceRegistryAvailability {
  readonly workspaceId: string;
  readonly code: string;
  readonly enabled: boolean;
  readonly sortOrder: number;
}

export interface SpecificationTemplateEntry {
  readonly specificationDefinitionId: string;
  readonly sortOrder: number;
  readonly required: boolean;
}

export interface SpecificationTemplate {
  readonly workspaceId: string;
  readonly id: string;
  readonly productTypeId: string;
  readonly version: number;
  readonly entries: readonly SpecificationTemplateEntry[];
  readonly createdAt: Date;
  readonly updatedAt: Date;
}

export const DEVICE_CLASS_REGISTRY = Object.freeze([
  Object.freeze({ code: "personal", labels: Object.freeze({ en: "Personal", ar: "شخصي" }) }),
  Object.freeze({ code: "business", labels: Object.freeze({ en: "Business", ar: "أعمال" }) }),
  Object.freeze({ code: "gaming", labels: Object.freeze({ en: "Gaming", ar: "ألعاب" }) }),
  Object.freeze({ code: "workstation", labels: Object.freeze({ en: "Workstation", ar: "محطة عمل" }) }),
] as const);

// `refurbished` is retained because Product Entry already persists this fixed code.
export const CONDITION_REGISTRY = Object.freeze([
  Object.freeze({ code: "new", labels: Object.freeze({ en: "New", ar: "جديد" }) }),
  Object.freeze({ code: "used", labels: Object.freeze({ en: "Used", ar: "مستخدم" }) }),
  Object.freeze({ code: "refurbished", labels: Object.freeze({ en: "Refurbished", ar: "مجدّد" }) }),
] as const);

// ISO 4217 List One currency/fund identities, maintained as a fixed system registry.
// Workspace persistence stores only enablement and ordering. The PostgreSQL constraint
// validates the alpha-3 shape; Application remains the authority for registry membership.
export const ISO_CURRENCY_CODES = Object.freeze([
  "AED", "AFN", "ALL", "AMD", "AOA", "ARS", "AUD", "AWG", "AZN", "BAM", "BBD", "BDT",
  "BHD", "BIF", "BMD", "BND", "BOB", "BOV", "BRL", "BSD", "BTN", "BWP", "BYN", "BZD",
  "CAD", "CDF", "CHE", "CHF", "CHW", "CLF", "CLP", "CNY", "COP", "COU", "CRC", "CUP",
  "CVE", "CZK", "DJF", "DKK", "DOP", "DZD", "EGP", "ERN", "ETB", "EUR", "FJD", "FKP",
  "GBP", "GEL", "GHS", "GIP", "GMD", "GNF", "GTQ", "GYD", "HKD", "HNL", "HTG", "HUF",
  "IDR", "ILS", "INR", "IQD", "IRR", "ISK", "JMD", "JOD", "JPY", "KES", "KGS", "KHR",
  "KMF", "KPW", "KRW", "KWD", "KYD", "KZT", "LAK", "LBP", "LKR", "LRD", "LSL", "LYD",
  "MAD", "MDL", "MGA", "MKD", "MMK", "MNT", "MOP", "MRU", "MUR", "MVR", "MWK", "MXN",
  "MXV", "MYR", "MZN", "NAD", "NGN", "NIO", "NOK", "NPR", "NZD", "OMR", "PAB", "PEN",
  "PGK", "PHP", "PKR", "PLN", "PYG", "QAR", "RON", "RSD", "RUB", "RWF", "SAR", "SBD",
  "SCR", "SDG", "SEK", "SGD", "SHP", "SLE", "SOS", "SRD", "SSP", "STN", "SVC", "SYP",
  "SZL", "THB", "TJS", "TMT", "TND", "TOP", "TRY", "TTD", "TWD", "TZS", "UAH", "UGX",
  "USD", "USN", "UYI", "UYU", "UYW", "UZS", "VED", "VES", "VND", "VUV", "WST", "XAD",
  "XAF", "XAG", "XAU", "XBA", "XBB", "XBC", "XBD", "XCD", "XCG", "XDR", "XOF", "XPD",
  "XPF", "XPT", "XSU", "XTS", "XUA", "XXX", "YER", "ZAR", "ZMW", "ZWG",
] as const);

export const ISO_CURRENCY_REGISTRY = Object.freeze(
  ISO_CURRENCY_CODES.map((code) => Object.freeze({ code })),
);

const ISO_CURRENCY_CODE_SET: ReadonlySet<string> = new Set(ISO_CURRENCY_CODES);

const CODE_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const UNIT_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 ./%-]{0,31}$/;

export const normalizeReferenceCode = (value: string): string => {
  const normalized = value.trim().toLowerCase().replace(/\s+/g, "-");
  if (normalized.length < 1 || normalized.length > 64 || !CODE_PATTERN.test(normalized)) {
    throw new Error("InvalidReferenceCode");
  }
  return normalized;
};

export const normalizeDisplayName = (value: string): string => {
  const normalized = value.trim();
  if (normalized.length < 1 || normalized.length > 160) throw new Error("InvalidDisplayName");
  return normalized;
};

export const validateSortOrder = (value: number): number => {
  if (!Number.isSafeInteger(value) || value < 0 || value > 1_000_000) throw new Error("InvalidSortOrder");
  return value;
};

export const validateStatus = (value: string): CatalogReferenceStatus => {
  if (value !== "Active" && value !== "Inactive") throw new Error("InvalidReferenceStatus");
  return value;
};

export const validateSpecificationValueType = (value: string): SpecificationValueType => {
  if (value !== "Text" && value !== "Number" && value !== "Boolean") throw new Error("InvalidSpecificationValueType");
  return value;
};

export const normalizeOptionalUnit = (value: string | null | undefined): string | null => {
  if (value === null || value === undefined || value.trim() === "") return null;
  const normalized = value.trim();
  if (!UNIT_PATTERN.test(normalized)) throw new Error("InvalidSpecificationUnit");
  return normalized;
};

export const isConditionCode = (value: string): boolean => CONDITION_REGISTRY.some(({ code }) => code === value);
export const isCurrencyCode = (value: string): boolean => ISO_CURRENCY_CODE_SET.has(value);

export const compareReferences = (left: Pick<CatalogReferenceRecord, "sortOrder" | "displayName" | "id">, right: Pick<CatalogReferenceRecord, "sortOrder" | "displayName" | "id">): number =>
  left.sortOrder - right.sortOrder || left.displayName.localeCompare(right.displayName) || left.id.localeCompare(right.id);
