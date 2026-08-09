"use client";

import { useEffect, useRef } from "react";
import { formatProductEntryWesternNumber, PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";

interface ProductEntryRevisionConflictDialogProps {
  readonly baseRevision: number;
  readonly currentRevision: number;
  readonly locale: "en" | "ar";
  readonly canReviewLocal: boolean;
  readonly onReviewLocal?: () => void;
  readonly onDiscardAndReload: () => void;
  readonly onCancel: () => void;
}

export function ProductEntryRevisionConflictDialog({ baseRevision, currentRevision, locale, canReviewLocal, onReviewLocal, onDiscardAndReload, onCancel }: ProductEntryRevisionConflictDialogProps) {
  const cancelRef = useRef<HTMLButtonElement>(null);
  const ar = locale === "ar";
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  useEffect(() => {
    cancelRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onCancel(); }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onCancel]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" role="presentation">
      <section aria-describedby="revision-conflict-description" aria-labelledby="revision-conflict-title" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-auto rounded-3xl bg-white p-6 shadow-2xl" dir={ar ? "rtl" : "ltr"} role="alertdialog">
        <h2 className="text-xl font-bold text-slate-950" id="revision-conflict-title">{text.revisionConflict}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id="revision-conflict-description">{text.revisionConflictDescription}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-slate-50 p-4 text-sm"><div><dt className="text-slate-500">{text.baseRevision}</dt><dd className="font-semibold text-slate-950">{formatProductEntryWesternNumber(baseRevision, locale)}</dd></div><div><dt className="text-slate-500">{text.currentRevision}</dt><dd className="font-semibold text-slate-950">{formatProductEntryWesternNumber(currentRevision, locale)}</dd></div></dl>
        <div className="mt-6 grid gap-3">
          {canReviewLocal && onReviewLocal ? <button className="min-h-12 rounded-xl bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={onReviewLocal} type="button">{text.reviewLocalChanges}</button> : null}
          <button className="min-h-12 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200" onClick={onDiscardAndReload} type="button">{text.discardReload}</button>
          <button className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={onCancel} ref={cancelRef} type="button">{text.cancel}</button>
        </div>
      </section>
    </div>
  );
}
