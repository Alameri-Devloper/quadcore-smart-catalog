import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { isCurrencyCode } from "../../reference-data/domain/catalog-reference-data";
import { parsePriceAmount, validatePriceType, type BranchProductListingStatus, type PriceType, type PriceValue } from "../domain/branch-product";
import type { BranchProductClock, BranchProductUnitOfWork } from "../ports/branch-product-unit-of-work.port";
import { permittedListingManagementActions, type ListingManagementAction } from "./operational-management-authorization-policy";
import { branchProductFailure, branchProductSuccess, type BranchProductResult } from "./branch-product-results";

const can = (context: TrustedActorContext, permission: string) => context.role === "Owner" || context.permissions.includes(permission);
const inScope = (context: TrustedActorContext, branchId: string) => context.branchScope.type === "AllBranches" || context.branchScope.branchIds.includes(branchId);
const price = (value: PriceValue | null) => value ? Object.freeze({ amountMinor: value.amountMinor.toString(), currency: value.currency, revision: value.revision }) : null;
const requirePricePermission = (context: TrustedActorContext, priceType: PriceType, mutation: "Base" | "Override") => priceType === "ReferenceCost" ? can(context, mutation === "Base" ? "referenceCost.manage" : "referenceCost.branchOverride.manage") : can(context, mutation === "Base" ? "pricing.manage" : "pricing.branchOverride.manage");

export interface ListingManagementStateView {
  readonly branchId: string;
  readonly productId: string;
  readonly listingStatus: "NotConfigured" | BranchProductListingStatus;
  readonly revision: number;
  readonly updatedAt: string | null;
  readonly allowedActions: readonly ListingManagementAction[];
}

export class GetBranchProductListingUseCase {
  constructor(private readonly unitOfWork: BranchProductUnitOfWork) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string }): Promise<BranchProductResult<ListingManagementStateView>> {
    const permissionActions = permittedListingManagementActions(command.context);
    if (permissionActions.length === 0) return branchProductFailure("Forbidden");
    if (!inScope(command.context, command.branchId)) return branchProductFailure("BranchNotFound");
    return this.unitOfWork.execute(async ({ scope, listings }) => {
      const branch = await scope.findBranch(command.context.workspaceId, command.branchId);
      if (!branch) return branchProductFailure("BranchNotFound");
      const product = await scope.findProduct(command.context.workspaceId, command.productId);
      if (!product) return branchProductFailure("ProductNotFound");
      const listing = await listings.get(command.context.workspaceId, command.branchId, command.productId);
      return branchProductSuccess(Object.freeze({
        branchId: command.branchId,
        productId: command.productId,
        listingStatus: listing?.status ?? "NotConfigured",
        revision: listing?.revision ?? 0,
        updatedAt: listing?.updatedAt.toISOString() ?? null,
        allowedActions: branch.status === "Inactive" || product.lifecycleState === "Archived" ? Object.freeze([]) : permissionActions,
      }));
    });
  }
}

