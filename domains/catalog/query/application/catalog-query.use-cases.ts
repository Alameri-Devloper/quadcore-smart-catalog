import type { CatalogSpecificationGroupProjection, CatalogSpecificationPresentationProfile } from "../domain/catalog-specification-presentation";
import {interpretCatalogSearch} from "./interpret-catalog-search";
import type {StructuredInterpretation} from "../domain/catalog-structured-search";
import {parseSpecificationFilterInput,parseCatalogBrandIds,resolveTypedSpecificationFilters} from "../domain/catalog-specification-filters";
import { projectCatalogSpecifications } from "./project-catalog-specifications";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { ProductMediaReaderPort } from "../../media/ports/product-media-reader.port";
import type { PermissionCode } from "../../../identity/domain/permission";
import {
  CATALOG_PAGE_SIZE_DEFAULT,
  CATALOG_PAGE_SIZE_MAX,
  catalogQueryFingerprint,
  decodeCatalogCursor,
  encodeCatalogCursor,
  isCatalogCondition,
  isCatalogDeviceClass,
  isCatalogLifecycle,
  isCatalogListingFilter,
  isCatalogSort,
  isCatalogStockFilter,
  isOperationalProductSearchPurpose,
  normalizeCatalogSearchText,
  operationalCatalogQueryFingerprint,
  parseCatalogMoney,
  validateCatalogId,
  type CatalogMoneyProjection,
  type CatalogProductDetailsProjection,
  type CatalogProductProjection,
  type CatalogQueryVisibility,
  type CatalogSearchFilters,
  type CatalogSort,
  type OperationalProductSearchPurpose,
} from "../domain/catalog-query";
import type { CatalogQueryRepository } from "../ports/catalog-query-repository.port";
import { catalogQueryFailure, catalogQuerySuccess, type CatalogQueryResult } from "./catalog-query-results";

export interface CatalogSearchInput {
  readonly searchMode?: string;
  readonly specificationFilters?: string;
  readonly brandIds?: string;
  readonly q?: string; readonly branchId?: string; readonly departmentId?: string; readonly categoryId?: string;
  readonly productTypeId?: string; readonly brandId?: string; readonly deviceClass?: string; readonly condition?: string;
  readonly supplyStatusId?: string; readonly lifecycle?: string; readonly listing?: string; readonly stock?: string;
  readonly minRetailPrice?: string; readonly maxRetailPrice?: string; readonly retailCurrency?: string;
  readonly sort?: string; readonly cursor?: string; readonly limit?: number;
}

export interface OperationalProductSearchInput {
  readonly purpose: string;
  readonly q?: string;
  readonly branchId?: string;
  readonly cursor?: string;
  readonly limit?: number;
}

export interface OperationalProductSearchView {
  readonly items: readonly {
    readonly productId: string;
    readonly productCode: string | null;
    readonly productName: string | null;
    readonly lifecycle: "Draft" | "Published";
    readonly branchId?: string;
    readonly listingStatus?: "Listed" | "Unlisted" | "NotConfigured";
  }[];
  readonly nextCursor: string | null;
}

const CATALOG_MEDIA_MAX_BYTES = 8 * 1024 * 1024;
type SharePriceMode = "Retail" | "Wholesale";
interface MoneyView { readonly amountMinor: string; readonly currency: string; readonly source: "WorkspaceBase" | "BranchOverride" }
interface MediaView { readonly mediaId: string; readonly altText: string | null; readonly position: number; readonly isMain: boolean; readonly downloadUrl: string }
interface ProductView {
  readonly productId: string; readonly productCode: string | null; readonly productName: string | null; readonly lifecycle: string;
  readonly branchId?: string;
  readonly createdAt: string; readonly updatedAt: string; readonly classification: CatalogProductProjection["classification"];
  readonly mainMedia: MediaView | null; readonly listingStatus: CatalogProductProjection["listingStatus"];
  readonly modelName?: string;
  readonly cardSpecifications?: CatalogProductDetailsProjection["specifications"];
  readonly availability?: "InStock" | "OutOfStock";
  readonly inventory?: { readonly available: string; readonly onHand: string; readonly reserved: string; readonly damaged: string };
  readonly retail?: MoneyView | null; readonly wholesale?: MoneyView | null; readonly referenceCost?: MoneyView | null;
}
export interface CatalogSearchView { readonly structuredInterpretation?: import("../domain/catalog-structured-search").StructuredInterpretation; readonly items: readonly ProductView[]; readonly nextCursor: string | null }
export interface CatalogDetailsView extends ProductView {
  readonly media: readonly MediaView[];
  readonly specifications: CatalogProductDetailsProjection["specifications"];
  readonly specificationGroups?: readonly CatalogSpecificationGroupProjection[];
  readonly capabilities: { readonly directSharePriceModes: readonly SharePriceMode[] };
}
export interface CatalogMediaFile { readonly bytes: Uint8Array; readonly contentType: "image/webp" }

