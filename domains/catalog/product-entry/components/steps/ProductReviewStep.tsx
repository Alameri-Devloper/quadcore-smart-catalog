"use client";

import { PRODUCT_ENTRY_STEP_IDS, type ProductEntryStepId } from "../../product-entry.types";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";
import type { ProductEntryReviewViewModel } from "../../services/product-entry-review.service";

interface ProductReviewStepProps { review: ProductEntryReviewViewModel; }

const editButtonClass = "mt-4 min-h-11 w-full rounded-xl border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto";

function ReviewValues({ values }: { values: { label: string; value: string }[] }) {
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{values.map((item) => <div className="rounded-xl bg-slate-50 p-3" key={`${item.label}-${item.value}`}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{item.label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{item.value}</dd></div>)}</dl>;
}

function ReviewSection({ title, action, stepId, onEdit, children }: { title: string; action: string; stepId: ProductEntryStepId; onEdit: (stepId: ProductEntryStepId) => void; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={`review-${stepId}`}><h2 className="text-lg font-semibold text-slate-950" id={`review-${stepId}`}>{title}</h2><div className="mt-4">{children}</div><button aria-label={`${action} from product review`} className={editButtonClass} onClick={() => onEdit(stepId)} type="button">{action}</button></section>;
}

export function ProductReviewStep({ review }: ProductReviewStepProps) {
  const { goToStep } = useProductEntryWorkflow();
  const edit = (stepId: ProductEntryStepId) => {
    goToStep(stepId);
    requestAnimationFrame(() => document.getElementById("product-entry-step-heading")?.focus());
  };
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950" id="product-entry-step-heading" tabIndex={-1}>Review the product</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Check the product information before saving it to the Catalog.</p>
      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        <div className="space-y-6">
          <ReviewSection action="Edit Product Decisions" onEdit={edit} stepId={review.identity.editStepId} title="Product Identity"><ReviewValues values={review.identity.values} /></ReviewSection>
          <ReviewSection action="Edit Specifications" onEdit={edit} stepId={PRODUCT_ENTRY_STEP_IDS.specifications} title="Specifications">
            <p className="text-sm font-semibold text-slate-900">{review.specifications.requiredCompleted} of {review.specifications.requiredTotal} required · {review.specifications.optionalCompleted} of {review.specifications.optionalTotal} optional completed</p>
            {review.specifications.values.length ? <div className="mt-4"><ReviewValues values={review.specifications.values} /></div> : <p className="mt-3 text-sm text-slate-600">No confirmed specifications to display.</p>}
            {review.specifications.missing.length ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-sm font-semibold text-red-900">Missing or invalid required fields</p><ul className="mt-2 list-disc pl-5 text-sm text-red-800">{review.specifications.missing.map((field) => <li key={field}>{field}</li>)}</ul></div> : null}
          </ReviewSection>
          <ReviewSection action="Edit Commercial Details" onEdit={edit} stepId={PRODUCT_ENTRY_STEP_IDS.commercialDetails} title="Commercial Details"><ReviewValues values={review.commercial.values} /></ReviewSection>
          <ReviewSection action="Edit Images" onEdit={edit} stepId={PRODUCT_ENTRY_STEP_IDS.images} title="Images">
            <p className="text-sm font-semibold text-slate-900">{review.images.count} image{review.images.count === 1 ? "" : "s"} · {review.images.mainStatus}</p>
            {review.images.values.length ? <div className="mt-4"><ReviewValues values={review.images.values} /></div> : <p className="mt-2 text-sm text-slate-600">Images are optional for saving, but a valid Main Product Image is required for customer readiness.</p>}
            <p className="mt-3 text-xs text-slate-600">Background standardization is not required in this version.</p>
          </ReviewSection>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-6" aria-label="Product review status">
          <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Overall Status</p><h2 className="mt-2 text-xl font-bold text-slate-950">{review.overallStatus}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{review.overallExplanation}</p><p className="mt-3 text-sm font-semibold text-slate-900">Ready to Save: {review.readyToSave ? "Yes" : "No"}</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="quality-score"><h2 className="text-lg font-semibold text-slate-950" id="quality-score">Product Quality Score</h2><p className="mt-3 text-3xl font-bold text-slate-950">{review.quality.score} / {review.quality.maximum}</p><p className="text-sm font-semibold text-slate-700">{review.quality.label} · Rules v{review.quality.policyVersion}</p><div aria-label={`Product quality score ${review.quality.score} out of 100`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={review.quality.score} className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar"><div className="h-full bg-blue-600" style={{ width: `${review.quality.score}%` }} /></div><ul className="mt-5 space-y-4">{review.quality.categories.map((category) => <li key={category.label}><div className="flex justify-between gap-3 text-sm font-semibold text-slate-900"><span>{category.label}</span><span>{category.score} / {category.maximum}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{category.explanation}</p></li>)}</ul></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold text-slate-950">{review.customerStatus}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{review.customerExplanation}</p></section>
          {review.blockingErrors.length ? <section className="rounded-2xl border border-red-200 bg-red-50 p-5" aria-labelledby="blocking-errors"><h2 className="font-semibold text-red-950" id="blocking-errors">Problems blocking Review</h2><ul className="mt-3 space-y-4">{review.blockingErrors.map((notice, index) => <li className="text-sm text-red-900" key={`${notice.problem}-${index}`}><p className="font-semibold">{notice.section}: {notice.problem}</p><p className="mt-1">{notice.correction}</p><button className="mt-2 min-h-10 rounded-lg border border-red-300 bg-white px-3 font-semibold" onClick={() => edit(notice.stepId)} type="button">Edit {notice.section}</button></li>)}</ul></section> : null}
          {review.warnings.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="review-warnings"><h2 className="font-semibold text-amber-950" id="review-warnings">Optional improvements</h2><ul className="mt-3 space-y-3">{review.warnings.map((notice, index) => <li className="text-sm text-amber-950" key={`${notice.problem}-${index}`}><p className="font-semibold">{notice.section}: {notice.problem}</p><p className="mt-1">{notice.correction}</p></li>)}</ul></section> : null}
        </aside>
      </div>
    </div>
  );
}