export class GetBranchProductOperationalViewUseCase {
  constructor(private readonly unitOfWork: BranchProductUnitOfWork) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string }): Promise<BranchProductResult<Readonly<Record<string, unknown>>>> {
    if (!can(command.context, "catalog.products.view") || !inScope(command.context, command.branchId)) return branchProductFailure("BranchNotFound");
    return this.unitOfWork.execute(async ({ scope, listings, pricing, inventory }) => {
      const branch = await scope.findBranch(command.context.workspaceId, command.branchId); if (!branch) return branchProductFailure("BranchNotFound"); const product = await scope.findProduct(command.context.workspaceId, command.productId); if (!product) return branchProductFailure("ProductNotFound"); const listing = await listings.get(command.context.workspaceId, command.branchId, command.productId);
      let inventoryView: Readonly<Record<string, unknown>> | null = null;
      if (can(command.context, "inventory.availability.view") || can(command.context, "inventory.quantity.view")) { const balance = await inventory.getBalance(command.context.workspaceId, command.branchId, command.productId); const onHand = balance?.onHand ?? BigInt(0); const reserved = balance?.reserved ?? BigInt(0); const damaged = balance?.damaged ?? BigInt(0); const detailed = can(command.context, "inventory.quantity.view"); inventoryView = Object.freeze({ unit: "Piece", available: (onHand - reserved - damaged).toString(), ...(detailed ? { onHand: onHand.toString(), reserved: reserved.toString(), damaged: damaged.toString() } : {}), revision: balance?.revision ?? 0, updatedAt: balance?.updatedAt.toISOString() ?? null }); }
      let pricingView: Readonly<Record<string, unknown>> | null = null;
      if (can(command.context, "pricing.view")) { const visible: PriceType[] = ["Retail", ...(can(command.context, "pricing.wholesale.view") ? ["Wholesale" as const] : []), ...(can(command.context, "referenceCost.view") ? ["ReferenceCost" as const] : [])]; const values: Record<string, unknown> = {}; for (const type of visible) { const base = await pricing.getBase(command.context.workspaceId, command.productId, type); const branchOverride = await pricing.getOverride(command.context.workspaceId, command.branchId, command.productId, type); values[type] = Object.freeze({ base: price(base), override: price(branchOverride), effective: price(branchOverride ?? base), source: branchOverride ? "BranchOverride" : base ? "WorkspaceBase" : "NotConfigured" }); } pricingView = Object.freeze(values); }
      return branchProductSuccess(Object.freeze({ branchId: command.branchId, branchStatus: branch.status, productId: command.productId, productLifecycle: product.lifecycleState, listing: Object.freeze({ status: listing?.status ?? "NotConfigured", revision: listing?.revision ?? 0, updatedAt: listing?.updatedAt.toISOString() ?? null }), inventory: inventoryView, pricing: pricingView }));
    });
  }
}

export class SetBranchProductListingUseCase {
  constructor(private readonly dependencies: { readonly unitOfWork: BranchProductUnitOfWork; readonly clock: BranchProductClock }) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string; readonly listingStatus: BranchProductListingStatus; readonly expectedRevision: number }): Promise<BranchProductResult<Readonly<Record<string, unknown>>>> {
    if ((!can(command.context, "catalog.product.edit") && !can(command.context, "catalog.products.edit")) || !inScope(command.context, command.branchId)) return branchProductFailure("Forbidden"); if (command.listingStatus !== "Listed" && command.listingStatus !== "Unlisted" || !Number.isSafeInteger(command.expectedRevision) || command.expectedRevision < 0) return branchProductFailure("InvalidInput");
    const now = this.dependencies.clock.now(); return this.dependencies.unitOfWork.execute(async ({ scope, listings, audit }) => { const branch = await scope.findBranch(command.context.workspaceId, command.branchId); if (!branch) return branchProductFailure("BranchNotFound"); if (branch.status !== "Active") return branchProductFailure("BranchInactive"); const product = await scope.findProduct(command.context.workspaceId, command.productId); if (!product) return branchProductFailure("ProductNotFound"); if (product.lifecycleState === "Archived") return branchProductFailure("ProductArchived"); const listing = await listings.set({ workspaceId: command.context.workspaceId, branchId: command.branchId, productId: command.productId, status: command.listingStatus, expectedRevision: command.expectedRevision, now }); if (!listing) return branchProductFailure("Conflict"); await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: command.listingStatus === "Listed" ? "ProductListedAtBranch" : "ProductUnlistedAtBranch", metadata: { branchId: command.branchId, productId: command.productId, revision: listing.revision }, occurredAt: now }); return branchProductSuccess(Object.freeze({ branchId: command.branchId, productId: command.productId, listingStatus: listing.status, revision: listing.revision, updatedAt: listing.updatedAt.toISOString() })); });
  }
}