const can = (context: TrustedActorContext, permission: string) => context.role === "Owner" || context.permissions.includes(permission);
const inScope = (context: TrustedActorContext, branchId: string) => context.branchScope.type === "AllBranches" || context.branchScope.branchIds.includes(branchId);
const visibilityOf = (context: TrustedActorContext): CatalogQueryVisibility => Object.freeze({
  retail: can(context, "pricing.view"), wholesale: can(context, "pricing.wholesale.view"),
  availability: can(context, "inventory.availability.view") || can(context, "inventory.quantity.view"),
  quantity: can(context, "inventory.quantity.view"), referenceCost: can(context, "referenceCost.view"),
});
const money = (value: CatalogMoneyProjection | null): MoneyView | null => value ? Object.freeze({ amountMinor: value.amountMinor.toString(), currency: value.currency, source: value.source }) : null;
const media = (productId: string, value: CatalogProductProjection["mainMedia"]): MediaView | null => value ? Object.freeze({
  ...value,
  downloadUrl: `/api/catalog/products/${encodeURIComponent(productId)}/media/${encodeURIComponent(value.mediaId)}`,
}) : null;
const productView = (value: CatalogProductProjection, visibility: CatalogQueryVisibility, branchId: string | null, details = false): ProductView => Object.freeze({
  productId: value.productId, productCode: value.productCode, productName: value.productName, lifecycle: value.lifecycle,
  ...(branchId ? { branchId } : {}),
  createdAt: value.createdAt.toISOString(), updatedAt: value.updatedAt.toISOString(), classification: value.classification,
  mainMedia: media(value.productId, value.mainMedia), listingStatus: value.listingStatus,
  ...(visibility.availability ? { availability: value.inventory.available > BigInt(0) ? "InStock" as const : "OutOfStock" as const } : {}),
  ...(visibility.quantity ? { inventory: Object.freeze({ available: value.inventory.available.toString(), onHand: value.inventory.onHand.toString(), reserved: value.inventory.reserved.toString(), damaged: value.inventory.damaged.toString() }) } : {}),
  ...(visibility.retail ? { retail: money(value.retail) } : {}), ...(visibility.wholesale ? { wholesale: money(value.wholesale) } : {}),
  ...(details && visibility.referenceCost ? { referenceCost: money(value.referenceCost) } : {}),
});

