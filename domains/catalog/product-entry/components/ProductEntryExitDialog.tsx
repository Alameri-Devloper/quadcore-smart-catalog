"use client";

import { useEffect, useRef } from "react";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";

interface ProductEntryExitDialogProps {
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  locale: "en" | "ar";
}

export function ProductEntryExitDialog({
  onContinueEditing,
  onDiscardChanges,
  locale,
}: ProductEntryExitDialogProps) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];

  useEffect(() => {
    continueButtonRef.current?.focus();

    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onContinueEditing();
      }
    };

    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [onContinueEditing]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center"
      role="presentation"
    >
      <section
        aria-describedby="product-entry-exit-description"
        aria-labelledby="product-entry-exit-title"
        aria-modal="true"
        className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl"
        role="dialog"
      >
        <h2
          className="text-xl font-bold text-slate-950"
          id="product-entry-exit-title"
        >
          {text.leaveProductEntry}
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-slate-600"
          id="product-entry-exit-description"
        >
          {text.leaveDescription}
        </p>
        <div className="mt-6 grid gap-3">
          <button
            className="min-h-12 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            onClick={onDiscardChanges}
            type="button"
          >
            {text.saveLocallyAndLeave}
          </button>
          <button
            className="min-h-12 rounded-xl bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onContinueEditing}
            ref={continueButtonRef}
            type="button"
          >
            {text.continueEditing}
          </button>
        </div>
      </section>
    </div>
  );
}
