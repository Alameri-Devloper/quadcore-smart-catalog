"use client";

import { useEffect, useRef } from "react";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";

interface ProductEntryRecoveryDialogProps {
  readonly locale: "en" | "ar";
  readonly updatedAt: number;
  readonly onRestore: () => void;
  readonly onDiscard: () => void;
  readonly onContinue: () => void;
}

export function ProductEntryRecoveryDialog({ locale, updatedAt, onRestore, onDiscard, onContinue }: ProductEntryRecoveryDialogProps) {
  const restoreRef = useRef<HTMLButtonElement>(null);
  const ar = locale === "ar";
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  useEffect(() => {
    restoreRef.current?.focus();
    const escape = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); onContinue(); }
    };
    document.addEventListener("keydown", escape);
    return () => document.removeEventListener("keydown", escape);
  }, [onContinue]);
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" role="presentation">
      <section aria-describedby="draft-restore-description" aria-labelledby="draft-restore-title" aria-modal="true" className="max-h-[calc(100dvh-2rem)] w-full max-w-md overflow-auto rounded-3xl bg-white p-6 shadow-2xl" dir={ar ? "rtl" : "ltr"} role="dialog">
        <h2 className="text-xl font-bold text-slate-950" id="draft-restore-title">{text.localDraftFound}</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id="draft-restore-description">{text.recoveryDescription}</p>
        <p className="mt-2 text-xs text-slate-500">{text.lastSaved}: {new Date(updatedAt).toLocaleString(ar ? "ar-u-nu-latn" : "en")}</p>
        <div className="mt-6 grid gap-3">
          <button className="min-h-12 rounded-xl bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={onRestore} ref={restoreRef} type="button">{text.restoreDraft}</button>
          <button className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" onClick={onContinue} type="button">{text.continueWithoutRestore}</button>
          <button className="min-h-12 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200" onClick={onDiscard} type="button">{text.discardDraft}</button>
        </div>
      </section>
    </div>
  );
}
