"use client";

import { PRODUCT_ENTRY_STEP_IDS, type ProductEntryStepId } from "../../product-entry.types";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";
import type { ProductEntryReviewViewModel } from "../../services/product-entry-review.service";
import { formatProductEntryWesternNumber, PRODUCT_ENTRY_PRESENTATION_TEXT, type ProductEntryPresentationText } from "../../presentation/product-entry-i18n";

interface ProductReviewStepProps { review: ProductEntryReviewViewModel; locale: "en" | "ar"; }

const editButtonClass = "mt-4 min-h-11 w-full rounded-xl border border-blue-300 bg-white px-4 text-sm font-semibold text-blue-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 sm:w-auto";

const reviewLabel = (label: string, text: ProductEntryPresentationText): string => ({
  "Product Name": text.productName, "Product Code": text.productCode, Department: text.categoryTitle,
  Category: text.categoryTitle, "Device Class": text.deviceClassTitle, Brand: text.brand,
  "Product Model": text.productModelTitle, Retail: text.retail, Wholesale: text.wholesale,
  Currency: text.currency, Condition: text.condition, Availability: text.availability,
  "Main Product Image": text.mainImage, "Product Identity": text.productIdentity,
  "Required Specifications": text.specifications, "Commercial Details": text.commercialDetails,
  "Product Images": text.images, "Presentation Readiness": text.readyToSave,
}[label] ?? label);

const reviewValue = (value: string, text: ProductEntryPresentationText): string => ({
  "Not entered": text.notEntered, New: text.newCondition, Used: text.usedCondition,
  "In Stock": text.inStock, "Arrived at Port": text.arrivedAtPort, "On the Way": text.onTheWay,
  Selected: text.selected, "Not selected": text.notSelected,
}[value] ?? value);

function ReviewValues({ values, text }: { values: { label: string; value: string }[]; text: ProductEntryPresentationText }) {
  return <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">{values.map((item) => <div className="rounded-xl bg-slate-50 p-3" key={`${item.label}-${item.value}`}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{reviewLabel(item.label, text)}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{reviewValue(item.value, text)}</dd></div>)}</dl>;
}

function ReviewSection({ title, action, stepId, onEdit, children }: { title: string; action: string; stepId: ProductEntryStepId; onEdit: (stepId: ProductEntryStepId) => void; children: React.ReactNode }) {
  return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby={`review-${stepId}`}><h2 className="text-lg font-semibold text-slate-950" id={`review-${stepId}`}>{title}</h2><div className="mt-4">{children}</div><button aria-label={action} className={editButtonClass} onClick={() => onEdit(stepId)} type="button">{action}</button></section>;
}

