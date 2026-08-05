interface ProductEntryDevelopmentScope {
  readonly companyId: string;
  readonly workspaceId: string;
  readonly employeeId: string;
}

export const PRODUCT_ENTRY_DEVELOPMENT_SCOPE: ProductEntryDevelopmentScope = {
  companyId: "COMP-001",
  workspaceId: "WS-001",
  employeeId: "development-employee",
};
