import type {
  ProductEntryCatalogReferenceData,
  ProductEntryCatalogReferenceDataPort,
  ProductEntryReferenceOption,
} from "../ports/product-entry-catalog-reference-data.port";
import type { ProductEntrySpecificationsResolution } from "../services/product-entry-specifications.service";
import type { ProductEntryValues } from "../product-entry.types";

export type ProductEntryCatalogReferenceDataState =
  | { readonly type: "Available"; readonly value: ProductEntryCatalogReferenceData }
  | { readonly type: "Unavailable" };

export interface ProductEntryHierarchySelection {
  readonly departmentId: string | null;
  readonly categoryId: string | null;
  readonly productTypeId: string | null;
}

export type ProductEntryHierarchyReclassificationReason =
  | "CategoryRequired"
  | "CategoryUnavailable"
  | "ProductTypeRequired"
  | "ProductTypeUnavailable"
  | "ProductTypeCategoryMismatch";

export type ProductEntryHierarchyCompatibility =
  | { readonly type: "Compatible" }
  | { readonly type: "ReclassificationRequired"; readonly reason: ProductEntryHierarchyReclassificationReason };

export type ProductEntryInitialValuesHydration = ProductEntryHierarchyCompatibility & {
  readonly values: ProductEntryValues;
};

export class ProductEntryCatalogReferenceDataCoordinator {
  constructor(readonly port: ProductEntryCatalogReferenceDataPort) {}

  load(signal?: AbortSignal): Promise<ProductEntryCatalogReferenceDataState> {
    return this.port.load(signal);
  }

  categoriesForDepartment(
    data: ProductEntryCatalogReferenceData,
    departmentId: string | null,
  ) {
    return departmentId
      ? data.categories.filter((category) => category.departmentId === departmentId)
      : [];
  }

  productTypesForCategory(
    data: ProductEntryCatalogReferenceData,
    categoryId: string | null,
  ) {
    return categoryId
      ? data.productTypes.filter((productType) => productType.categoryId === categoryId)
      : [];
  }

  reconcileHierarchy(
    data: ProductEntryCatalogReferenceData,
    current: ProductEntryHierarchySelection,
    change: Partial<ProductEntryHierarchySelection>,
  ): ProductEntryHierarchySelection {
    const departmentId = change.departmentId !== undefined
      ? change.departmentId
      : current.departmentId;
    const categoryCandidate = change.categoryId !== undefined
      ? change.categoryId
      : current.categoryId;
    const categoryId = this.categoriesForDepartment(data, departmentId)
      .some(({ id }) => id === categoryCandidate)
      ? categoryCandidate
      : null;
    const productTypeCandidate = change.productTypeId !== undefined
      ? change.productTypeId
      : current.productTypeId;
    const productTypeId = this.productTypesForCategory(data, categoryId)
      .some(({ id }) => id === productTypeCandidate)
      ? productTypeCandidate
      : null;
    return { departmentId, categoryId, productTypeId };
  }

  hierarchyCompatibility(
    data: ProductEntryCatalogReferenceData,
    selection: ProductEntryHierarchySelection,
    requireCompleteHierarchy: boolean,
  ): ProductEntryHierarchyCompatibility {
    if (!selection.categoryId) {
      return requireCompleteHierarchy
        ? { type: "ReclassificationRequired", reason: "CategoryRequired" }
        : { type: "Compatible" };
    }
    const category = data.categories.find(({ id }) => id === selection.categoryId);
    if (!category) return { type: "ReclassificationRequired", reason: "CategoryUnavailable" };
    if (!selection.productTypeId) {
      return requireCompleteHierarchy
        ? { type: "ReclassificationRequired", reason: "ProductTypeRequired" }
        : { type: "Compatible" };
    }
    const productType = data.productTypes.find(({ id }) => id === selection.productTypeId);
    if (!productType) return { type: "ReclassificationRequired", reason: "ProductTypeUnavailable" };
    return productType.categoryId === category.id
      ? { type: "Compatible" }
      : { type: "ReclassificationRequired", reason: "ProductTypeCategoryMismatch" };
  }

  hydrateInitialValues(
    data: ProductEntryCatalogReferenceData,
    values: ProductEntryValues,
    requireCompleteHierarchy: boolean,
  ): ProductEntryInitialValuesHydration {
    const category = values.categoryId
      ? data.categories.find(({ id }) => id === values.categoryId)
      : undefined;
    const hydratedValues = category
      ? { ...values, departmentId: category.departmentId }
      : values;
    return {
      ...this.hierarchyCompatibility(data, hydratedValues, requireCompleteHierarchy),
      values: hydratedValues,
    };
  }

  specificationResolution(
    data: ProductEntryCatalogReferenceData,
    productTypeId: string | null,
  ): ProductEntrySpecificationsResolution {
    if (!productTypeId) return { status: "invalid-context", templateId: null, fields: [] };
    const template = data.specificationTemplates.find((item) => item.productTypeId === productTypeId);
    if (!template) return { status: "missing-template", templateId: null, fields: [] };
    const definitionsById = new Map(
      data.specificationDefinitions.map((definition) => [definition.id, definition]),
    );
    const fields = template.entries.flatMap((entry) => {
      const definition = definitionsById.get(entry.specificationDefinitionId);
      if (!definition) return [];
      return [{
        specificationFieldId: definition.id,
        code: definition.code,
        label: definition.displayName,
        fieldType: definition.valueType.toLowerCase() as "text" | "number" | "boolean",
        required: entry.required,
        sortOrder: entry.sortOrder,
        options: [],
        guidance: definition.unit
          ? { unitLabel: definition.unit }
          : undefined,
      }];
    }).sort((left, right) => left.sortOrder - right.sortOrder);
    return { status: "resolved", templateId: template.id, fields };
  }

  brandOptions(data: ProductEntryCatalogReferenceData): readonly ProductEntryReferenceOption[] {
    return data.brands;
  }
}
