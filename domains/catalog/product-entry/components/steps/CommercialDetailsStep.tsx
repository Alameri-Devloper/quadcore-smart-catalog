"use client";

import {
  PRODUCT_ENTRY_AVAILABILITY_OPTIONS,
  PRODUCT_ENTRY_CONDITION_OPTIONS,
  PRODUCT_ENTRY_CURRENCY_OPTIONS,
} from "../../product-entry-commercial-options";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";

const inputClass = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

export function CommercialDetailsStep() {
  const { setValue, validation, values } = useProductEntryWorkflow();
  const issuesByField = new Map(
    (validation?.issues ?? []).flatMap((issue) =>
      issue.field ? [[issue.field, issue.message] as const] : [],
    ),
  );
  const fieldDescription = (field: string, helpId?: string) =>
    [helpId, issuesByField.has(field) ? `${field}-error` : null]
      .filter(Boolean)
      .join(" ") || undefined;
  const setNumber = (
    field: "retailPrice" | "wholesalePrice" | "quantity",
    rawValue: string,
    valueAsNumber: number,
  ) => void setValue(field, rawValue === "" ? null : valueAsNumber);
  const availabilityLabel = PRODUCT_ENTRY_AVAILABILITY_OPTIONS.find(
    (option) => option.value === values.availabilityStatus,
  )?.label;
  const conditionLabel = PRODUCT_ENTRY_CONDITION_OPTIONS.find(
    (option) => option.value === values.condition,
  )?.label;
  const validSummary = validation?.valid === true;

  return (
    <div>
      <h2 id="product-entry-step-heading" className="text-2xl font-semibold tracking-tight text-slate-950">
        Add the commercial details
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Enter the product name, prices, quantity, condition, and availability.
      </p>

      <section className="mt-8" aria-labelledby="commercial-identity-heading">
        <h3 className="text-lg font-semibold text-slate-950" id="commercial-identity-heading">Identity</h3>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2">
          <div className="md:col-span-2">
            <label className="text-sm font-semibold text-slate-900" htmlFor="productName">Product Name <span className="font-normal text-slate-600">(Required)</span></label>
            <input aria-describedby={fieldDescription("productName", "productName-help")} aria-invalid={issuesByField.has("productName")} className={inputClass} id="productName" onBlur={() => void setValue("productName", values.productName.trim())} onChange={(event) => void setValue("productName", event.target.value)} required type="text" value={values.productName} />
            <p className="mt-2 text-sm text-slate-600" id="productName-help">Product Name is the customer-facing name shown in the Catalog. Example: Dahua 4 MP Outdoor IP Camera.</p>
            {issuesByField.has("productName") ? <p className="mt-2 text-sm font-medium text-red-700" id="productName-error">{issuesByField.get("productName")}</p> : null}
          </div>
          <div>
            <label className="text-sm font-semibold text-slate-900" htmlFor="productCode">Product Code <span className="font-normal text-slate-600">(Optional)</span></label>
            <input aria-describedby="productCode-help" className={inputClass} id="productCode" onBlur={() => void setValue("productCode", values.productCode.trim())} onChange={(event) => void setValue("productCode", event.target.value)} type="text" value={values.productCode} />
            <p className="mt-2 text-sm text-slate-600" id="productCode-help">Optional internal code for quick search.</p>
          </div>
        </div>
      </section>

      <section className="mt-9 border-t border-slate-200 pt-8" aria-labelledby="commercial-pricing-heading">
        <h3 className="text-lg font-semibold text-slate-950" id="commercial-pricing-heading">Pricing</h3>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="retailPrice">Retail Price <span className="font-normal text-slate-600">(Required)</span></label><input aria-describedby={fieldDescription("retailPrice")} aria-invalid={issuesByField.has("retailPrice")} className={inputClass} id="retailPrice" inputMode="decimal" min="0" onChange={(event) => setNumber("retailPrice", event.target.value, event.target.valueAsNumber)} required step="any" type="number" value={values.retailPrice !== null && Number.isFinite(values.retailPrice) ? values.retailPrice : ""} />{issuesByField.has("retailPrice") ? <p className="mt-2 text-sm font-medium text-red-700" id="retailPrice-error">{issuesByField.get("retailPrice")}</p> : null}</div>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="wholesalePrice">Wholesale Price <span className="font-normal text-slate-600">(Optional)</span></label><input aria-describedby={fieldDescription("wholesalePrice")} aria-invalid={issuesByField.has("wholesalePrice")} className={inputClass} id="wholesalePrice" inputMode="decimal" min="0" onChange={(event) => setNumber("wholesalePrice", event.target.value, event.target.valueAsNumber)} step="any" type="number" value={values.wholesalePrice !== null && Number.isFinite(values.wholesalePrice) ? values.wholesalePrice : ""} />{issuesByField.has("wholesalePrice") ? <p className="mt-2 text-sm font-medium text-red-700" id="wholesalePrice-error">{issuesByField.get("wholesalePrice")}</p> : null}</div>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="currency">Currency <span className="font-normal text-slate-600">(Required)</span></label><select aria-describedby={fieldDescription("currency")} aria-invalid={issuesByField.has("currency")} className={inputClass} id="currency" onChange={(event) => void setValue("currency", event.target.value)} required value={values.currency}><option value="">Choose a currency</option>{PRODUCT_ENTRY_CURRENCY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{issuesByField.has("currency") ? <p className="mt-2 text-sm font-medium text-red-700" id="currency-error">{issuesByField.get("currency")}</p> : null}</div>
        </div>
        {values.retailPrice !== null && values.wholesalePrice !== null && values.wholesalePrice > values.retailPrice ? <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Wholesale price is greater than retail price. Review the prices if this was not intended.</p> : null}
      </section>

      <section className="mt-9 border-t border-slate-200 pt-8" aria-labelledby="commercial-availability-heading">
        <h3 className="text-lg font-semibold text-slate-950" id="commercial-availability-heading">Availability</h3>
        <div className="mt-4 grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="quantity">Quantity <span className="font-normal text-slate-600">(Required)</span></label><input aria-describedby={fieldDescription("quantity", "quantity-help")} aria-invalid={issuesByField.has("quantity")} className={inputClass} id="quantity" inputMode="numeric" min="0" onChange={(event) => setNumber("quantity", event.target.value, event.target.valueAsNumber)} required step="1" type="number" value={values.quantity !== null && Number.isFinite(values.quantity) ? values.quantity : ""} /><p className="mt-2 text-sm text-slate-600" id="quantity-help">Current available Catalog quantity for employee awareness.</p>{issuesByField.has("quantity") ? <p className="mt-2 text-sm font-medium text-red-700" id="quantity-error">{issuesByField.get("quantity")}</p> : null}</div>
          <fieldset aria-describedby={fieldDescription("condition")}><legend className="text-sm font-semibold text-slate-900">Condition <span className="font-normal text-slate-600">(Required)</span></legend><div className="mt-2 grid grid-cols-2 gap-3">{PRODUCT_ENTRY_CONDITION_OPTIONS.map((option) => <label className="flex min-h-12 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:ring-4 focus-within:ring-blue-200" key={option.value}><input checked={values.condition === option.value} name="condition" onChange={() => void setValue("condition", option.value)} required type="radio" /><span>{option.label}</span></label>)}</div>{issuesByField.has("condition") ? <p className="mt-2 text-sm font-medium text-red-700" id="condition-error">{issuesByField.get("condition")}</p> : null}</fieldset>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="availabilityStatus">Availability Status <span className="font-normal text-slate-600">(Required)</span></label><select aria-describedby={fieldDescription("availabilityStatus")} aria-invalid={issuesByField.has("availabilityStatus")} className={inputClass} id="availabilityStatus" onChange={(event) => void setValue("availabilityStatus", event.target.value as typeof values.availabilityStatus)} required value={values.availabilityStatus ?? ""}><option value="">Choose availability</option>{PRODUCT_ENTRY_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select>{issuesByField.has("availabilityStatus") ? <p className="mt-2 text-sm font-medium text-red-700" id="availabilityStatus-error">{issuesByField.get("availabilityStatus")}</p> : null}</div>
        </div>
      </section>

      <details className="mt-9 rounded-2xl border border-slate-200 bg-slate-50 p-5">
        <summary className="cursor-pointer text-base font-semibold text-slate-950 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200">Additional settings</summary>
        <div className="mt-5 grid grid-cols-1 gap-6 md:grid-cols-2">
          <fieldset><legend className="text-sm font-semibold text-slate-900">Highlight this product <span className="font-normal text-slate-600">(Optional)</span></legend><p className="mt-1 text-sm text-slate-600">Show this product in featured or priority Catalog sections.</p><div className="mt-2 flex gap-3">{([true, false] as const).map((decision) => <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:ring-4 focus-within:ring-blue-200" key={String(decision)}><input checked={values.isFeatured === decision} name="isFeatured" onChange={() => void setValue("isFeatured", decision)} type="radio" /><span>{decision ? "Yes" : "No"}</span></label>)}</div></fieldset>
          <fieldset><legend className="text-sm font-semibold text-slate-900">Show this product in the Catalog <span className="font-normal text-slate-600">(Optional)</span></legend><div className="mt-2 flex gap-3">{([true, false] as const).map((decision) => <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:ring-4 focus-within:ring-blue-200" key={String(decision)}><input checked={values.isActive === decision} name="isActive" onChange={() => void setValue("isActive", decision)} type="radio" /><span>{decision ? "Yes" : "No"}</span></label>)}</div></fieldset>
        </div>
        <p className="mt-4 text-sm text-slate-600">A saved Draft remains incomplete work and does not appear in the Catalog.</p>
      </details>

      <div aria-live="polite">
        {validSummary ? <div className="mt-8 grid grid-cols-1 gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-sm sm:grid-cols-2 xl:grid-cols-4" aria-label="Commercial details summary"><div><p className="font-semibold text-emerald-950">Retail</p><p className="mt-1 text-emerald-900">{values.currency} {values.retailPrice}</p></div><div><p className="font-semibold text-emerald-950">Wholesale</p><p className="mt-1 text-emerald-900">{values.wholesalePrice === null ? "Not entered" : `${values.currency} ${values.wholesalePrice}`}</p></div><div><p className="font-semibold text-emerald-950">Condition</p><p className="mt-1 text-emerald-900">{conditionLabel}</p></div><div><p className="font-semibold text-emerald-950">Availability</p><p className="mt-1 text-emerald-900">{availabilityLabel} — {values.quantity} units</p></div></div> : null}
      </div>
    </div>
  );
}
