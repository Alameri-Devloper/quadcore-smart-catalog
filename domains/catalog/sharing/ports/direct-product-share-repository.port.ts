import type { DirectProductShareProjection, DirectShareMediaProjection, DirectSharePriceMode } from "../domain/direct-product-share";
import type { ProductMediaReaderPort, ProductMediaReadResult } from "../../media/ports/product-media-reader.port";

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

export type DirectShareMediaReadResult = ProductMediaReadResult;
export type DirectShareMediaReaderPort = ProductMediaReaderPort;
