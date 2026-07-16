import type { ProductCondition, ProductStatus } from "@/domains/catalog/types/product.entity";

export interface ProductEntryCommercialOption<TValue extends string> {
  value: TValue;
  label: string;
}

export const PRODUCT_ENTRY_CURRENCY_OPTIONS = [
  { value: "USD", label: "USD — US Dollar" },
] as const satisfies readonly ProductEntryCommercialOption<string>[];

export const PRODUCT_ENTRY_CONDITION_OPTIONS = [
  { value: "new", label: "New" },
  { value: "used", label: "Used" },
] as const satisfies readonly ProductEntryCommercialOption<ProductCondition>[];

export const PRODUCT_ENTRY_AVAILABILITY_OPTIONS = [
  { value: "available", label: "In Stock" },
  { value: "arrived-at-port", label: "Arrived at Port" },
  { value: "on-the-way", label: "On the Way" },
] as const satisfies readonly ProductEntryCommercialOption<ProductStatus>[];

export const PRODUCT_ENTRY_COMMERCIAL_DEFAULTS = {
  isFeatured: false,
  isActive: true,
} as const;

export const isApprovedProductEntryCurrency = (value: string): boolean =>
  PRODUCT_ENTRY_CURRENCY_OPTIONS.some((option) => option.value === value);

export const isApprovedProductCondition = (
  value: string | null,
): value is ProductCondition =>
  PRODUCT_ENTRY_CONDITION_OPTIONS.some((option) => option.value === value);

export const isApprovedProductAvailability = (
  value: string | null,
): value is ProductStatus =>
  PRODUCT_ENTRY_AVAILABILITY_OPTIONS.some((option) => option.value === value);