export class GetBranchProductPricingUseCase {
  constructor(private readonly unitOfWork: BranchProductUnitOfWork) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string }): Promise<BranchProductResult<Readonly<Record<string, unknown>>>> {
    if (!can(command.context, "pricing.view")) return branchProductFailure("Forbidden"); if (!inScope(command.context, command.branchId)) return branchProductFailure("BranchNotFound");
    return this.unitOfWork.execute(async ({ scope, pricing }) => { if (!await scope.findBranch(command.context.workspaceId, command.branchId)) return branchProductFailure("BranchNotFound"); if (!await scope.findProduct(command.context.workspaceId, command.productId)) return branchProductFailure("ProductNotFound"); const visible: PriceType[] = ["Retail", ...(can(command.context, "pricing.wholesale.view") ? ["Wholesale" as const] : []), ...(can(command.context, "referenceCost.view") ? ["ReferenceCost" as const] : [])]; const values: Record<string, unknown> = {}; for (const type of visible) { const base = await pricing.getBase(command.context.workspaceId, command.productId, type); const override = await pricing.getOverride(command.context.workspaceId, command.branchId, command.productId, type); values[type] = Object.freeze({ base: price(base), override: price(override), effective: price(override ?? base), source: override ? "BranchOverride" : base ? "WorkspaceBase" : "NotConfigured" }); } return branchProductSuccess(Object.freeze({ branchId: command.branchId, productId: command.productId, prices: Object.freeze(values) })); });
  }
}

export class SetWorkspaceBasePriceUseCase {
  constructor(private readonly dependencies: { readonly unitOfWork: BranchProductUnitOfWork; readonly clock: BranchProductClock }) {}
  async execute(command: { readonly context: TrustedActorContext; readonly productId: string; readonly priceType: string; readonly amountMinor: string; readonly currency: string; readonly expectedRevision: number }): Promise<BranchProductResult<Readonly<Record<string, unknown>>>> {
    let priceType: PriceType; let amountMinor: bigint; try { priceType = validatePriceType(command.priceType); amountMinor = parsePriceAmount(command.amountMinor); } catch { return branchProductFailure("InvalidInput"); } if (!requirePricePermission(command.context, priceType, "Base")) return branchProductFailure("Forbidden"); if (!isCurrencyCode(command.currency)) return branchProductFailure("CurrencyNotAllowed"); const now = this.dependencies.clock.now();
    return this.dependencies.unitOfWork.execute(async ({ scope, pricing, audit }) => { const product = await scope.findProduct(command.context.workspaceId, command.productId); if (!product) return branchProductFailure("ProductNotFound"); if (product.lifecycleState === "Archived") return branchProductFailure("ProductArchived"); if (!await scope.isCurrencyEnabled(command.context.workspaceId, command.currency)) return branchProductFailure("CurrencyNotAllowed"); const value = await pricing.setBase({ workspaceId: command.context.workspaceId, productId: command.productId, priceType, amountMinor, currency: command.currency, expectedRevision: command.expectedRevision, now }); if (!value) return branchProductFailure("Conflict"); await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "WorkspaceBasePriceChanged", metadata: { productId: command.productId, priceType, currency: command.currency, revision: value.revision }, occurredAt: now }); return branchProductSuccess(Object.freeze({ productId: command.productId, priceType, value: price(value) })); });
  }
}

export class ClearWorkspaceBasePriceUseCase {
  constructor(private readonly dependencies: { readonly unitOfWork: BranchProductUnitOfWork; readonly clock: BranchProductClock }) {}
  async execute(command: { readonly context: TrustedActorContext; readonly productId: string; readonly priceType: string; readonly expectedRevision: number }): Promise<BranchProductResult<Readonly<Record<string, unknown>>>> {
    let priceType: PriceType; try { priceType = validatePriceType(command.priceType); } catch { return branchProductFailure("InvalidInput"); } if (!requirePricePermission(command.context, priceType, "Base")) return branchProductFailure("Forbidden"); const now = this.dependencies.clock.now();
    return this.dependencies.unitOfWork.execute(async ({ scope, pricing, audit }) => { const product = await scope.findProduct(command.context.workspaceId, command.productId); if (!product) return branchProductFailure("ProductNotFound"); if (product.lifecycleState === "Archived") return branchProductFailure("ProductArchived"); if (!await pricing.clearBase({ workspaceId: command.context.workspaceId, productId: command.productId, priceType, expectedRevision: command.expectedRevision, now })) return branchProductFailure("Conflict"); await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "WorkspaceBasePriceCleared", metadata: { productId: command.productId, priceType }, occurredAt: now }); return branchProductSuccess(Object.freeze({ productId: command.productId, priceType, value: null })); });
  }
}

