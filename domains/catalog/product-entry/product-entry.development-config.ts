interface ProductEntryDevelopmentScope {
  readonly companyId: string;
  readonly workspaceId: string;
  readonly employeeId: string;
  readonly catalogId: string;
  readonly locale: "en" | "ar";
}

export const PRODUCT_ENTRY_DEVELOPMENT_SCOPE: ProductEntryDevelopmentScope = {
  companyId: "COMP-001",
  workspaceId: "WS-001",
  employeeId: "development-employee",
  catalogId: "CATALOG-001",
  locale: "en",
};