const invalid = () => catalogQueryFailure("InvalidQuery");
const operationalBranchPurposes = new Set<OperationalProductSearchPurpose>(["Listing", "Inventory", "BranchPricing", "BranchReferenceCost"]);
type DirectOperationalPurpose = Exclude<OperationalProductSearchPurpose, "WorkspacePricing" | "WorkspaceReferenceCost">;
const operationalPurposePermissions: Readonly<Record<DirectOperationalPurpose, readonly PermissionCode[]>> = Object.freeze({
  Listing: Object.freeze(["catalog.product.edit", "catalog.products.edit"] as const),
  Inventory: Object.freeze(["inventory.availability.view", "inventory.quantity.view", "inventory.receive", "inventory.issue", "inventory.reserve", "inventory.transfer", "inventory.damage", "inventory.adjust"] as const),
  BranchPricing: Object.freeze(["pricing.branchOverride.manage"] as const),
  BranchReferenceCost: Object.freeze(["referenceCost.branchOverride.manage"] as const),
});
const canDiscoverOperationalProducts = (context: TrustedActorContext, purpose: OperationalProductSearchPurpose): boolean => {
  if (purpose === "WorkspacePricing") return can(context, "pricing.manage") || can(context, "pricing.view");
  if (purpose === "WorkspaceReferenceCost") return can(context, "referenceCost.manage")
    || (can(context, "pricing.view") && can(context, "referenceCost.view"));
  return operationalPurposePermissions[purpose].some((permission) => can(context, permission));
};
const normalize = (input: CatalogSearchInput, visibility: CatalogQueryVisibility): { searchText: string; branchId: string | null; filters: CatalogSearchFilters; sort: CatalogSort; limit: number } | null => {
  try {
    const searchText = normalizeCatalogSearchText(input.q);
    const branchId = validateCatalogId(input.branchId) ?? null;
    const departmentId = validateCatalogId(input.departmentId), categoryId = validateCatalogId(input.categoryId), productTypeId = validateCatalogId(input.productTypeId);
    const brandIds = parseCatalogBrandIds(input.brandIds);
    if(input.brandId !== undefined && input.brandIds !== undefined)return null;
    const brandId = validateCatalogId(input.brandId), supplyStatusId = validateCatalogId(input.supplyStatusId);
    const lifecycle = input.lifecycle ?? "Published"; if (!isCatalogLifecycle(lifecycle)) return null;
    const sort = input.sort ?? (searchText ? "relevance" : "newest"); if (!isCatalogSort(sort)) return null;
    if (!searchText && sort === "relevance") return null;
    if (input.deviceClass !== undefined && !isCatalogDeviceClass(input.deviceClass)) return null;
    if (input.condition !== undefined && !isCatalogCondition(input.condition)) return null;
    if (input.listing !== undefined && !isCatalogListingFilter(input.listing)) return null;
    if (input.stock !== undefined && !isCatalogStockFilter(input.stock)) return null;
    const minRetailPrice = parseCatalogMoney(input.minRetailPrice), maxRetailPrice = parseCatalogMoney(input.maxRetailPrice);
    if (minRetailPrice !== undefined && maxRetailPrice !== undefined && minRetailPrice > maxRetailPrice) return null;
    const priceOperation = minRetailPrice !== undefined || maxRetailPrice !== undefined || sort.startsWith("retail-price");
    const retailCurrency = input.retailCurrency?.toUpperCase();
    if ((retailCurrency !== undefined && !/^[A-Z]{3}$/u.test(retailCurrency)) || (priceOperation && (!visibility.retail || !retailCurrency))) return null;
    if ((input.listing !== undefined || input.stock !== undefined) && !branchId) return null;
    const limit = input.limit ?? CATALOG_PAGE_SIZE_DEFAULT; if (!Number.isInteger(limit) || limit < 1 || limit > CATALOG_PAGE_SIZE_MAX) return null;
    return { searchText, branchId, sort, limit, filters: Object.freeze({ departmentId, categoryId, productTypeId, brandId, ...(brandIds.length ? {brandIds}:{}), deviceClass: input.deviceClass, condition: input.condition, supplyStatusId, lifecycle, listing: branchId ? input.listing ?? "Listed" : undefined, stock: input.stock, minRetailPrice, maxRetailPrice, retailCurrency }) };
  } catch { return null; }
};

