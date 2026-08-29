import type { CatalogCursorPosition, CatalogFilterOptionsProjection, CatalogMediaStorageProjection, CatalogProductDetailsProjection, CatalogProductSearchRow, CatalogQueryVisibility, CatalogSearchFilters, CatalogSort } from "../domain/catalog-query";

export interface CatalogSearchRepositoryQuery {
  readonly workspaceId: string;
  readonly branchId: string | null;
  readonly searchText: string;
  readonly filters: CatalogSearchFilters;
  readonly sort: CatalogSort;
  readonly cursor: CatalogCursorPosition | null;
  readonly limit: number;
  readonly visibility: CatalogQueryVisibility;
}

export interface CatalogDetailsRepositoryQuery {
  readonly workspaceId: string;
  readonly productId: string;
  readonly branchId: string | null;
  readonly visibility: CatalogQueryVisibility;
}

export interface CatalogHierarchyFilter {
  readonly departmentId?: string;
  readonly categoryId?: string;
  readonly productTypeId?: string;
  readonly brandId?: string;
  readonly supplyStatusId?: string;
}

export interface CatalogQueryRepository {
  branchExists(workspaceId: string, branchId: string): Promise<boolean>;
  hierarchyIsValid(workspaceId: string, filter: CatalogHierarchyFilter): Promise<boolean>;
  search(query: CatalogSearchRepositoryQuery): Promise<readonly CatalogProductSearchRow[]>;
  getDetails(query: CatalogDetailsRepositoryQuery): Promise<CatalogProductDetailsProjection | null>;
  getFilterOptions(workspaceId: string, allowedBranchIds: readonly string[] | null): Promise<CatalogFilterOptionsProjection>;
  getMedia(workspaceId: string, productId: string, mediaId: string): Promise<CatalogMediaStorageProjection | null>;
}
