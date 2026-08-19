"use client";

import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../../presentation/product-entry-i18n";
import type { ProductEntryCatalogReferenceData } from "../../ports/product-entry-catalog-reference-data.port";
import type { ProductCondition } from "../../../types/product.entity";

const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

interface CommercialDetailsStepProps {
  readonly conditions: ProductEntryCatalogReferenceData["conditions"];
  readonly currencies: ProductEntryCatalogReferenceData["currencies"];
  readonly locale: "en" | "ar";
  readonly supplyStatuses: ProductEntryCatalogReferenceData["supplyStatuses"];
}

export function CommercialDetailsStep({ conditions, currencies, locale, supplyStatuses }: CommercialDetailsStepProps) {
  const { setValue, validation, values } = useProductEntryWorkflow();
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const issuesByField = new Map(
    (validation?.issues ?? []).flatMap((issue) =>
      issue.field ? [[issue.field, issue.message] as const] : [],
    ),
  );
  const fieldDescription = (field: string, helpId?: string) =>
    [helpId, issuesByField.has(field) ? `${field}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const issueFor = (field: string) => locale === "ar" && issuesByField.has(field)
    ? text.reviewStepPrompt
    : issuesByField.get(field);
  const setNumber = (
    field: "retailPrice" | "wholesalePrice",
    rawValue: string,
    valueAsNumber: number,
  ) => void setValue(field, rawValue === "" ? null : valueAsNumber);
  const conditionText: Record<string, string> = { new: text.newCondition, used: text.usedCondition, refurbished: locale === "ar" ? "مجدّد" : "Refurbished" };
  const availabilityLabel = supplyStatuses.find(({ id }) => id === values.availabilityStatus)?.displayName;
  const conditionLabel = values.condition ? (conditionText[values.condition] ?? values.condition) : undefined;
  const validSummary = validation?.valid === true;

  return (
    <div>
      <h2 id="product-entry-step-heading" className="text-2xl font-semibold tracking-tight text-slate-950">
        {text.commercialHeading}
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        {text.commercialDescription}
      </p>

      <section className="mt-8" aria-labelledby="commercial-identity-heading">
        <h3 className="text-lg font-semibold text-slate-950" id="commercial-identity-heading">{text.identity}</h3>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-900" htmlFor="productName">{text.productName} <span className="font-normal text-slate-600">({text.required})</span></label>
            <input aria-describedby={fieldDescription("productName", "productName-help")} aria-invalid={issuesByField.has("productName")} className={inputClass} id="productName" onBlur={() => void setValue("productName", values.productName.trim())} onChange={(event) => void setValue("productName", event.target.value)} required type="text" value={values.productName} />
            <p className="mt-2 text-sm text-slate-600" id="productName-help">{text.productNameHelp}</p>
            {issuesByField.has("productName") ? <p className="mt-2 text-sm font-medium text-red-700" id="productName-error">{issueFor("productName")}</p> : null}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-900" htmlFor="productCode">{text.productCode} <span className="font-normal text-slate-600">({text.optional})</span></label>
            <input aria-describedby="productCode-help" className={inputClass} id="productCode" onBlur={() => void setValue("productCode", values.productCode.trim())} onChange={(event) => void setValue("productCode", event.target.value)} type="text" value={values.productCode} />
            <p className="mt-2 text-sm text-slate-600" id="productCode-help">{text.productCodeHelp}</p>
          </div>
        </div>
      </section>

      <section className="mt-9 border-t border-slate-200 pt-8" aria-labelledby="commercial-pricing-heading">
        <h3 className="text-lg font-semibold text-slate-950" id="commercial-pricing-heading">{text.pricing}</h3>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="retailPrice">{text.retailPrice} <span className="font-normal text-slate-600">({text.required})</span></label><input aria-describedby={fieldDescription("retailPrice")} aria-invalid={issuesByField.has("retailPrice")} className={inputClass} id="retailPrice" inputMode="decimal" min="0" onChange={(event) => setNumber("retailPrice", event.target.value, event.target.valueAsNumber)} required step="any" type="number" value={values.retailPrice !== null && Number.isFinite(values.retailPrice) ? values.retailPrice : ""} />{issuesByField.has("retailPrice") ? <p className="mt-2 text-sm font-medium text-red-700" id="retailPrice-error">{issueFor("retailPrice")}</p> : null}</div>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="wholesalePrice">{text.wholesalePrice} <span className="font-normal text-slate-600">({text.optional})</span></label><input aria-describedby={fieldDescription("wholesalePrice")} aria-invalid={issuesByField.has("wholesalePrice")} className={inputClass} id="wholesalePrice" inputMode="decimal" min="0" onChange={(event) => setNumber("wholesalePrice", event.target.value, event.target.valueAsNumber)} step="any" type="number" value={values.wholesalePrice !== null && Number.isFinite(values.wholesalePrice) ? values.wholesalePrice : ""} />{issuesByField.has("wholesalePrice") ? <p className="mt-2 text-sm font-medium text-red-700" id="wholesalePrice-error">{issueFor("wholesalePrice")}</p> : null}</div>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="currency">{text.currency} <span className="font-normal text-slate-600">({text.required})</span></label><select aria-describedby={fieldDescription("currency")} aria-invalid={issuesByField.has("currency")} className={inputClass} id="currency" onChange={(event) => void setValue("currency", event.target.value)} required value={values.currency}><option value="">{text.chooseCurrency}</option>{currencies.map((option) => <option key={option.code} value={option.code}>{option.code}</option>)}</select>{issuesByField.has("currency") ? <p className="mt-2 text-sm font-medium text-red-700" id="currency-error">{issueFor("currency")}</p> : null}</div>
        </div>
        {values.retailPrice !== null && values.wholesalePrice !== null && values.wholesalePrice > values.retailPrice ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{text.wholesaleWarning}</p> : null}
      </section>

      <section className="mt-9 border-t border-slate-200 pt-8" aria-labelledby="commercial-availability-heading">
        <h3 className="text-lg font-semibold text-slate-950" id="commercial-availability-heading">{text.availability}</h3>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <fieldset aria-describedby={fieldDescription("condition")}><legend className="text-sm font-semibold text-slate-900">{text.condition} <span className="font-normal text-slate-600">({text.required})</span></legend><div className="mt-2 grid grid-cols-2 gap-3">{conditions.map((option) => <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:ring-4 focus-within:ring-blue-200" key={option.code}><input checked={values.condition === option.code} name="condition" onChange={() => void setValue("condition", option.code as ProductCondition)} required type="radio" /><span>{conditionText[option.code] ?? option.code}</span></label>)}</div>{issuesByField.has("condition") ? <p className="mt-2 text-sm font-medium text-red-700" id="condition-error">{issueFor("condition")}</p> : null}</fieldset>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="availabilityStatus">{text.availabilityStatus} <span className="font-normal text-slate-600">({text.required})</span></label><select aria-describedby={fieldDescription("availabilityStatus")} aria-invalid={issuesByField.has("availabilityStatus")} className={inputClass} id="availabilityStatus" onChange={(event) => void setValue("availabilityStatus", event.target.value || null)} required value={values.availabilityStatus ?? ""}><option value="">{text.chooseAvailability}</option>{supplyStatuses.map((option) => <option key={option.id} value={option.id}>{option.displayName}</option>)}</select>{issuesByField.has("availabilityStatus") ? <p className="mt-2 text-sm font-medium text-red-700" id="availabilityStatus-error">{issueFor("availabilityStatus")}</p> : null}</div>
        </div>
      </section>

      <details className="mt-9 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <summary className="cursor-pointer text-base font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">{text.additionalSettings}</summary>
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <fieldset><legend className="text-sm font-semibold text-slate-900">{text.highlightProduct} <span className="font-normal text-slate-600">({text.optional})</span></legend><p className="mt-1 text-sm text-slate-600">{text.highlightHelp}</p><div className="mt-2 flex gap-3">{([true, false] as const).map((decision) => <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:ring-4 focus-within:ring-blue-200" key={String(decision)}><input checked={values.isFeatured === decision} name="isFeatured" onChange={() => void setValue("isFeatured", decision)} type="radio" /><span>{decision ? text.yes : text.no}</span></label>)}</div></fieldset>
          <fieldset><legend className="text-sm font-semibold text-slate-900">{text.publicationIntent}</legend><p className="mt-1 text-sm text-slate-600">{text.publicationAuthority}</p><div className="mt-2 grid gap-3">{(["SaveAsDraft", "PublishWhenReady"] as const).map((intent) => <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:ring-4 focus-within:ring-blue-200" key={intent}><input checked={values.publicationIntent === intent} name="publicationIntent" onChange={() => void setValue("publicationIntent", intent)} type="radio" /><span>{intent === "SaveAsDraft" ? text.saveAsDraft : text.publishWhenReady}</span></label>)}</div></fieldset>
        </div>
        <p className="mt-4 text-sm text-slate-600">{text.draftExplanation}</p>
      </details>

      <div aria-live="polite">
        {validSummary ? <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm sm:grid-cols-2 xl:grid-cols-4" aria-label={text.commercialSummary}><div><p className="font-semibold text-emerald-950">{text.retail}</p><p className="mt-1 text-emerald-900">{values.currency} {values.retailPrice}</p></div><div><p className="font-semibold text-emerald-950">{text.wholesale}</p><p className="mt-1 text-emerald-900">{values.wholesalePrice === null ? text.notEntered : `${values.currency} ${values.wholesalePrice}`}</p></div><div><p className="font-semibold text-emerald-950">{text.condition}</p><p className="mt-1 text-emerald-900">{conditionLabel}</p></div><div><p className="font-semibold text-emerald-950">{text.availability}</p><p className="mt-1 text-emerald-900">{availabilityLabel}</p></div></div> : null}
      </div>
    </div>
  );
}
