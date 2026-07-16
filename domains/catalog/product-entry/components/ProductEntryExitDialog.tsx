"use client";

import { useEffect, useRef } from "react";

interface ProductEntryExitDialogProps {
  error: string | null;
  isSaving: boolean;
  onContinueEditing: () => void;
  onDiscardChanges: () => void;
  onSaveDraft: () => void;
}

export function ProductEntryExitDialog({
  error,
  isSaving,
  onContinueEditing,
  onDiscardChanges,
  onSaveDraft,
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
          Close Product Entry?
        </h2>
        <p
          className="mt-2 text-sm leading-6 text-slate-600"
          id="product-entry-exit-description"
        >
          Save your current work as a Draft and close, discard your changes and close, or continue editing.
        </p>
        <div className="mt-6 grid gap-3">
          <button
            className="min-h-12 rounded-xl bg-blue-600 px-4 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-50"
            disabled={isSaving}
            onClick={onSaveDraft}
            ref={continueButtonRef}
            type="button"
          >
            {isSaving ? "Saving Draft…" : "Save Draft and Close"}
          </button>
          <button
            className="min-h-12 rounded-xl border border-red-300 bg-white px-4 font-semibold text-red-700 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-red-200"
            disabled={isSaving}
            onClick={onDiscardChanges}
            type="button"
          >
            Discard Changes and Close
          </button>
          <button
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-4 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            disabled={isSaving}
            onClick={onContinueEditing}
            type="button"
          >
            Continue Editing
          </button>
          {error ? <p className="text-sm font-medium text-red-700" role="alert">{error}</p> : null}
        </div>
      </section>
    </div>
  );
}