export class SearchCatalogProductsUseCase {
  constructor(private readonly repository: CatalogQueryRepository, private readonly specificationProfiles: readonly CatalogSpecificationPresentationProfile[] = []) {}
  async execute(command: { readonly context: TrustedActorContext; readonly input: CatalogSearchInput }): Promise<CatalogQueryResult<CatalogSearchView>> {
    if (!can(command.context, "catalog.products.view")) return catalogQueryFailure("Forbidden");
    let input=command.input;
    let structuredInterpretation:StructuredInterpretation|undefined;
    if(input.searchMode!==undefined && input.searchMode!=="ordinary" && input.searchMode!=="structured")return invalid();
    if(input.searchMode==="structured"){try{if(input.sort==="relevance")return invalid();const interpreted=await interpretCatalogSearch(input,command.context,this.repository,this.specificationProfiles);input=interpreted.input;structuredInterpretation=interpreted.interpretation;}catch{return invalid();}}
    const actorVisibility = visibilityOf(command.context), normalized = normalize(input, actorVisibility); if (!normalized) return invalid();
    const visibility = Object.freeze({ ...actorVisibility, availability: actorVisibility.availability && normalized.branchId !== null, quantity: actorVisibility.quantity && normalized.branchId !== null });
    try {
      const criteria=parseSpecificationFilterInput(input.specificationFilters);
      if(criteria.length && !normalized.filters.productTypeId)return invalid();
      const allowed=this.specificationProfiles.find(p=>p.workspaceId===command.context.workspaceId && p.productTypeId===normalized.filters.productTypeId)?.fields.filter(f=>f.filterable===true).map(f=>f.specificationDefinitionId) ?? [];
      const definitions=criteria.length ? await this.repository.getSpecificationFilterDefinitions(command.context.workspaceId,normalized.filters.productTypeId!,allowed) : [];
      const filters=resolveTypedSpecificationFilters(criteria,definitions);
      if(filters.length)normalized.filters=Object.freeze({...normalized.filters,specificationFilters:filters});
      for(const brandId of normalized.filters.brandIds ?? [])if(!await this.repository.hierarchyIsValid(command.context.workspaceId,{brandId}))return invalid();
    } catch { return invalid(); }
    const shape = { ...(structuredInterpretation?{structuredQuery:normalizeCatalogSearchText(command.input.q)}:{}), searchText: normalized.searchText, branchId: normalized.branchId, filters: normalized.filters, sort: normalized.sort, visibility } as const;
    const fingerprint = catalogQueryFingerprint(shape); let cursor = null;
    if (input.cursor) { try { cursor = decodeCatalogCursor(input.cursor, normalized.sort, fingerprint); } catch { return catalogQueryFailure("InvalidCursor"); } }
    if (normalized.branchId && !inScope(command.context, normalized.branchId)) return catalogQueryFailure("BranchNotFound");
    if (normalized.filters.lifecycle !== "Published" && !can(command.context, "catalog.products.edit")) return catalogQueryFailure("Forbidden");
    if (normalized.filters.listing && normalized.filters.listing !== "Listed" && !can(command.context, "catalog.products.edit")) return catalogQueryFailure("Forbidden");
    if (normalized.filters.stock && !visibility.availability) return catalogQueryFailure("Forbidden");
    if (normalized.branchId && !await this.repository.branchExists(command.context.workspaceId, normalized.branchId)) return catalogQueryFailure("BranchNotFound");
    if (!await this.repository.hierarchyIsValid(command.context.workspaceId, normalized.filters)) return invalid();
    const { lifecycle, ...repositoryFilters } = normalized.filters;
    const rows = await this.repository.search({ workspaceId: command.context.workspaceId, searchText: shape.searchText, branchId: shape.branchId, filters: repositoryFilters, lifecycleScope: Object.freeze({ type: "Exact", lifecycle }), sort: shape.sort, visibility: shape.visibility, cursor, limit: normalized.limit + 1 });
    const page = rows.slice(0, normalized.limit), last = page.at(-1);
    const selectedIds = page.filter(({ product }) => this.specificationProfiles.some((profile) => profile.workspaceId === command.context.workspaceId && profile.productTypeId === product.classification.productType?.id)).map(({ product }) => product.productId);
    const specificationContexts = selectedIds.length ? await this.repository.getSpecificationPresentation(command.context.workspaceId, selectedIds) : [];
    const contexts = new Map(specificationContexts.map((context) => [context.productId, context]));
    const items = page.map(({ product }) => {
      const context = contexts.get(product.productId);
      const presentation = context && context.productTypeId === product.classification.productType?.id
        ? projectCatalogSpecifications({ workspaceId: command.context.workspaceId, productTypeId: context.productTypeId, specifications: context.specifications, definitions: context.definitions, profiles: this.specificationProfiles }) : null;
      return Object.freeze({ ...productView(product, visibility, normalized.branchId), ...(presentation ? { cardSpecifications: presentation.cardSpecifications, ...(presentation.modelName ? {modelName:presentation.modelName}: {}) } : {}) });
    });
    return catalogQuerySuccess(Object.freeze({ ...(structuredInterpretation?{structuredInterpretation}:{}), items: Object.freeze(items), nextCursor: rows.length > normalized.limit && last ? encodeCatalogCursor(normalized.sort, fingerprint, last.cursor) : null }));
  }
}

