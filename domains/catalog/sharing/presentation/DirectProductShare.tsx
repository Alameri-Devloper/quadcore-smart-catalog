"use client";

import { useMemo, useState } from "react";
import type { DirectShareLocale, DirectSharePriceMode } from "../domain/direct-product-share";
import { DirectProductShareApiClient, type DirectProductShareApiClientPort } from "./direct-product-share-api.client";
import { BrowserDeviceShareAdapter } from "./browser-device-share.adapter";
import type { DeviceShareOutcome, DeviceSharePort } from "./device-share.port";

const copy = {
  en: { share: "Share", retail: "Retail", wholesale: "Wholesale", prepare: "Prepare share", preparing: "Preparing…", shareNow: "Open device share", copied: "Sales text copied.", shared: "Device share completed.", cancelled: "Sharing cancelled.", failed: "Sharing was not available. Copy or select the prepared text below.", prepareFailed: "The share payload could not be prepared.", priceUnavailable: "The selected customer price is unavailable.", unsupportedCurrency: "This currency cannot be formatted safely for sharing.", prepared: "Sales text is ready.", manual: "Prepared sales text" },
  ar: { share: "مشاركة", retail: "تجزئة", wholesale: "جملة", prepare: "تجهيز المشاركة", preparing: "جارٍ التجهيز…", shareNow: "فتح مشاركة الجهاز", copied: "تم نسخ نص البيع.", shared: "اكتملت مشاركة الجهاز.", cancelled: "أُلغيت المشاركة.", failed: "تعذرت المشاركة. انسخ النص المجهز أو حدده أدناه.", prepareFailed: "تعذر تجهيز محتوى المشاركة.", priceUnavailable: "السعر المحدد للعميل غير متاح.", unsupportedCurrency: "لا يمكن تنسيق هذه العملة للمشاركة بأمان.", prepared: "نص البيع جاهز.", manual: "نص البيع المجهز" },
} as const;

export interface DirectProductShareProps {
  readonly productId: string;
  readonly branchId?: string;
  readonly locale: DirectShareLocale;
  readonly availablePriceModes: readonly DirectSharePriceMode[];
  readonly apiClient?: DirectProductShareApiClientPort;
  readonly deviceShare?: DeviceSharePort;
}

export function DirectProductShare({ productId, branchId, locale, availablePriceModes, apiClient, deviceShare }: DirectProductShareProps) {
  const language = copy[locale];
  const client = useMemo(() => apiClient ?? new DirectProductShareApiClient(), [apiClient]);
  const platform = useMemo(() => deviceShare ?? new BrowserDeviceShareAdapter(), [deviceShare]);
  const modes = useMemo(() => (["Retail", "Wholesale"] as const).filter((mode) => availablePriceModes.includes(mode)), [availablePriceModes]);
  const [priceMode, setPriceMode] = useState<DirectSharePriceMode>(modes[0] ?? "Retail");
  const effectivePriceMode: DirectSharePriceMode = modes.includes(priceMode) ? priceMode : modes[0] ?? "Retail";
  const requestKey = `${productId}\u0000${branchId ?? ""}\u0000${locale}\u0000${effectivePriceMode}`;
  const [preparing, setPreparing] = useState(false);
  type Prepared = Extract<Awaited<ReturnType<DirectProductShareApiClientPort["prepare"]>>, { ok: true }>;
  const [preparedState, setPrepared] = useState<{ readonly requestKey: string; readonly value: Prepared } | null>(null);
  const [outcomeState, setOutcome] = useState<{ readonly requestKey: string; readonly value: DeviceShareOutcome | "PrepareFailed" | "PriceUnavailable" | "UnsupportedCurrencyForDirectShare" } | null>(null);
  const prepared = preparedState?.requestKey === requestKey ? preparedState.value : null;
  const outcome = outcomeState?.requestKey === requestKey ? outcomeState.value : null;

  const prepare = async () => {
    const preparingKey = requestKey;
    setPreparing(true); setOutcome(null); setPrepared(null);
    const result = await client.prepare({ productId, branchId, priceMode: effectivePriceMode, locale });
    setPreparing(false);
    if (!result.ok) { setOutcome({ requestKey: preparingKey, value: result.error === "PriceUnavailable" || result.error === "UnsupportedCurrencyForDirectShare" ? result.error : "PrepareFailed" }); return; }
    setPrepared({ requestKey: preparingKey, value: result });
  };
  const share = async () => {
    if (!prepared) return;
    setOutcome({ requestKey, value: await platform.share({ title: prepared.payload.title, text: prepared.payload.text, file: prepared.file }) });
  };
  const message = preparing ? language.preparing : outcome === "Shared" ? language.shared : outcome === "Copied" ? language.copied : outcome === "Cancelled" ? language.cancelled : outcome === "PriceUnavailable" ? language.priceUnavailable : outcome === "UnsupportedCurrencyForDirectShare" ? language.unsupportedCurrency : outcome === "PrepareFailed" ? language.prepareFailed : outcome === "Failed" || outcome === "Unsupported" ? language.failed : prepared ? language.prepared : "";
  const manual = prepared && (outcome === "Failed" || outcome === "Unsupported");

  return <section className="direct-share" dir={locale === "ar" ? "rtl" : "ltr"} aria-labelledby={`direct-share-${productId}`} aria-busy={preparing}>
    <h2 id={`direct-share-${productId}`}>{language.share}</h2>
    {modes.length > 1 ? <fieldset className="direct-share__modes" disabled={preparing}>
      <legend className="sr-only">{language.share}</legend>
      {modes.map((mode) => <label key={mode}>
        <input type="radio" name={`share-price-${productId}`} value={mode} checked={effectivePriceMode === mode} onChange={() => { setPriceMode(mode); setPrepared(null); setOutcome(null); }} />
        <span>{mode === "Retail" ? language.retail : language.wholesale}</span>
      </label>)}
    </fieldset> : <p className="direct-share__selected-mode">{effectivePriceMode === "Wholesale" ? language.wholesale : language.retail}</p>}
    <div className="direct-share__actions">
      <button type="button" className="button button--secondary" onClick={prepare} disabled={preparing}>{preparing ? language.preparing : language.prepare}</button>
      {prepared ? <button type="button" className="button button--primary" onClick={share}>{language.shareNow}</button> : null}
    </div>
    <p className="direct-share__status" role="status" aria-live="polite">{message}</p>
    {manual ? <div className="direct-share__manual">
      <label htmlFor={`direct-share-text-${productId}`}>{language.manual}</label>
      <textarea id={`direct-share-text-${productId}`} readOnly value={prepared.payload.text} rows={10} onFocus={(event) => event.currentTarget.select()} />
    </div> : null}
  </section>;
}
