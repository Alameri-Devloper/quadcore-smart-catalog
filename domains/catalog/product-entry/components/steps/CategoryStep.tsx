"use client";

import { useMemo, useState } from "react";
import type { ProductEntryCategoryOption } from "../../services/product-entry-category.service";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";

interface CategoryStepProps {
  categories: ProductEntryCategoryOption[];
  loadError: string | null;
  loading: boolean;
  onRetry: () => void;
}

export function CategoryStep({ categories, loadError, loading, onRetry }: CategoryStepProps) {
  const { setValues, validation, values } = useProductEntryWorkflow();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLocaleLowerCase();
  const filteredCategories = useMemo(
    () => categories.filter((category) =>
      [category.name, category.code, category.departmentName]
        .some((value) => value.toLocaleLowerCase().includes(normalizedQuery))),
    [categories, normalizedQuery],
  );
  const validationMessage = validation && !validation.valid
    ? validation.issues[0]?.message
    : null;

  const selectCategory = (category: ProductEntryCategoryOption) => {
    if (values.categoryId === category.id && values.departmentId === category.departmentId) return;
    void setValues({ ...values, categoryId: category.id, departmentId: category.departmentId });
  };

  return (
    <fieldset aria-describedby="category-help category-status">
      <legend className="text-2xl font-semibold tracking-tight text-slate-950">
        What would you like to add?
      </legend>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600" id="category-help">
        Choose the product type. QSC will prepare the appropriate next steps and product information.
      </p>

      <div className="mt-6 max-w-xl">
        <label className="text-sm font-semibold text-slate-800" htmlFor="category-search">
          Search product types
        </label>
        <div className="mt-2 flex gap-2">
          <input
            className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-100"
            id="category-search"
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by product type, code, or department"
            type="search"
            value={query}
          />
          {query ? (
            <button className="min-h-12 rounded-xl border border-slate-300 px-4 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={() => setQuery("")} type="button">
              Reset
            </button>
          ) : null}
        </div>
      </div>

      <div aria-live="polite" id="category-status">
        {loading ? <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">Loading product types...</p> : null}
        {loadError ? (
          <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert">
            <p>{loadError}</p>
            <button className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200" onClick={onRetry} type="button">Try again</button>
          </div>
        ) : null}
        {!loading && !loadError && categories.length === 0 ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">No active product types are available.</p> : null}
        {!loading && !loadError && categories.length > 0 && filteredCategories.length === 0 ? (
          <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
            <p>No matching product type was found.</p>
            <button className="mt-3 min-h-11 rounded-lg border border-slate-300 bg-white px-4 font-semibold focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={() => setQuery("")} type="button">Reset search</button>
          </div>
        ) : null}
      </div>

      {!loading && !loadError && filteredCategories.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredCategories.map((category) => {
            const selected = values.categoryId === category.id && values.departmentId === category.departmentId;
            return (
              <label className={`relative flex min-h-32 cursor-pointer flex-col rounded-2xl border-2 p-5 transition focus-within:ring-4 focus-within:ring-blue-200 ${selected ? "border-blue-600 bg-blue-50" : "border-slate-200 bg-white hover:border-blue-400"}`} key={category.id}>
                <input checked={selected} className="absolute right-4 top-4 size-5 accent-blue-600" name="product-category" onChange={() => selectCategory(category)} type="radio" value={category.id} />
                <span className="pr-8 text-base font-semibold text-slate-950">{category.name}</span>
                <span className="mt-2 text-sm text-slate-600">{category.departmentName}</span>
                <span className="mt-auto pt-4 text-xs font-semibold text-slate-700">{selected ? "Selected" : "Choose this product type"}</span>
              </label>
            );
          })}
        </div>
      ) : null}

      {validationMessage ? <p aria-live="polite" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900" role="alert">{validationMessage}</p> : null}
    </fieldset>
  );
}
