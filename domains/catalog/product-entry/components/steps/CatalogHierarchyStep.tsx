"use client";

import type { ProductEntryCatalogReferenceData } from "../../ports/product-entry-catalog-reference-data.port";
import type { ProductEntryCatalogReferenceDataCoordinator } from "../../presentation/product-entry-catalog-reference-data.coordinator";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";

const selectClass = "mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-base text-slate-950 outline-none focus:border-blue-600 focus:ring-4 focus:ring-blue-100";

interface CatalogHierarchyStepProps {
  readonly coordinator: ProductEntryCatalogReferenceDataCoordinator;
  readonly data: ProductEntryCatalogReferenceData | null;
  readonly loadError: string | null;
  readonly loading: boolean;
  readonly locale: "en" | "ar";
  readonly onRetry: () => void;
}

export function CatalogHierarchyStep({ coordinator, data, loadError, loading, locale, onRetry }: CatalogHierarchyStepProps) {
  const { setValues, validation, values } = useProductEntryWorkflow();
  const ar = locale === "ar";
  const categories = data
    ? coordinator.categoriesForDepartment(data, values.departmentId)
    : [];
  const productTypes = data
    ? coordinator.productTypesForCategory(data, values.categoryId)
    : [];
  const change = (next: Partial<Pick<typeof values, "departmentId" | "categoryId" | "productTypeId">>) => {
    if (!data) return;
    const hierarchy = coordinator.reconcileHierarchy(data, values, next);
    void setValues({ ...values, ...hierarchy });
  };

  return (
    <fieldset aria-describedby="catalog-hierarchy-status">
      <legend className="text-2xl font-semibold tracking-tight text-slate-950">
        {ar ? "اختر تصنيف المنتج" : "Choose the product classification"}
      </legend>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        {ar ? "اختر القسم ثم الفئة ثم نوع المنتج من بيانات مساحة العمل." : "Choose Department, Category, then Product Type from this Workspace."}
      </p>
      <div aria-live="polite" id="catalog-hierarchy-status">
        {loading ? <p className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">{ar ? "جارٍ تحميل البيانات المرجعية…" : "Loading reference data…"}</p> : null}
        {loadError ? <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900" role="alert"><p>{loadError}</p><button className="mt-3 min-h-11 rounded-lg border border-red-300 bg-white px-4 font-semibold" onClick={onRetry} type="button">{ar ? "إعادة المحاولة" : "Try again"}</button></div> : null}
        {!loading && !loadError && data && data.departments.length === 0 ? <p className="mt-6 rounded-xl bg-amber-50 p-4 text-sm text-amber-950">{ar ? "يلزم إعداد بيانات الكتالوج لهذه المساحة أولاً." : "Catalog setup is required for this Workspace before adding a Product."}</p> : null}
      </div>
      {!loading && !loadError && data && data.departments.length > 0 ? (
        <div className="mt-6 grid grid-cols-1 gap-5 md:grid-cols-3">
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="departmentId">{ar ? "القسم" : "Department"}</label><select className={selectClass} id="departmentId" onChange={(event) => change({ departmentId: event.target.value || null })} value={values.departmentId ?? ""}><option value="">{ar ? "اختر القسم" : "Choose Department"}</option>{data.departments.map((option) => <option key={option.id} value={option.id}>{option.displayName}</option>)}</select></div>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="categoryId">{ar ? "الفئة" : "Category"}</label><select className={selectClass} disabled={!values.departmentId} id="categoryId" onChange={(event) => change({ categoryId: event.target.value || null })} value={values.categoryId ?? ""}><option value="">{ar ? "اختر الفئة" : "Choose Category"}</option>{categories.map((option) => <option key={option.id} value={option.id}>{option.displayName}</option>)}</select></div>
          <div><label className="text-sm font-semibold text-slate-900" htmlFor="productTypeId">{ar ? "نوع المنتج" : "Product Type"}</label><select className={selectClass} disabled={!values.categoryId} id="productTypeId" onChange={(event) => change({ productTypeId: event.target.value || null })} value={values.productTypeId ?? ""}><option value="">{ar ? "اختر نوع المنتج" : "Choose Product Type"}</option>{productTypes.map((option) => <option key={option.id} value={option.id}>{option.displayName}</option>)}</select></div>
        </div>
      ) : null}
      {validation && !validation.valid ? <p className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-900" role="alert">{ar ? "راجع اختيارات التصنيف." : validation.issues[0]?.message}</p> : null}
    </fieldset>
  );
}
