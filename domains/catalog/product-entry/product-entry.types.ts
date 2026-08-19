import type { SpecificationValue } from "../types/specification-value.entity";
import type { ProductCondition } from "../types/product.entity";
import { PRODUCT_ENTRY_COMMERCIAL_DEFAULTS } from "./product-entry-commercial-options";
import type { ProductEntrySpecificationsResolution } from "./services/product-entry-specifications.service";

export const PRODUCT_ENTRY_STEP_IDS = {
  entryMethod: "entry-method",
  category: "category",
  deviceClass: "device-class",
  productModel: "product-model",
  specifications: "specifications",
  commercialDetails: "commercial-details",
  images: "images",
  review: "review",
} as const;

export type ProductEntryStepId =
  (typeof PRODUCT_ENTRY_STEP_IDS)[keyof typeof PRODUCT_ENTRY_STEP_IDS];

export type ProductEntryMethod =
  | "manual"
  | "excel-import"
  | "product-model-lookup"
  | "label-scan";

export type ProductEntryMediaOperationKind = "Add" | "Replace" | "Remove" | "Reorder" | "SetCover";
export type ProductEntryMediaSourceAvailability =
  | "AvailableInCurrentSession"
  | "RequiresReselection"
  | "NotRequired";
export type ProductEntryMediaHashStatus = "NotRequired" | "Pending" | "Hashing" | "Ready" | "Failed";

export interface ProductEntryImageReference {
  readonly id: string;
  readonly operationId: string | null;
  readonly operationType: ProductEntryMediaOperationKind | null;
  readonly mediaId: string | null;
  readonly originalIsPrimary: boolean | null;
  readonly originalSortOrder: number | null;
  readonly reorderOperationId: string | null;
  readonly setCoverOperationId: string | null;
  isPrimary: boolean;
  sortOrder: number;
  readonly fileName: string | null;
  readonly mimeType: string | null;
  readonly sizeBytes: number | null;
  readonly expectedSourceSha256: string | null;
  readonly expectedSourceByteLength: number | null;
  readonly sourceAvailability: ProductEntryMediaSourceAvailability;
  readonly hashStatus: ProductEntryMediaHashStatus;
  readonly sourceErrorCode: string | null;
}

export interface ProductEntryMethodOption {
  id: ProductEntryMethod;
  label: string;
  description: string;
  disabled: boolean;
  recommended?: boolean;
}

export const PRODUCT_ENTRY_METHOD_OPTIONS: ProductEntryMethodOption[] = [
  {
    id: "manual",
    label: "Manual Entry",
    description: "Enter one Product step by step with the guided workflow.",
    disabled: false,
    recommended: true,
  },
  {
    id: "excel-import",
    label: "Excel Import",
    description:
      "Import Products with a Category and optional Device Class template.",
    disabled: true,
  },
  {
    id: "product-model-lookup",
    label: "Product Model Lookup",
    description: "Find a Product Model and use confirmed details as a starting point.",
    disabled: true,
  },
  {
    id: "label-scan",
    label: "Label Scan",
    description: "Scan a Product label to suggest reviewable information.",
    disabled: true,
  },
];

export const isProductEntryMethodEnabled = (
  method: ProductEntryMethod,
): boolean =>
  PRODUCT_ENTRY_METHOD_OPTIONS.some(
    (option) => option.id === method && !option.disabled,
  );

export interface ProductEntryState {
  entryMethod: ProductEntryMethod;
  departmentId: string | null;
  categoryId: string | null;
  productTypeId: string | null;
  deviceClassId: string | null;
  brandId: string | null;
  productModelId: string | null;
  specificationValues: Record<string, SpecificationValue>;
  productName: string;
  productCode: string;
  retailPrice: number | null;
  wholesalePrice: number | null;
  currency: string;
  condition: ProductCondition | null;
  availabilityStatus: string | null;
  isFeatured: boolean;
  publicationIntent: "SaveAsDraft" | "PublishWhenReady";
  images: ProductEntryImageReference[];
}

export type ProductEntryValues = ProductEntryState;

