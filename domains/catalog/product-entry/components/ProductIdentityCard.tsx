import type { ProductEntryIdentityViewModel, ProductIdentityValue } from "../services/product-entry-identity.service";

interface ProductIdentityCardProps {
  identity: ProductEntryIdentityViewModel;
}

const IdentityValues = ({ values }: { values: readonly ProductIdentityValue[] }) => (
  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
    {values.map((item) => <div key={item.label}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{item.label}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{item.value}</dd></div>)}
  </dl>
);

export function ProductIdentityCard({ identity }: ProductIdentityCardProps) {
  return (
    <aside aria-labelledby="product-identity-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Product Identity</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-950" id="product-identity-heading">
        {identity.displayTitle ?? "Decision Summary"}
      </h2>
      {identity.identityError ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">Product identity could not be prepared. Review the current product decisions.</p> : identity.identityValues.length === 0 ? <p className="mt-3 text-sm leading-6 text-slate-600">Your product identity will appear here as you make decisions.</p> : <IdentityValues values={identity.identityValues} />}

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="identity-specifications"><h3 className="text-sm font-semibold text-slate-800" id="identity-specifications">Specifications</h3>{identity.specifications.completed !== undefined && identity.specifications.required !== undefined ? <p className="mt-2 text-sm font-semibold text-slate-900">{identity.specifications.completed} of {identity.specifications.required} required completed</p> : null}<p className="mt-1 text-sm font-semibold text-slate-700">{identity.specifications.status}</p></section>

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="identity-commercial"><h3 className="text-sm font-semibold text-slate-800" id="identity-commercial">Commercial Details</h3>{identity.commercial.values.length > 0 ? <IdentityValues values={identity.commercial.values} /> : null}<p className="mt-2 text-sm font-semibold text-slate-700">{identity.commercial.status}</p></section>

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="identity-work-status"><h3 className="text-sm font-semibold text-slate-800" id="identity-work-status">Work Status</h3><p className="mt-2 text-sm font-semibold text-slate-900">{identity.workStatus}</p></section>
    </aside>
  );
}