export function ProductReviewStep({ review, locale }: ProductReviewStepProps) {
  const { goToStep } = useProductEntryWorkflow();
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const ar = locale === "ar";
  const edit = (stepId: ProductEntryStepId) => {
    goToStep(stepId);
    requestAnimationFrame(() => document.getElementById("product-entry-step-heading")?.focus());
  };
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight text-slate-950" id="product-entry-step-heading" tabIndex={-1}>{text.reviewProduct}</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">{text.reviewProductHelp}</p>
      <div className="mt-7 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21rem] xl:items-start">
        <div className="space-y-6">
          <ReviewSection action={text.editProductDecisions} onEdit={edit} stepId={review.identity.editStepId} title={text.productIdentity}><ReviewValues text={text} values={review.identity.values} /></ReviewSection>
          <ReviewSection action={text.editSpecifications} onEdit={edit} stepId={PRODUCT_ENTRY_STEP_IDS.specifications} title={text.specifications}>
            <p className="text-sm font-semibold text-slate-900">{formatProductEntryWesternNumber(review.specifications.requiredCompleted, locale)} / {formatProductEntryWesternNumber(review.specifications.requiredTotal, locale)} {text.required} · {formatProductEntryWesternNumber(review.specifications.optionalCompleted, locale)} / {formatProductEntryWesternNumber(review.specifications.optionalTotal, locale)} {text.optional}</p>
            {review.specifications.values.length ? <div className="mt-4"><ReviewValues text={text} values={review.specifications.values} /></div> : <p className="mt-3 text-sm text-slate-600">{text.noConfirmedSpecifications}</p>}
            {review.specifications.missing.length ? <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3"><p className="text-sm font-semibold text-red-900">{text.missingRequiredFields}</p><ul className="mt-2 list-disc pl-5 text-sm text-red-800">{review.specifications.missing.map((field) => <li key={field}>{field}</li>)}</ul></div> : null}
          </ReviewSection>
          <ReviewSection action={text.editCommercialDetails} onEdit={edit} stepId={PRODUCT_ENTRY_STEP_IDS.commercialDetails} title={text.commercialDetails}><ReviewValues text={text} values={review.commercial.values} /></ReviewSection>
          <ReviewSection action={text.editImages} onEdit={edit} stepId={PRODUCT_ENTRY_STEP_IDS.images} title={text.images}>
            <p className="text-sm font-semibold text-slate-900">{formatProductEntryWesternNumber(review.images.count, locale)} {text.images} · {ar ? (review.images.mainStatus === "Selected" ? text.selected : text.notSelected) : review.images.mainStatus}</p>
            {review.images.values.length ? <div className="mt-4"><ReviewValues text={text} values={review.images.values} /></div> : <p className="mt-2 text-sm text-slate-600">{text.imagesCustomerReadiness}</p>}
            <p className="mt-3 text-xs text-slate-600">{text.backgroundNotRequired}</p>
          </ReviewSection>
        </div>
        <aside className="space-y-6 xl:sticky xl:top-6" aria-label={text.productReviewStatus}>
          <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-live="polite"><p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{text.overallStatus}</p><h2 className="mt-2 text-xl font-bold text-slate-950">{ar ? (review.readyToSave ? text.readyToSave : text.needsAttention) : review.overallStatus}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{ar ? (review.readyToSave ? text.reviewInformation : text.reviewAttention) : review.overallExplanation}</p><p className="mt-3 text-sm font-semibold text-slate-900">{text.readyToSave}: {review.readyToSave ? text.yes : text.no}</p></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-labelledby="quality-score"><h2 className="text-lg font-semibold text-slate-950" id="quality-score">{text.qualityScore}</h2><p className="mt-3 text-3xl font-bold text-slate-950">{formatProductEntryWesternNumber(review.quality.score, locale)} / {formatProductEntryWesternNumber(review.quality.maximum, locale)}</p><p className="text-sm font-semibold text-slate-700">{ar ? text.reviewInformation : review.quality.label} · {text.rulesVersion} v{review.quality.policyVersion}</p><div aria-label={`${text.qualityScore} ${formatProductEntryWesternNumber(review.quality.score, locale)} / 100`} aria-valuemax={100} aria-valuemin={0} aria-valuenow={review.quality.score} className="mt-4 h-3 overflow-hidden rounded-full bg-slate-200" role="progressbar"><div className="h-full bg-blue-600" style={{ width: `${review.quality.score}%` }} /></div><ul className="mt-5 space-y-4">{review.quality.categories.map((category) => <li key={category.label}><div className="flex justify-between gap-3 text-sm font-semibold text-slate-900"><span>{reviewLabel(category.label, text)}</span><span>{formatProductEntryWesternNumber(category.score, locale)} / {formatProductEntryWesternNumber(category.maximum, locale)}</span></div><p className="mt-1 text-xs leading-5 text-slate-600">{ar ? text.reviewInformation : category.explanation}</p></li>)}</ul></section>
          <section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="text-lg font-semibold text-slate-950">{ar ? (review.readyToSave ? text.confirmed : text.needsAttention) : review.customerStatus}</h2><p className="mt-2 text-sm leading-6 text-slate-600">{ar ? text.reviewInformation : review.customerExplanation}</p></section>
          {review.blockingErrors.length ? <section className="rounded-2xl border border-red-200 bg-red-50 p-5" aria-labelledby="blocking-errors"><h2 className="font-semibold text-red-950" id="blocking-errors">{text.blockingProblems}</h2><ul className="mt-3 space-y-4">{review.blockingErrors.map((notice, index) => <li className="text-sm text-red-900" key={`${notice.problem}-${index}`}><p className="font-semibold">{reviewLabel(notice.section, text)}: {ar ? text.reviewAttention : notice.problem}</p><p className="mt-1">{ar ? text.reviewStepPrompt : notice.correction}</p><button className="mt-2 min-h-10 rounded-lg border border-red-300 bg-white px-3 font-semibold" onClick={() => edit(notice.stepId)} type="button">{text.edit} {reviewLabel(notice.section, text)}</button></li>)}</ul></section> : null}
          {review.warnings.length ? <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5" aria-labelledby="review-warnings"><h2 className="font-semibold text-amber-950" id="review-warnings">{text.optionalImprovements}</h2><ul className="mt-3 space-y-3">{review.warnings.map((notice, index) => <li className="text-sm text-amber-950" key={`${notice.problem}-${index}`}><p className="font-semibold">{reviewLabel(notice.section, text)}: {ar ? text.reviewAttention : notice.problem}</p><p className="mt-1">{ar ? text.reviewStepPrompt : notice.correction}</p></li>)}</ul></section> : null}
        </aside>
      </div>
    </div>
  );
}