export interface ProductEntryWorkflowContext {
  companyId: string;
  workspaceId: string;
  categoryRequiresDeviceClassByCategory: Readonly<Record<string, boolean>>;
  deviceClassIdsByCategory: Readonly<Record<string, readonly string[]>>;
  brandIdByProductModel: Readonly<Record<string, string>>;
  productModelIdsByCategory: Readonly<Record<string, readonly string[]>>;
  productModelIdsByCategoryAndDeviceClass: Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
  >;
  specificationFieldIdsByCategory: Readonly<Record<string, readonly string[]>>;
  specificationFieldIdsByCategoryAndDeviceClass: Readonly<
    Record<string, Readonly<Record<string, readonly string[]>>>
  >;
  selectOptionValuesBySpecificationField: Readonly<
    Record<string, readonly SpecificationValue[]>
  >;
  requiredSpecificationFieldIds: readonly string[];
  compatibleSpecificationFieldIds: readonly string[];
  compatibleDeviceClassIds: readonly string[];
  compatibleProductModelIds: readonly string[];
  resolvedProductModelBrandId?: string | null;
  referenceDepartmentIds?: readonly string[];
  referenceCategoryDepartmentById?: Readonly<Record<string, string>>;
  referenceProductTypeCategoryById?: Readonly<Record<string, string>>;
  referenceBrandIds?: readonly string[];
  referenceDeviceClassCodes?: readonly string[];
  referenceConditionCodes?: readonly string[];
  referenceSupplyStatusIds?: readonly string[];
  referenceCurrencyCodes?: readonly string[];
  referenceSpecificationResolutionsByProductType?: Readonly<Record<string, ProductEntrySpecificationsResolution>>;
}

export const createInitialProductEntryState = (): ProductEntryState => ({
  entryMethod: "manual",
  departmentId: null,
  categoryId: null,
  productTypeId: null,
  deviceClassId: null,
  brandId: null,
  productModelId: null,
  specificationValues: {},
  productName: "",
  productCode: "",
  retailPrice: null,
  wholesalePrice: null,
  currency: "",
  condition: null,
  availabilityStatus: null,
  isFeatured: PRODUCT_ENTRY_COMMERCIAL_DEFAULTS.isFeatured,
  publicationIntent: "SaveAsDraft",
  images: [],
});

type LegacyProductEntryValues = Partial<ProductEntryValues> & {
  price?: number | null;
  images?: ProductEntryImageReference[] | string[];
};

const migrateProductEntryImages = (
  images: ProductEntryImageReference[] | string[] | undefined,
): ProductEntryImageReference[] => {
  const migrated = (images ?? []).filter(
    (image): image is ProductEntryImageReference => typeof image !== "string",
  );
  const ordered = [...migrated].sort((left, right) => left.sortOrder - right.sortOrder);
  const active = ordered.filter((image) => image.operationType !== "Remove");
  const primaryId = active.find((image) => image.isPrimary)?.id ?? active[0]?.id;
  return ordered.map((image, index) => ({
    ...image,
    originalIsPrimary: image.originalIsPrimary ?? (image.mediaId ? image.isPrimary : null),
    originalSortOrder: image.originalSortOrder ?? (image.mediaId ? image.sortOrder : null),
    reorderOperationId: image.reorderOperationId ?? null,
    setCoverOperationId: image.setCoverOperationId ?? null,
    isPrimary: image.operationType !== "Remove" && image.id === primaryId,
    sortOrder: index + 1,
  }));
};

export const migrateProductEntryValues = (
  values: LegacyProductEntryValues,
): ProductEntryValues => {
  const { price: legacyPrice, ...currentValues } = values;
  return {
    ...createInitialProductEntryState(),
    ...currentValues,
    productCode: values.productCode ?? "",
    retailPrice: values.retailPrice ?? legacyPrice ?? null,
    wholesalePrice: values.wholesalePrice ?? null,
    isFeatured: values.isFeatured ?? PRODUCT_ENTRY_COMMERCIAL_DEFAULTS.isFeatured,
    publicationIntent: values.publicationIntent ?? "SaveAsDraft",
    images: migrateProductEntryImages(values.images),
  };
};
