import type { DirectProductShareProjection, DirectShareMediaProjection, DirectSharePriceMode } from "../domain/direct-product-share";

export interface DirectProductShareRepository {
  branchExists(workspaceId: string, branchId: string): Promise<boolean>;
  getShareProduct(query: {
    readonly workspaceId: string;
    readonly productId: string;
    readonly branchId: string | null;
    readonly priceMode: DirectSharePriceMode;
  }): Promise<DirectProductShareProjection | null>;
  getShareMedia(workspaceId: string, productId: string): Promise<null | {
    readonly productId: string;
    readonly productCode: string | null;
    readonly lifecycle: "Draft" | "Published" | "Archived";
    readonly media: DirectShareMediaProjection | null;
  }>;
}

export type DirectShareMediaReadResult =
  | { readonly type: "Found"; readonly bytes: Uint8Array }
  | { readonly type: "Unavailable" };

export interface DirectShareMediaReaderPort {
  read(input: {
    readonly workspaceId: string;
    readonly productId: string;
    readonly storageRootKey: string;
    readonly storageKey: string;
    readonly expectedSha256: string;
    readonly maximumBytes: number;
  }): Promise<DirectShareMediaReadResult>;
}
