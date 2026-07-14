import type { SpecificationValue } from "../types/specification-value.entity";

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

export type ProductEntryMethod = "manual" | "excel-import";

export interface ProductEntryMethodOption {
  id: ProductEntryMethod;
  label: string;
  disabled: boolean;
}

export const PRODUCT_ENTRY_METHOD_OPTIONS: ProductEntryMethodOption[] = [
  { id: "manual", label: "Manual Entry", disabled: false },
  { id: "excel-import", label: "Excel Import", disabled: true },
];

export interface ProductEntryState {
  entryMethod: ProductEntryMethod;
  categoryId: string | null;
  deviceClassId: string | null;
  brandId: string | null;
  productModelId: string | null;
  specificationValues: Record<string, SpecificationValue>;
  productName: string;
  price: number | null;
  currency: string;
  quantity: number | null;
  condition: string | null;
  availabilityStatus: string | null;
  images: string[];
}

export type ProductEntryValues = ProductEntryState;

export interface ProductEntryWorkflowContext {
  categoryRequiresDeviceClass: boolean;
  requiredSpecificationFieldIds: readonly string[];
  compatibleSpecificationFieldIds: readonly string[];
  compatibleDeviceClassIds: readonly string[];
  compatibleProductModelIds: readonly string[];
  resolvedProductModelBrandId?: string | null;
}

export const createInitialProductEntryState = (): ProductEntryState => ({
  entryMethod: "manual",
  categoryId: null,
  deviceClassId: null,
  brandId: null,
  productModelId: null,
  specificationValues: {},
  productName: "",
  price: null,
  currency: "",
  quantity: null,
  condition: null,
  availabilityStatus: null,
  images: [],
});
