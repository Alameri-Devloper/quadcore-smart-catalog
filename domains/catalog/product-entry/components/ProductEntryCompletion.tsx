"use client";

interface ProductEntryCompletionProps {
  onAddAnother: () => void;
  onBackToCatalog: () => void;
  onHome: () => void;
}

export function ProductEntryCompletion({
  onAddAnother,
  onBackToCatalog,
  onHome,
}: ProductEntryCompletionProps) {
  return (
    <main className="min-h-screen bg-slate-50 px-4 py-10 sm:px-6">
      <section className="mx-auto flex min-h-[70vh] w-full max-w-3xl flex-col items-center justify-center rounded-3xl border border-emerald-200 bg-white p-6 text-center shadow-sm sm:p-10">
        <span
          aria-hidden="true"
          className="flex size-16 items-center justify-center rounded-full bg-emerald-100 text-3xl font-bold text-emerald-700"
        >
          ✓
        </span>
        <h1 className="mt-5 text-3xl font-bold text-slate-950">
          Product Entry Complete
        </h1>
        <p className="mt-3 max-w-lg text-sm leading-6 text-slate-600 sm:text-base">
          The workflow passed validation. Product saving will be added in a
          future task; no Product was persisted.
        </p>
        <div className="mt-8 grid w-full max-w-sm gap-3">
          <button
            className="min-h-12 rounded-xl bg-blue-600 px-5 font-semibold text-white focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onAddAnother}
            type="button"
          >
            Add Another Product
          </button>
          <button
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onBackToCatalog}
            type="button"
          >
            Back to Catalog
          </button>
          <button
            className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200"
            onClick={onHome}
            type="button"
          >
            Home
          </button>
        </div>
      </section>
    </main>
  );
}
