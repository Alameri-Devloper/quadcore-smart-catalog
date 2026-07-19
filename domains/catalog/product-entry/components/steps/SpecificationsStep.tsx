"use client";

import type { SpecificationValue } from "@/domains/catalog/types/specification-value.entity";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";
import { ProductEntrySpecificationsService, type ProductEntrySpecificationsResolution } from "../../services/product-entry-specifications.service";
import { SpecificationFieldGuidance } from "../SpecificationFieldGuidance";

interface SpecificationsStepProps {
  loadError: string | null;
  loading: boolean;
  onRetry: () => void;
  resolution: ProductEntrySpecificationsResolution | null;
}

export function SpecificationsStep({ loadError, loading, onRetry, resolution }: SpecificationsStepProps) {
  const { setValue, validation, values } = useProductEntryWorkflow();
  const fields = resolution?.status === "resolved" ? resolution.fields : [];
  const issuesByField = new Map(
    (validation?.issues ?? []).flatMap((issue) => {
      const prefix = "specificationValues.";
      return issue.field?.startsWith(prefix)
        ? [[issue.field.slice(prefix.length), issue.message] as const]
        : [];
    }),
  );
  const requiredCompletion = ProductEntrySpecificationsService.getRequiredCompletion(
    resolution,
    values.specificationValues,
  );

  const updateValue = (fieldId: string, value: SpecificationValue | undefined) => {
    const specificationValues = { ...values.specificationValues };
    if (value === undefined || value === "") delete specificationValues[fieldId];
    else specificationValues[fieldId] = value;
    void setValue("specificationValues", specificationValues);
  };

  return (
    <div>
      <h2 id="product-entry-step-heading" className="text-2xl font-semibold tracking-tight text-slate-950">
        Enter the product specifications
      </h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">
        Add the confirmed technical details for this product. QSC will show only the fields required for the selected product type.
      </p>

      <div aria-live="polite">
        {loading ? <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Loading product specification fields...</p> : null}
        {loadError ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert"><p>Product specification fields could not be loaded. Try again.</p><button className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200" onClick={onRetry} type="button">Try again</button></div> : null}
        {!loading && !loadError && resolution?.status === "invalid-context" ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">Review the previous product decisions before entering specifications.</p> : null}
        {!loading && !loadError && resolution?.status === "missing-template" ? <p className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">No specification template is configured for this product type.</p> : null}
        {!loading && !loadError && resolution?.status === "resolved" && fields.length === 0 ? <p className="mt-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950">No additional specifications are required for this product type.</p> : null}
      </div>

      {!loading && !loadError && fields.length > 0 ? (
        <div className="mt-7 grid grid-cols-1 gap-x-6 gap-y-6 md:grid-cols-2 xl:grid-cols-3">
          {fields.map((field) => {
            const inputId = `specification-${field.specificationFieldId}`;
            const helpId = `${inputId}-help`;
            const errorId = `${inputId}-error`;
            const error = issuesByField.get(field.specificationFieldId) ?? field.configurationError;
            const describedBy = [field.guidance ? helpId : null, error ? errorId : null].filter(Boolean).join(" ") || undefined;
            const value = values.specificationValues[field.specificationFieldId];
            const shellClass = "rounded-2xl border border-slate-200 bg-slate-50 p-4 md:p-5";

            if (field.fieldType === "boolean") {
              return <fieldset aria-describedby={describedBy} className={shellClass} key={field.specificationFieldId}><legend className="text-sm font-semibold text-slate-900">{field.label} <span className="font-normal text-slate-600">({field.required ? "Required" : "Optional"})</span></legend><SpecificationFieldGuidance guidance={field.guidance} id={helpId} /><div className="mt-3 flex gap-3">{([true, false] as const).map((decision) => <label className="flex min-h-12 flex-1 cursor-pointer items-center gap-3 rounded-xl border border-slate-300 bg-white px-4 focus-within:ring-4 focus-within:ring-blue-200" key={String(decision)}><input checked={value === decision} name={inputId} onChange={() => updateValue(field.specificationFieldId, decision)} required={field.required} type="radio" /><span>{decision ? "Yes" : "No"}</span></label>)}</div>{error ? <p className="mt-2 text-sm font-medium text-red-700" id={errorId}>{error}</p> : null}</fieldset>;
            }

            const selectedOptionId = field.fieldType === "select"
              ? (field.options.find((option) => Object.is(option.value, value))?.optionId ?? "")
              : "";
            return <div className={shellClass} key={field.specificationFieldId}><label className="text-sm font-semibold text-slate-900" htmlFor={inputId}>{field.label} <span className="font-normal text-slate-600">({field.required ? "Required" : "Optional"})</span></label><SpecificationFieldGuidance guidance={field.guidance} id={helpId} />{field.fieldType === "select" ? <select aria-describedby={describedBy} aria-invalid={Boolean(error)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-3 text-base focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100 disabled:bg-slate-100" disabled={Boolean(field.configurationError)} id={inputId} onChange={(event) => updateValue(field.specificationFieldId, field.options.find((option) => option.optionId === event.target.value)?.value)} required={field.required} value={selectedOptionId}><option value="">Choose an option</option>{field.options.map((option) => <option key={option.optionId} value={option.optionId}>{option.label}</option>)}</select> : <div className="relative"><input aria-describedby={describedBy} aria-invalid={Boolean(error)} className={`${field.guidance?.unitLabel ? "pr-16" : ""} mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base focus:border-blue-600 focus:outline-none focus:ring-4 focus:ring-blue-100`} id={inputId} inputMode={field.fieldType === "number" ? "decimal" : undefined} onChange={(event) => updateValue(field.specificationFieldId, field.fieldType === "number" ? (event.target.value === "" ? undefined : event.target.valueAsNumber) : event.target.value)} placeholder={field.guidance?.placeholder} required={field.required} type={field.fieldType === "number" ? "number" : "text"} value={typeof value === (field.fieldType === "number" ? "number" : "string") ? String(value) : ""} />{field.guidance?.unitLabel ? <span aria-hidden="true" className="pointer-events-none absolute right-4 top-6 text-sm font-semibold text-slate-600">{field.guidance.unitLabel}</span> : null}</div>}{error ? <p className="mt-2 text-sm font-medium text-red-700" id={errorId}>{error}</p> : null}</div>;
          })}
        </div>
      ) : null}

      {requiredCompletion ? <p className="mt-7 rounded-xl border border-blue-200 bg-blue-50 p-4 text-sm font-semibold text-blue-950" aria-live="polite">{requiredCompletion.completed} of {requiredCompletion.required} required specifications completed</p> : null}
    </div>
  );
}
