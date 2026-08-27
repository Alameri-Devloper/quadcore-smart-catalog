import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import { formatIsoCurrencyAmountMinor } from "../../reference-data/domain/catalog-reference-data";
import { validateCatalogId } from "../../query/domain/catalog-query";
import {
  DIRECT_SHARE_MEDIA_MAX_BYTES,
  createDirectProductSharePayload,
  isDirectShareLocale,
  isDirectSharePriceMode,
  type DirectProductSharePayload,
} from "../domain/direct-product-share";
import type { DirectProductShareRepository, DirectShareMediaReaderPort } from "../ports/direct-product-share-repository.port";
import { directShareFailure, directShareSuccess, type DirectProductShareResult } from "./direct-product-share-results";

const can = (context: TrustedActorContext, permission: string): boolean => context.role === "Owner" || context.permissions.includes(permission);
const inBranchScope = (context: TrustedActorContext, branchId: string): boolean => context.branchScope.type === "AllBranches" || context.branchScope.branchIds.includes(branchId);
const canPrepare = (context: TrustedActorContext): boolean => can(context, "catalog.sharing.create") && can(context, "catalog.products.view");

export class CreateDirectProductShareUseCase {
  constructor(private readonly repository: DirectProductShareRepository) {}

  async execute(command: {
    readonly context: TrustedActorContext;
    readonly productId: string;
    readonly input: { readonly branchId?: string; readonly priceMode: string; readonly locale: string };
  }): Promise<DirectProductShareResult<DirectProductSharePayload>> {
    if (!canPrepare(command.context)) return directShareFailure("Forbidden");
    let productId: string | undefined;
    let branchId: string | null;
    try {
      productId = validateCatalogId(command.productId);
      branchId = validateCatalogId(command.input.branchId) ?? null;
    } catch { return directShareFailure("InvalidInput"); }
    if (!productId || !isDirectSharePriceMode(command.input.priceMode) || !isDirectShareLocale(command.input.locale)) return directShareFailure("InvalidInput");
    if (command.input.priceMode === "Retail" && !can(command.context, "pricing.view")) return directShareFailure("Forbidden");
    if (command.input.priceMode === "Wholesale" && !can(command.context, "pricing.wholesale.view")) return directShareFailure("Forbidden");
    if (branchId && (!inBranchScope(command.context, branchId) || !await this.repository.branchExists(command.context.workspaceId, branchId))) return directShareFailure("BranchNotFound");

    const projection = await this.repository.getShareProduct({
      workspaceId: command.context.workspaceId,
      productId,
      branchId,
      priceMode: command.input.priceMode,
    });
    if (!projection) return directShareFailure("ProductNotFound");
    if (projection.lifecycle !== "Published") return directShareFailure("ProductIneligible");
    if (branchId) {
      if (!projection.branch) return directShareFailure("BranchNotFound");
      if (projection.branch.listingStatus !== "Listed") return directShareFailure("BranchProductIneligible");
    }
    if (!projection.price) return directShareFailure("PriceUnavailable");
    const formattedPriceAmount = formatIsoCurrencyAmountMinor(projection.price.amountMinor, projection.price.currency);
    if (formattedPriceAmount === null) return directShareFailure("UnsupportedCurrencyForDirectShare");
    const payload = createDirectProductSharePayload(projection, command.input.priceMode, command.input.locale, formattedPriceAmount);
    return payload ? directShareSuccess(payload) : directShareFailure("PayloadTooLarge");
  }
}

export interface DirectShareMediaFile {
  readonly bytes: Uint8Array;
  readonly contentType: "image/webp";
  readonly fileName: string;
}

export class DownloadDirectProductShareMediaUseCase {
  constructor(
    private readonly repository: DirectProductShareRepository,
    private readonly reader: DirectShareMediaReaderPort,
  ) {}

  async execute(command: { readonly context: TrustedActorContext; readonly productId: string }): Promise<DirectProductShareResult<DirectShareMediaFile>> {
    if (!canPrepare(command.context)) return directShareFailure("Forbidden");
    let productId: string | undefined;
    try { productId = validateCatalogId(command.productId); } catch { return directShareFailure("InvalidInput"); }
    if (!productId) return directShareFailure("InvalidInput");
    const projection = await this.repository.getShareMedia(command.context.workspaceId, productId);
    if (!projection) return directShareFailure("ProductNotFound");
    if (projection.lifecycle !== "Published") return directShareFailure("ProductIneligible");
    if (!projection.media) return directShareFailure("MediaUnavailable");
    const file = await this.reader.read({
      workspaceId: command.context.workspaceId,
      productId,
      storageRootKey: projection.media.storageRootKey,
      storageKey: projection.media.storageKey,
      expectedSha256: projection.media.checksumSha256,
      maximumBytes: DIRECT_SHARE_MEDIA_MAX_BYTES,
    });
    if (file.type !== "Found") return directShareFailure("MediaUnavailable");
    const stem = (projection.productCode ?? productId).toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 60) || "product";
    return directShareSuccess(Object.freeze({ bytes: file.bytes, contentType: "image/webp", fileName: `${stem}.webp` }));
  }
}
