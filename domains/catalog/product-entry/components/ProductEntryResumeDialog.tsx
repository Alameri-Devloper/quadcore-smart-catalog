"use client";

import { useEffect, useRef } from "react";
import type { ProductEntryDraft } from "../drafts/product-entry-draft.entity";

interface ProductEntryResumeDialogProps {
  draft: ProductEntryDraft;
  error: string | null;
  isWorking: boolean;
  onContinue: () => void;
  onDelete: () => void;
  onStartNew: () => void;
}

export function ProductEntryResumeDialog(props: ProductEntryResumeDialogProps) {
  const continueRef = useRef<HTMLButtonElement>(null);
  useEffect(() => continueRef.current?.focus(), []);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/50 p-4 sm:items-center" role="presentation">
      <section aria-describedby="resume-draft-description" aria-labelledby="resume-draft-title" aria-modal="true" className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" role="dialog">
        <h2 className="text-xl font-bold text-slate-950" id="resume-draft-title">Continue your Product Draft?</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600" id="resume-draft-description">
          Last updated {new Date(props.draft.updatedAt).toLocaleString()}. Choose whether to continue it or begin cleanly.
        </p>
        <div className="mt-6 grid gap-3">
          <button className="min-h-12 rounded-xl bg-blue-600 px-4 font-semibold text-white disabled:opacity-50" disabled={props.isWorking} onClick={props.onContinue} ref={continueRef} type="button">Continue Draft</button>
          <button className="min-h-12 rounded-xl border border-slate-300 px-4 font-semibold text-slate-800 disabled:opacity-50" disabled={props.isWorking} onClick={props.onStartNew} type="button">Start New Product</button>
          <button aria-label="Delete Product Entry Draft permanently" className="min-h-12 rounded-xl border border-red-300 px-4 font-semibold text-red-700 disabled:opacity-50" disabled={props.isWorking} onClick={props.onDelete} type="button">Delete Draft</button>
          {props.error ? <p className="text-sm font-medium text-red-700" role="alert">{props.error}</p> : null}
        </div>
      </section>
    </div>
  );
}
