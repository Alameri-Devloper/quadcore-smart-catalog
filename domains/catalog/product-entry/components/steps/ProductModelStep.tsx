"use client";

import { useMemo, useState } from "react";
import type { ProductEntryProductModelOption } from "../../services/product-entry-product-model.service";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../../presentation/product-entry-i18n";
import type { ProductEntryReferenceOption } from "../../ports/product-entry-catalog-reference-data.port";

interface ProductModelStepProps {
  brands: readonly ProductEntryReferenceOption[];
  contextLabel: string;
  contextValid: boolean;
  loadError: string | null;
  loading: boolean;
  locale: "en" | "ar";
  onRetry: () => void;
  productModels: ProductEntryProductModelOption[];
}

export function ProductModelStep({ brands, contextLabel, contextValid, loadError, loading, locale, onRetry, productModels }: ProductModelStepProps) {
  const { setValues, validation, values } = useProductEntryWorkflow();
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredModels = useMemo(
    () => productModels.filter((model) =>
      (!values.brandId || model.brandId === values.brandId) &&
      [model.name, model.code, model.brandName]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))),
    [normalizedQuery, productModels, values.brandId],
  );
  const selectedModel = productModels.find(
    (model) => model.productModelId === values.productModelId && model.brandId === values.brandId,
  );
  const validationMessage = validation && !validation.valid
    ? validation.issues[0]?.message
    : null;

  const selectModel = (model: ProductEntryProductModelOption) => {
    if (values.productModelId === model.productModelId && values.brandId === model.brandId) return;
    void setValues({ ...values, productModelId: model.productModelId, brandId: model.brandId });
  };

  return (
    <fieldset aria-describedby="product-model-help product-model-status">
      <legend className="text-2xl font-semibold tracking-tight text-slate-950">
        {text.chooseProductModel}
      </legend>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600" id="product-model-help">
        {text.chooseProductModelHelp}
      </p>
      {contextLabel ? <p className="mt-3 text-sm font-semibold text-blue-800">{text.currentProductType}: {contextLabel}</p> : null}

      <div className="mt-6 max-w-xl">
        <label className="text-sm font-semibold text-slate-800" htmlFor="brandId">{text.brand}</label>
        <select className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100" id="brandId" onChange={(event) => void setValues({ ...values, brandId: event.target.value || null, productModelId: null })} value={values.brandId ?? ""}>
          <option value="">{locale === "ar" ? "اختر العلامة التجارية" : "Choose Brand"}</option>
          {brands.map((brand) => <option key={brand.id} value={brand.id}>{brand.displayName}</option>)}
        </select>
      </div>

      <div className="mt-6 max-w-xl">
        <label className="text-sm font-semibold text-slate-800" htmlFor="product-model-search">{text.searchModels}</label>
        <div className="mt-2 flex gap-2">
          <input className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100" id="product-model-search" onChange={(event) => setQuery(event.target.value)} placeholder={text.searchModelsPlaceholder} type="search" value={query} />
          {query ? <button className="min-h-12 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={() => setQuery("")} type="button">{text.reset}</button> : null}
        </div>
      </div>

      <div aria-live="polite" id="product-model-status">
        {!contextValid ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{text.reviewPreviousDecisions}</p> : null}
        {loading ? <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">{text.loadingModels}</p> : null}
        {loadError ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert"><p>{text.modelsLoadFailed}</p><button className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200" onClick={onRetry} type="button">{text.tryAgain}</button></div> : null}
        {contextValid && !loading && !loadError && productModels.length === 0 ? (
          <div className="mt-6 rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-700">
            <p className="font-semibold text-slate-950">{text.cannotFindModel}</p>
            <p className="mt-1">{text.createModelLater}</p>
            <button className="mt-4 min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-500" disabled type="button">{text.createProductModel}</button>
          </div>
        ) : null}
        {!loading && !loadError && productModels.length > 0 && filteredModels.length === 0 ? <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700"><p className="font-semibold text-slate-950">{text.cannotFindModel}</p><p className="mt-1">{text.checkModelSearch} {text.createModelLater}</p><div className="mt-3 flex flex-wrap gap-2"><button className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={() => setQuery("")} type="button">{text.resetSearch}</button><button className="min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold text-slate-500" disabled type="button">{text.createProductModel}</button></div></div> : null}
      </div>

      {!loading && !loadError && filteredModels.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredModels.map((model) => {
            const selected = values.productModelId === model.productModelId && values.brandId === model.brandId;
            return <label className={`relative flex min-h-40 cursor-pointer flex-col rounded-2xl border-2 p-5 transition focus-within:ring-4 focus-within:ring-blue-200 ${selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-400"}`} key={model.productModelId}>
              <input checked={selected} className="absolute right-4 top-4 size-5 accent-blue-600" name="product-model" onChange={() => selectModel(model)} type="radio" value={model.productModelId} />
              <span className="pr-8 text-base font-semibold text-slate-950">{model.name}</span>
              <span className="mt-2 text-sm font-medium text-slate-700">{text.brand}: {model.brandName}</span>
              <span className="mt-1 text-xs text-slate-500">{text.modelCode}: {model.code}</span>
              {model.deviceClassName ? <span className="mt-1 text-xs text-slate-500">{text.deviceType}: {model.deviceClassName}</span> : null}
              <span className="mt-auto pt-4 text-xs font-semibold text-slate-700">{selected ? text.selected : text.chooseThisModel}</span>
            </label>;
          })}
        </div>
      ) : null}

      {selectedModel ? <div className="mt-6 grid gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm sm:grid-cols-3" aria-label={text.selectedModel}><div><p className="font-semibold text-emerald-950">{text.selectedModel}</p><p className="mt-1 text-emerald-900">{selectedModel.name}</p></div><div><p className="font-semibold text-emerald-950">{text.brand}</p><p className="mt-1 text-emerald-900">{selectedModel.brandName}</p></div><div><p className="font-semibold text-emerald-950">{text.next}</p><p className="mt-1 text-emerald-900">{text.enterSpecificationsNext}</p></div></div> : null}
      {validationMessage ? <p aria-live="polite" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900" role="alert">{locale === "ar" ? text.reviewStepPrompt : validationMessage}</p> : null}
    </fieldset>
  );
}
