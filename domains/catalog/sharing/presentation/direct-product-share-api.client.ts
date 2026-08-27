import type { DirectProductSharePayload, DirectShareLocale, DirectSharePriceMode } from "../domain/direct-product-share";

export type DirectProductShareClientResult =
  | { readonly ok: true; readonly payload: DirectProductSharePayload; readonly file?: File }
  | { readonly ok: false; readonly error: string };

export interface DirectProductShareApiClientPort {
  prepare(input: {
    readonly productId: string;
    readonly branchId?: string;
    readonly priceMode: DirectSharePriceMode;
    readonly locale: DirectShareLocale;
  }): Promise<DirectProductShareClientResult>;
}

export class DirectProductShareApiClient implements DirectProductShareApiClientPort {
  constructor(private readonly fetcher: typeof fetch = fetch) {}

  async prepare(input: Parameters<DirectProductShareApiClientPort["prepare"]>[0]): Promise<DirectProductShareClientResult> {
    try {
      const response = await this.fetcher(`/api/catalog/products/${encodeURIComponent(input.productId)}/direct-share`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...(input.branchId ? { branchId: input.branchId } : {}), priceMode: input.priceMode, locale: input.locale }),
      });
      const body = await response.json() as { readonly type?: string; readonly value?: DirectProductSharePayload };
      if (!response.ok || body.type !== "Success" || !body.value) return { ok: false, error: body.type ?? "Failed" };
      const payload = body.value;
      if (!payload.mainMedia) return { ok: true, payload };
      try {
        const media = await this.fetcher(payload.mainMedia.downloadUrl, { credentials: "same-origin" });
        if (!media.ok || media.headers.get("content-type") !== payload.mainMedia.contentType) return { ok: true, payload };
        const blob = await media.blob();
        return blob.size > 0 ? { ok: true, payload, file: new File([blob], payload.mainMedia.fileName, { type: payload.mainMedia.contentType }) } : { ok: true, payload };
      } catch { return { ok: true, payload }; }
    } catch { return { ok: false, error: "ServiceUnavailable" }; }
  }
}
