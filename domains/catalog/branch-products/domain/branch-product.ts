export type BranchProductListingStatus = "Listed" | "Unlisted";
export type PriceType = "Retail" | "Wholesale" | "ReferenceCost";
export interface PriceValue { readonly amountMinor: bigint; readonly currency: string; readonly revision: number }
export interface BranchPriceOverride extends PriceValue { readonly workspaceId: string; readonly branchId: string; readonly productId: string; readonly priceType: PriceType; readonly createdAt: Date; readonly updatedAt: Date }
export const MAX_PRICE_MINOR = BigInt(Number.MAX_SAFE_INTEGER);
export const parsePriceAmount = (value: string): bigint => { if (!/^(0|[1-9][0-9]*)$/.test(value)) throw new Error("InvalidMoney"); const amount = BigInt(value); if (amount > MAX_PRICE_MINOR) throw new Error("InvalidMoney"); return amount; };
export const validatePriceType = (value: string): PriceType => { if (value !== "Retail" && value !== "Wholesale" && value !== "ReferenceCost") throw new Error("InvalidPriceType"); return value; };
