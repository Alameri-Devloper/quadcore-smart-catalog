import type { ProductEntryIdentityViewModel, ProductIdentityValue } from "../services/product-entry-identity.service";
import { formatProductEntryWesternNumber, PRODUCT_ENTRY_PRESENTATION_TEXT, type ProductEntryPresentationText } from "../presentation/product-entry-i18n";

interface ProductIdentityCardProps {
  identity: ProductEntryIdentityViewModel;
  locale: "en" | "ar";
}

const localizedIdentityLabel = (label: string, text: ProductEntryPresentationText): string => ({
  "Product Name": text.productName, Category: text.categoryTitle, "Device Class": text.deviceClassTitle,
  Brand: text.brand, "Product Model": text.productModelTitle, Retail: text.retail,
  Wholesale: text.wholesale, Condition: text.condition, Availability: text.availability,
}[label] ?? label);
const localizedIdentityValue = (value: string, text: ProductEntryPresentationText): string => ({
  New: text.newCondition, Used: text.usedCondition, "In Stock": text.inStock,
  "Arrived at Port": text.arrivedAtPort, "On the Way": text.onTheWay,
}[value] ?? value);

const IdentityValues = ({ values, text }: { values: readonly ProductIdentityValue[]; text: ProductEntryPresentationText }) => (
  <dl className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1">
    {values.map((item) => <div key={item.label}><dt className="text-xs font-medium uppercase tracking-wide text-slate-500">{localizedIdentityLabel(item.label, text)}</dt><dd className="mt-1 text-sm font-semibold text-slate-900">{localizedIdentityValue(item.value, text)}</dd></div>)}
  </dl>
);

export function ProductIdentityCard({ identity, locale }: ProductIdentityCardProps) {
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const status = (value: string) => value === "Confirmed" ? text.confirmed
    : value === "In Progress" ? text.inProgress
      : value === "Needs Attention" ? text.needsAttention : text.notStarted;
  return (
    <aside aria-labelledby="product-identity-heading" className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm lg:sticky lg:top-6 lg:self-start">
      <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">{text.productIdentity}</p>
      <h2 className="mt-1 text-lg font-semibold text-slate-950" id="product-identity-heading">
        {identity.displayTitle ?? text.decisionSummary}
      </h2>
      {identity.identityError ? <p className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950">{text.identityUnavailable}</p> : identity.identityValues.length === 0 ? <p className="mt-3 text-sm leading-6 text-slate-600">{text.identityEmpty}</p> : <IdentityValues text={text} values={identity.identityValues} />}

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="identity-specifications"><h3 className="text-sm font-semibold text-slate-800" id="identity-specifications">{text.specifications}</h3>{identity.specifications.completed !== undefined && identity.specifications.required !== undefined ? <p className="mt-2 text-sm font-semibold text-slate-900">{formatProductEntryWesternNumber(identity.specifications.completed, locale)} / {formatProductEntryWesternNumber(identity.specifications.required, locale)} {text.requiredSpecificationsCompleted}</p> : null}<p className="mt-1 text-sm font-semibold text-slate-700">{status(identity.specifications.status)}</p></section>

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="identity-commercial"><h3 className="text-sm font-semibold text-slate-800" id="identity-commercial">{text.commercialDetails}</h3>{identity.commercial.values.length > 0 ? <IdentityValues text={text} values={identity.commercial.values} /> : null}<p className="mt-2 text-sm font-semibold text-slate-700">{status(identity.commercial.status)}</p></section>

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="identity-images"><h3 className="text-sm font-semibold text-slate-800" id="identity-images">{text.images}</h3><dl className="mt-2 grid grid-cols-2 gap-3 text-sm"><div><dt className="text-slate-500">{text.images}</dt><dd className="font-semibold text-slate-900">{formatProductEntryWesternNumber(identity.images.count, locale)} {text.added}</dd></div><div><dt className="text-slate-500">{text.mainImage}</dt><dd className="font-semibold text-slate-900">{identity.images.mainSelected ? text.selected : text.notSelected}</dd></div></dl></section>

      <section className="mt-5 border-t border-slate-200 pt-4" aria-labelledby="identity-work-status"><h3 className="text-sm font-semibold text-slate-800" id="identity-work-status">{text.workStatus}</h3><p className="mt-2 text-sm font-semibold text-slate-900">{identity.workStatus === "Draft Saved" ? text.draftSavedStatus : text.unsavedChanges}</p></section>
    </aside>
  );
}