export class SetBranchPriceOverrideUseCase {
  constructor(private readonly dependencies: { readonly unitOfWork: BranchProductUnitOfWork; readonly clock: BranchProductClock }) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string; readonly priceType: string; readonly amountMinor: string; readonly currency: string; readonly expectedRevision: number }): Promise<BranchProductResult<Readonly<Record<string, unknown>>>> {
    let priceType: PriceType; let amountMinor: bigint; try { priceType = validatePriceType(command.priceType); amountMinor = parsePriceAmount(command.amountMinor); } catch { return branchProductFailure("InvalidInput"); } if (!requirePricePermission(command.context, priceType, "Override")) return branchProductFailure("Forbidden"); if (!inScope(command.context, command.branchId)) return branchProductFailure("BranchNotFound"); if (!isCurrencyCode(command.currency)) return branchProductFailure("CurrencyNotAllowed"); const now = this.dependencies.clock.now();
    return this.dependencies.unitOfWork.execute(async ({ scope, pricing, audit }) => { const branch = await scope.findBranch(command.context.workspaceId, command.branchId); if (!branch) return branchProductFailure("BranchNotFound"); if (branch.status !== "Active") return branchProductFailure("BranchInactive"); const product = await scope.findProduct(command.context.workspaceId, command.productId); if (!product) return branchProductFailure("ProductNotFound"); if (product.lifecycleState === "Archived") return branchProductFailure("ProductArchived"); if (!await scope.isCurrencyEnabled(command.context.workspaceId, command.currency)) return branchProductFailure("CurrencyNotAllowed"); const value = await pricing.setOverride({ workspaceId: command.context.workspaceId, branchId: command.branchId, productId: command.productId, priceType, amountMinor, currency: command.currency, expectedRevision: command.expectedRevision, now }); if (!value) return branchProductFailure("Conflict"); await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "BranchPriceOverrideChanged", metadata: { branchId: command.branchId, productId: command.productId, priceType, currency: command.currency, revision: value.revision }, occurredAt: now }); return branchProductSuccess(Object.freeze({ branchId: command.branchId, productId: command.productId, priceType, override: price(value) })); });
  }
}

export class ClearBranchPriceOverrideUseCase {
  constructor(private readonly dependencies: { readonly unitOfWork: BranchProductUnitOfWork; readonly clock: BranchProductClock }) {}
  async execute(command: { readonly context: TrustedActorContext; readonly branchId: string; readonly productId: string; readonly priceType: string; readonly expectedRevision: number }): Promise<BranchProductResult<Readonly<Record<string, unknown>>>> {
    let priceType: PriceType; try { priceType = validatePriceType(command.priceType); } catch { return branchProductFailure("InvalidInput"); } if (!requirePricePermission(command.context, priceType, "Override")) return branchProductFailure("Forbidden"); if (!inScope(command.context, command.branchId)) return branchProductFailure("BranchNotFound"); const now = this.dependencies.clock.now();
    return this.dependencies.unitOfWork.execute(async ({ scope, pricing, audit }) => { const branch = await scope.findBranch(command.context.workspaceId, command.branchId); if (!branch) return branchProductFailure("BranchNotFound"); if (branch.status !== "Active") return branchProductFailure("BranchInactive"); const product = await scope.findProduct(command.context.workspaceId, command.productId); if (!product) return branchProductFailure("ProductNotFound"); if (product.lifecycleState === "Archived") return branchProductFailure("ProductArchived"); if (!await pricing.clearOverride({ workspaceId: command.context.workspaceId, branchId: command.branchId, productId: command.productId, priceType, expectedRevision: command.expectedRevision })) return branchProductFailure("Conflict"); await audit.append({ workspaceId: command.context.workspaceId, actorId: command.context.actorId, eventType: "BranchPriceOverrideCleared", metadata: { branchId: command.branchId, productId: command.productId, priceType }, occurredAt: now }); return branchProductSuccess(Object.freeze({ branchId: command.branchId, productId: command.productId, priceType, override: null })); });
  }
}
