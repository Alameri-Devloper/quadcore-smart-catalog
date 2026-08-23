import type { BranchPriceOverride, BranchProductListingStatus, PriceType, PriceValue } from "../domain/branch-product";

export interface BranchProductScopeRepository { findBranch(workspaceId: string, branchId: string): Promise<{ readonly status: "Active" | "Inactive" } | null>; findProduct(workspaceId: string, productId: string): Promise<{ readonly lifecycleState: string; readonly revision: number } | null>; isCurrencyEnabled(workspaceId: string, currency: string): Promise<boolean> }
export interface BranchProductListingRepository { get(workspaceId: string, branchId: string, productId: string): Promise<{ readonly status: BranchProductListingStatus; readonly revision: number; readonly createdAt: Date; readonly updatedAt: Date } | null>; set(input: { readonly workspaceId: string; readonly branchId: string; readonly productId: string; readonly status: BranchProductListingStatus; readonly expectedRevision: number; readonly now: Date }): Promise<{ readonly status: BranchProductListingStatus; readonly revision: number; readonly createdAt: Date; readonly updatedAt: Date } | null> }
export interface ProductPricingRepository {
  getBase(workspaceId: string, productId: string, priceType: PriceType): Promise<PriceValue | null>;
  setBase(input: { readonly workspaceId: string; readonly productId: string; readonly priceType: PriceType; readonly amountMinor: bigint; readonly currency: string; readonly expectedRevision: number; readonly now: Date }): Promise<PriceValue | null>;
  clearBase(input: { readonly workspaceId: string; readonly productId: string; readonly priceType: PriceType; readonly expectedRevision: number; readonly now: Date }): Promise<boolean>;
  getOverride(workspaceId: string, branchId: string, productId: string, priceType: PriceType): Promise<BranchPriceOverride | null>;
  setOverride(input: { readonly workspaceId: string; readonly branchId: string; readonly productId: string; readonly priceType: PriceType; readonly amountMinor: bigint; readonly currency: string; readonly expectedRevision: number; readonly now: Date }): Promise<BranchPriceOverride | null>;
  clearOverride(input: { readonly workspaceId: string; readonly branchId: string; readonly productId: string; readonly priceType: PriceType; readonly expectedRevision: number }): Promise<boolean>;
}
export interface BranchProductInventoryReadRepository { getBalance(workspaceId: string, branchId: string, productId: string): Promise<{ readonly onHand: bigint; readonly reserved: bigint; readonly damaged: bigint; readonly revision: number; readonly updatedAt: Date } | null> }
export interface BranchProductAuditRepository { append(input: { readonly workspaceId: string; readonly actorId: string; readonly eventType: string; readonly metadata: Readonly<Record<string, string | number | boolean | null>>; readonly occurredAt: Date }): Promise<void> }
export interface BranchProductTransactionContext { readonly scope: BranchProductScopeRepository; readonly listings: BranchProductListingRepository; readonly pricing: ProductPricingRepository; readonly inventory: BranchProductInventoryReadRepository; readonly audit: BranchProductAuditRepository }
export interface BranchProductUnitOfWork { execute<T>(work: (context: BranchProductTransactionContext) => Promise<T>): Promise<T> }
export interface BranchProductClock { now(): Date }
