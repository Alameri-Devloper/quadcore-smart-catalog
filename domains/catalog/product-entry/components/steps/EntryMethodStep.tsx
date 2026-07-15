"use client";

import {
  PRODUCT_ENTRY_METHOD_OPTIONS,
  type ProductEntryMethod,
} from "../../product-entry.types";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";

export function EntryMethodStep() {
  const { setValue, validation, values } = useProductEntryWorkflow();

  const selectMethod = (method: ProductEntryMethod) => {
    void setValue("entryMethod", method);
  };

  return (
    <fieldset
      aria-describedby={
        validation && !validation.valid
          ? "entry-method-help entry-method-error"
          : "entry-method-help"
      }
    >
      <legend className="text-xl font-semibold text-slate-950">
        Choose an Entry Method
      </legend>
      <p className="mt-2 text-sm leading-6 text-slate-600" id="entry-method-help">
        Choose how you want to add this Product. You can return to this step
        without losing your selection.
      </p>

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        {PRODUCT_ENTRY_METHOD_OPTIONS.map((option) => {
          const isSelected = values.entryMethod === option.id;

          return (
            <label
              className={`relative flex min-h-32 cursor-pointer flex-col rounded-2xl border-2 p-4 transition focus-within:ring-4 focus-within:ring-blue-200 ${
                isSelected
                  ? "border-blue-600 bg-blue-50"
                  : "border-slate-200 bg-white"
              } ${option.disabled ? "cursor-not-allowed opacity-65" : "hover:border-blue-400"}`}
              key={option.id}
            >
              <input
                checked={isSelected}
                className="absolute right-4 top-4 size-5 accent-blue-600"
                disabled={option.disabled}
                name="product-entry-method"
                onChange={() => selectMethod(option.id)}
                type="radio"
                value={option.id}
              />
              <span className="flex flex-wrap items-center gap-2 pr-8">
                <span className="font-semibold text-slate-950">{option.label}</span>
                {option.recommended ? (
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                    Recommended
                  </span>
                ) : null}
                {option.disabled ? (
                  <span className="rounded-full bg-slate-200 px-2 py-1 text-xs font-semibold text-slate-700">
                    Coming Soon
                  </span>
                ) : null}
              </span>
              <span className="mt-3 text-sm leading-6 text-slate-600">
                {option.description}
              </span>
              <span className="mt-auto pt-3 text-xs font-semibold text-slate-700">
                {isSelected ? "Selected" : option.disabled ? "Unavailable" : "Available"}
              </span>
            </label>
          );
        })}
      </div>

      {validation && !validation.valid ? (
        <div
          aria-live="polite"
          className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
          id="entry-method-error"
          role="alert"
        >
          {validation.issues.map((issue) => (
            <p key={`${issue.code}-${issue.field ?? issue.message}`}>
              {issue.message}
            </p>
          ))}
        </div>
      ) : null}
    </fieldset>
  );
}