export class SearchOperationalProductsUseCase {
  constructor(private readonly repository: CatalogQueryRepository) {}
  async execute(command: { readonly context: TrustedActorContext; readonly input: OperationalProductSearchInput }): Promise<CatalogQueryResult<OperationalProductSearchView>> {
    const purpose = command.input.purpose;
    if (!isOperationalProductSearchPurpose(purpose)) return invalid();
    if (!canDiscoverOperationalProducts(command.context, purpose)) return catalogQueryFailure("Forbidden");

    let searchText: string, branchId: string | null;
    try { searchText = normalizeCatalogSearchText(command.input.q); branchId = validateCatalogId(command.input.branchId) ?? null; } catch { return invalid(); }
    const branchScoped = operationalBranchPurposes.has(purpose);
    if ((branchScoped && !branchId) || (!branchScoped && branchId)) return invalid();
    const limit = command.input.limit ?? CATALOG_PAGE_SIZE_DEFAULT;
    if (!Number.isInteger(limit) || limit < 1 || limit > CATALOG_PAGE_SIZE_MAX) return invalid();
    if (branchId && (!inScope(command.context, branchId) || !await this.repository.branchExists(command.context.workspaceId, branchId))) return catalogQueryFailure("BranchNotFound");

    const sort: CatalogSort = searchText ? "relevance" : "newest";
    const fingerprint = operationalCatalogQueryFingerprint({ purpose, searchText, branchId, sort });
    let cursor = null;
    if (command.input.cursor) { try { cursor = decodeCatalogCursor(command.input.cursor, sort, fingerprint); } catch { return catalogQueryFailure("InvalidCursor"); } }
    const visibility: CatalogQueryVisibility = Object.freeze({ retail: false, wholesale: false, availability: false, quantity: false, referenceCost: false });
    const rows = await this.repository.search({
      workspaceId: command.context.workspaceId,
      branchId,
      searchText,
      filters: Object.freeze({}),
      lifecycleScope: Object.freeze({ type: "Allowed", lifecycles: Object.freeze(["Draft", "Published"] as const) }),
      sort,
      cursor,
      limit: limit + 1,
      visibility,
    });
    const page = rows.slice(0, limit), last = page.at(-1);
    return catalogQuerySuccess(Object.freeze({
      items: Object.freeze(page.map(({ product }) => Object.freeze({
        productId: product.productId,
        productCode: product.productCode,
        productName: product.productName,
        lifecycle: product.lifecycle as "Draft" | "Published",
        ...(branchId ? { branchId, listingStatus: product.listingStatus } : {}),
      }))),
      nextCursor: rows.length > limit && last ? encodeCatalogCursor(sort, fingerprint, last.cursor) : null,
    }));
  }
}

