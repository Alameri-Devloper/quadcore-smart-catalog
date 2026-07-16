import type { SpecificationValue } from "../types/specification-value.entity";
import type { ProductCondition, ProductStatus } from "../types/product.entity";
import { PRODUCT_ENTRY_COMMERCIAL_DEFAULTS } from "./product-entry-commercial-options";

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
  deviceClassId: string | null;
  brandId: string | null;
  productModelId: string | null;
  specificationValues: Record<string, SpecificationValue>;
  productName: string;
  productCode: string;
  retailPrice: number | null;
  wholesalePrice: number | null;
  currency: string;
  quantity: number | null;
  condition: ProductCondition | null;
  availabilityStatus: ProductStatus | null;
  isFeatured: boolean;
  isActive: boolean;
  images: string[];
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
}

export const createInitialProductEntryState = (): ProductEntryState => ({
  entryMethod: "manual",
  departmentId: null,
  categoryId: null,
  deviceClassId: null,
  brandId: null,
  productModelId: null,
  specificationValues: {},
  productName: "",
  productCode: "",
  retailPrice: null,
  wholesalePrice: null,
  currency: "",
  quantity: null,
  condition: null,
  availabilityStatus: null,
  isFeatured: PRODUCT_ENTRY_COMMERCIAL_DEFAULTS.isFeatured,
  isActive: PRODUCT_ENTRY_COMMERCIAL_DEFAULTS.isActive,
  images: [],
});

type LegacyProductEntryValues = Partial<ProductEntryValues> & {
  price?: number | null;
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
    isActive: values.isActive ?? PRODUCT_ENTRY_COMMERCIAL_DEFAULTS.isActive,
  };
};
