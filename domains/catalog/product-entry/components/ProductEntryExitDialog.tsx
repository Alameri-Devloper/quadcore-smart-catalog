"use client";

import { useEffect, useRef } from "react";

interface ProductEntryExitDialogProps {
  destinationLabel: string;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
}

export function ProductEntryExitDialog({
  destinationLabel,
  onContinueEditing,
  onDiscardChanges,
}: ProductEntryExitDialogProps) {
  const continueButtonRef = useRef<HTMLButtonElement>(null);

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
          Discard unsaved changes?
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-slate-600"
          id="product-entry-exit-description"
        >
          Your Product Entry changes have not been saved. Choose what to do
          before going to {destinationLabel}.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            className="min-h-12 rounded-xl bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onContinueEditing}
            ref={continueButtonRef}
            type="button"
          >
            Continue Editing
          </button>
          <button
            className="min-h-12 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            onClick={onDiscardChanges}
            type="button"
          >
            Discard Changes
          </button>
          <button
            aria-describedby="save-draft-coming-soon"
            className="min-h-12 cursor-not-allowed rounded-xl border border-slate-200 bg-slate-100 px-4 font-semibold text-slate-500"
            disabled
            type="button"
          >
            Save Draft
          </button>
          <p
            className="text-center text-xs font-medium text-slate-500"
            id="save-draft-coming-soon"
          >
            Coming Soon
          </p>
        </div>
      </section>
    </div>
  );
}