export class GetCatalogProductDetailsUseCase {
  constructor(private readonly repository: CatalogQueryRepository, private readonly specificationProfiles: readonly CatalogSpecificationPresentationProfile[] = []) {}
  async execute(command: { readonly context: TrustedActorContext; readonly productId: string; readonly branchId?: string }): Promise<CatalogQueryResult<CatalogDetailsView>> {
    if (!can(command.context, "catalog.products.view")) return catalogQueryFailure("Forbidden");
    let productId: string | undefined, branchId: string | null; try { productId = validateCatalogId(command.productId); branchId = validateCatalogId(command.branchId) ?? null; } catch { return invalid(); }
    if (!productId) return invalid(); if (branchId && (!inScope(command.context, branchId) || !await this.repository.branchExists(command.context.workspaceId, branchId))) return catalogQueryFailure("BranchNotFound");
    const actorVisibility = visibilityOf(command.context), visibility = Object.freeze({ ...actorVisibility, availability: actorVisibility.availability && branchId !== null, quantity: actorVisibility.quantity && branchId !== null });
    const product = await this.repository.getDetails({ workspaceId: command.context.workspaceId, productId, branchId, visibility });
    if (!product) return catalogQueryFailure("ProductNotFound");
    if (product.lifecycle !== "Published" && !can(command.context, "catalog.products.edit")) return catalogQueryFailure("ProductNotFound");
    if (branchId && product.listingStatus !== "Listed" && !can(command.context, "catalog.products.edit")) return catalogQueryFailure("ProductNotFound");
    const shareEligible = can(command.context, "catalog.sharing.create") && product.lifecycle === "Published" && (!branchId || product.listingStatus === "Listed");
    const directSharePriceModes: SharePriceMode[] = [];
    if (shareEligible && can(command.context, "pricing.view")) directSharePriceModes.push("Retail");
    if (shareEligible && can(command.context, "pricing.wholesale.view")) directSharePriceModes.push("Wholesale");
    const hasProfile = this.specificationProfiles.some((profile) => profile.workspaceId === command.context.workspaceId && profile.productTypeId === product.classification.productType?.id);
    const specificationContext = hasProfile ? (await this.repository.getSpecificationPresentation(command.context.workspaceId, [product.productId]))[0] : undefined;
    const presentation = specificationContext && specificationContext.productTypeId === product.classification.productType?.id
      ? projectCatalogSpecifications({ workspaceId: command.context.workspaceId, productTypeId: specificationContext.productTypeId, specifications: product.specifications, definitions: specificationContext.definitions, profiles: this.specificationProfiles }) : null;
    return catalogQuerySuccess(Object.freeze({
      ...productView(product, visibility, branchId, true),
      media: Object.freeze(product.media.map((item) => media(product.productId, item)!)),
      specifications: presentation?.specifications ?? product.specifications,
      ...(presentation ? { cardSpecifications: presentation.cardSpecifications, specificationGroups: presentation.specificationGroups, ...(presentation.modelName ? {modelName:presentation.modelName}: {}) } : {}),
      capabilities: Object.freeze({ directSharePriceModes: Object.freeze(directSharePriceModes) }),
    }));
  }
}

