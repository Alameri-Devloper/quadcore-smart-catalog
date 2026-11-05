import type { CatalogSpecificationPresentationContext } from "../domain/catalog-specification-presentation";
import type { CatalogCursorPosition, CatalogFilterOptionsProjection, CatalogLifecycle, CatalogMediaStorageProjection, CatalogProductDetailsProjection, CatalogProductSearchRow, CatalogQueryVisibility, CatalogSearchFilters, CatalogSort } from "../domain/catalog-query";

export type CatalogLifecycleScope =
  | { readonly type: "Exact"; readonly lifecycle: CatalogLifecycle }
  | { readonly type: "Allowed"; readonly lifecycles: readonly CatalogLifecycle[] };

export interface CatalogSearchRepositoryQuery {
  readonly workspaceId: string;
  readonly branchId: string | null;
  readonly searchText: string;
  readonly filters: Omit<CatalogSearchFilters, "lifecycle">;
  readonly lifecycleScope: CatalogLifecycleScope;
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
  getSpecificationFilterDefinitions(workspaceId:string,productTypeId:string,allowedIds:readonly string[]):Promise<readonly import('../domain/catalog-specification-filters').SpecificationFilterDefinition[]>;
  getSpecificationFilterValues(query:CatalogSearchRepositoryQuery,definitions:readonly import('../domain/catalog-specification-filters').SpecificationFilterDefinition[]):Promise<readonly import('../domain/catalog-specification-filters').SpecificationFilterOption[]>;
  branchExists(workspaceId: string, branchId: string): Promise<boolean>;
  hierarchyIsValid(workspaceId: string, filter: CatalogHierarchyFilter): Promise<boolean>;
  search(query: CatalogSearchRepositoryQuery): Promise<readonly CatalogProductSearchRow[]>;
  getSpecificationPresentation(workspaceId: string, productIds: readonly string[]): Promise<readonly CatalogSpecificationPresentationContext[]>;
  getDetails(query: CatalogDetailsRepositoryQuery): Promise<CatalogProductDetailsProjection | null>;
  getFilterOptions(workspaceId: string, allowedBranchIds: readonly string[] | null): Promise<CatalogFilterOptionsProjection>;
  getMedia(workspaceId: string, productId: string, mediaId: string): Promise<CatalogMediaStorageProjection | null>;
}