export class GetCatalogFilterOptionsUseCase {
  constructor(private readonly repository: CatalogQueryRepository, private readonly specificationProfiles: readonly CatalogSpecificationPresentationProfile[] = []) {}
  async execute(command: { readonly context: TrustedActorContext; readonly input?: CatalogSearchInput }) {
    if (!can(command.context, "catalog.products.view")) return catalogQueryFailure("Forbidden");
    if(command.input?.searchMode!==undefined && command.input.searchMode!=="ordinary")return invalid();
    const normalized=normalize(command.input ?? {},visibilityOf(command.context));
    if(!normalized)return invalid();
    const visibility=Object.freeze({...visibilityOf(command.context),availability:visibilityOf(command.context).availability && normalized.branchId!==null,quantity:visibilityOf(command.context).quantity && normalized.branchId!==null});
    if(normalized.branchId && !inScope(command.context,normalized.branchId))return catalogQueryFailure("BranchNotFound");
    if(normalized.filters.lifecycle!=="Published" && !can(command.context,"catalog.products.edit"))return catalogQueryFailure("Forbidden");
    if(normalized.filters.listing && normalized.filters.listing!=="Listed" && !can(command.context,"catalog.products.edit"))return catalogQueryFailure("Forbidden");
    if(normalized.filters.stock && !visibility.availability)return catalogQueryFailure("Forbidden");
    if(normalized.branchId && !await this.repository.branchExists(command.context.workspaceId,normalized.branchId))return catalogQueryFailure("BranchNotFound");
    if(!await this.repository.hierarchyIsValid(command.context.workspaceId,normalized.filters))return invalid();
    for(const brandId of normalized.filters.brandIds ?? [])if(!await this.repository.hierarchyIsValid(command.context.workspaceId,{brandId}))return invalid();
    const allowed=this.specificationProfiles.find(p=>p.workspaceId===command.context.workspaceId && p.productTypeId===normalized.filters.productTypeId)?.fields.filter(f=>f.filterable===true).map(f=>f.specificationDefinitionId) ?? [];
    const definitions=normalized.filters.productTypeId ? await this.repository.getSpecificationFilterDefinitions(command.context.workspaceId,normalized.filters.productTypeId,allowed) : [];
    try {const input=parseSpecificationFilterInput(command.input?.specificationFilters);if(input.length && !normalized.filters.productTypeId)return invalid();resolveTypedSpecificationFilters(input,definitions);}catch{return invalid();}
    const {lifecycle,...filters}=normalized.filters;
    const specificationFilters=definitions.length ? await this.repository.getSpecificationFilterValues({workspaceId:command.context.workspaceId,searchText:normalized.searchText,branchId:normalized.branchId,filters,lifecycleScope:{type:"Exact",lifecycle},sort:normalized.sort,cursor:null,limit:1,visibility},definitions) : [];
    const allowedBranchIds = command.context.branchScope.type === "AllBranches" ? null : command.context.branchScope.branchIds;
    const options = await this.repository.getFilterOptions(command.context.workspaceId, allowedBranchIds);
    return catalogQuerySuccess(Object.freeze({
      ...options,
      ...(command.input ? {specificationFilters:Object.freeze(specificationFilters)} : {}),
      capabilities: Object.freeze({
        lifecycles: Object.freeze(can(command.context, "catalog.products.edit") ? ["Published", "Draft", "Archived"] as const : ["Published"] as const),
        listingFilters: Object.freeze(can(command.context, "catalog.products.edit") ? ["Listed", "Unlisted", "NotConfigured", "Any"] as const : ["Listed"] as const),
        stockFilters: Object.freeze((can(command.context, "inventory.availability.view") || can(command.context, "inventory.quantity.view")) ? ["InStock", "OutOfStock"] as const : [] as const),
        retailPrice: can(command.context, "pricing.view"),
      }),
    }));
  }
}

export class DownloadCatalogProductMediaUseCase {
  constructor(private readonly repository: CatalogQueryRepository, private readonly reader: ProductMediaReaderPort) {}
  async execute(command: { readonly context: TrustedActorContext; readonly productId: string; readonly mediaId: string }): Promise<CatalogQueryResult<CatalogMediaFile>> {
    if (!can(command.context, "catalog.products.view")) return catalogQueryFailure("Forbidden");
    let productId: string | undefined, mediaId: string | undefined;
    try { productId = validateCatalogId(command.productId); mediaId = validateCatalogId(command.mediaId); } catch { return invalid(); }
    if (!productId || !mediaId) return invalid();
    const projection = await this.repository.getMedia(command.context.workspaceId, productId, mediaId);
    if (!projection) return catalogQueryFailure("MediaUnavailable");
    if (projection.lifecycle !== "Published" && !can(command.context, "catalog.products.edit")) return catalogQueryFailure("MediaUnavailable");
    const file = await this.reader.read({ workspaceId: command.context.workspaceId, productId, storageRootKey: projection.storageRootKey, storageKey: projection.storageKey, expectedSha256: projection.checksumSha256, maximumBytes: CATALOG_MEDIA_MAX_BYTES });
    return file.type === "Found" ? catalogQuerySuccess(Object.freeze({ bytes: file.bytes, contentType: "image/webp" as const })) : catalogQueryFailure("MediaUnavailable");
  }
}
