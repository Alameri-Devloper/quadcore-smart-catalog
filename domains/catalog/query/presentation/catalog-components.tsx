"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, type ReactNode } from "react";
import { formatIsoCurrencyAmountMinor } from "../../reference-data/domain/catalog-reference-data";
import { DirectProductShare } from "../../sharing/presentation/DirectProductShare";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { catalogFixedValueText, type CatalogActiveFilterItem } from "./catalog-active-filters";
import { catalogDetailsHref, type CatalogQueryState } from "./catalog-query-state";
import { catalogText } from "./catalog-presentation.i18n";
import type { CatalogFilterOptionsView, CatalogMediaView, CatalogMoneyView, CatalogProductCardView, CatalogProductDetailsView } from "./catalog-presentation.types";

const titleOf = (product: Pick<CatalogProductCardView, "productName" | "productCode" | "productId">) => product.productName || product.productCode || product.productId;
const label = catalogFixedValueText;

export type CatalogMoneyDisplay = { readonly type: "Formatted"; readonly text: string } | { readonly type: "UnsupportedCurrency"; readonly currency: string };
export const formatCatalogMoney = (value: CatalogMoneyView): CatalogMoneyDisplay => {
  if (!/^(0|[1-9][0-9]*)$/u.test(value.amountMinor)) return Object.freeze({ type: "UnsupportedCurrency", currency: value.currency });
  const formatted = formatIsoCurrencyAmountMinor(BigInt(value.amountMinor), value.currency);
  return formatted === null ? Object.freeze({ type: "UnsupportedCurrency", currency: value.currency }) : Object.freeze({ type: "Formatted", text: `${formatted} ${value.currency}` });
};

export const CatalogMedia = ({ media, productTitle, locale, priority = false }: { readonly media: CatalogMediaView | null; readonly productTitle: string; readonly locale: Locale; readonly priority?: boolean }) => {
  const [failed, setFailed] = useState(false);
  const alt = media?.altText?.trim() || productTitle;
  if (!media || failed) return <div className="catalog-media catalog-media--fallback" role="img" aria-label={media ? catalogText(locale, "mediaUnavailable") : catalogText(locale, "noMedia")}><span aria-hidden="true">◇</span><small>{media ? catalogText(locale, "mediaUnavailable") : catalogText(locale, "noMedia")}</small></div>;
  return <div className="catalog-media"><Image src={media.downloadUrl} alt={alt} width={960} height={720} sizes="(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 33vw" priority={priority} unoptimized onError={() => setFailed(true)} /></div>;
};

const MoneyLine = ({ name, value, locale, internal = false }: { readonly name: string; readonly value: CatalogMoneyView; readonly locale: Locale; readonly internal?: boolean }) => {
  const display = formatCatalogMoney(value);
  return <div className={`catalog-money${internal ? " catalog-money--internal" : ""}`}>
    <span>{name}</span><strong dir="ltr">{display.type === "Formatted" ? display.text : display.currency}</strong>
    {display.type === "UnsupportedCurrency" ? <small role="status">{catalogText(locale, "moneyDisplayUnsupported")}</small> : null}
    <small>{value.source === "BranchOverride" ? catalogText(locale, "branchOverride") : catalogText(locale, "workspaceBase")}</small>
  </div>;
};

export const CatalogActiveState = ({ items, branchDisplayName, locale, onReset }: { readonly items: readonly CatalogActiveFilterItem[]; readonly branchDisplayName?: string; readonly locale: Locale; readonly onReset: () => void }) => <>
  {branchDisplayName ? <div className="catalog-branch-context"><strong>{catalogText(locale, "branch")}</strong><span>{branchDisplayName}</span></div> : null}
  {items.length ? <div className="catalog-active-filters" aria-label={catalogText(locale, "activeFilters")}><strong>{catalogText(locale, "activeFilters")}</strong><div className="catalog-chip-row">{items.map((value) => <span className="catalog-chip" key={value.key}>{value.label}: {value.value}</span>)}</div><button className="text-button" type="button" onClick={onReset}>{catalogText(locale, "resetFilters")}</button></div> : null}
</>;

const ClassificationBadges = ({ product, locale }: { readonly product: CatalogProductCardView; readonly locale: Locale }) => {
  const values = [product.classification.department?.displayName, product.classification.category?.displayName, product.classification.productType?.displayName, product.classification.brand?.displayName, product.classification.deviceClass ? label(locale, product.classification.deviceClass) : null, product.classification.condition ? label(locale, product.classification.condition) : null, product.classification.supplyStatus?.displayName].filter((value): value is string => Boolean(value));
  return <div className="catalog-chip-row" aria-label={catalogText(locale, "details")}>{values.map((value, index) => <span className="catalog-chip" key={`${index}-${value}`}>{value}</span>)}</div>;
};

export const CatalogProductCard = ({ product, queryState, locale }: { readonly product: CatalogProductCardView; readonly queryState: CatalogQueryState; readonly locale: Locale }) => {
  const title = titleOf(product), href = catalogDetailsHref(product.productId, queryState);
  return <article className="catalog-card">
    <Link href={href} className="catalog-card__media-link" aria-label={`${catalogText(locale, "viewDetails")}: ${title}`}><CatalogMedia media={product.mainMedia} productTitle={title} locale={locale} /></Link>
    <div className="catalog-card__body">
      <div className="catalog-card__heading"><div><p className="catalog-card__code" dir="ltr">{product.productCode ?? "—"}</p><h2><Link href={href}>{title}</Link></h2></div><span className={`catalog-status catalog-status--${product.lifecycle.toLowerCase()}`}>{label(locale, product.lifecycle)}</span></div>
      <ClassificationBadges product={product} locale={locale} />
      <div className="catalog-price-grid">
        {product.retail ? <MoneyLine name={catalogText(locale, "retail")} value={product.retail} locale={locale} /> : null}
        {product.wholesale ? <MoneyLine name={catalogText(locale, "wholesale")} value={product.wholesale} locale={locale} /> : null}
        {!product.retail && !product.wholesale ? <p className="catalog-muted">{catalogText(locale, "noAuthorizedPrice")}</p> : null}
      </div>
      {product.availability ? <p className={`catalog-availability catalog-availability--${product.availability.toLowerCase()}`}><span aria-hidden="true">●</span>{label(locale, product.availability)}</p> : null}
      {product.inventory ? <dl className="catalog-inventory catalog-inventory--compact"><div><dt>{catalogText(locale, "available")}</dt><dd dir="ltr">{product.inventory.available}</dd></div><div><dt>{catalogText(locale, "onHand")}</dt><dd dir="ltr">{product.inventory.onHand}</dd></div></dl> : null}
      <Link className="button button--secondary button--full" href={href}>{catalogText(locale, "viewDetails")}</Link>
    </div>
  </article>;
};

const SelectField = ({ id, labelText, value, onChange, children, disabled = false }: { readonly id: string; readonly labelText: string; readonly value: string; readonly onChange: (value: string) => void; readonly children: ReactNode; readonly disabled?: boolean }) => <div className="form-field"><label htmlFor={id}>{labelText}</label><select id={id} value={value} onChange={(event) => onChange(event.target.value)} disabled={disabled}>{children}</select></div>;
const options = (values: readonly { readonly id: string; readonly displayName: string }[]) => values.map((value) => <option key={value.id} value={value.id}>{value.displayName}</option>);

export const CatalogFilterPanel = ({ state, filterOptions, locale, onChange }: { readonly state: CatalogQueryState; readonly filterOptions: CatalogFilterOptionsView; readonly locale: Locale; readonly onChange: (patch: Partial<CatalogQueryState>) => void }) => {
  const categories = filterOptions.categories.filter((item) => !state.departmentId || item.parentId === state.departmentId);
  const productTypes = filterOptions.productTypes.filter((item) => !state.categoryId || item.parentId === state.categoryId);
  return <details className="catalog-filter-surface">
    <summary><span>{catalogText(locale, "filters")}</span><span aria-hidden="true">＋</span></summary>
    <div className="catalog-filter-grid">
      <SelectField id="catalog-branch" labelText={catalogText(locale, "branch")} value={state.branchId ?? ""} onChange={(value) => onChange({ branchId: value || undefined, listing: undefined, stock: undefined })}><option value="">{catalogText(locale, "allBranches")}</option>{options(filterOptions.branches)}</SelectField>
      <SelectField id="catalog-department" labelText={catalogText(locale, "department")} value={state.departmentId ?? ""} onChange={(value) => onChange({ departmentId: value || undefined, categoryId: undefined, productTypeId: undefined })}><option value="">{catalogText(locale, "any")}</option>{options(filterOptions.departments)}</SelectField>
      <SelectField id="catalog-category" labelText={catalogText(locale, "category")} value={state.categoryId ?? ""} onChange={(value) => onChange({ categoryId: value || undefined, productTypeId: undefined })}><option value="">{catalogText(locale, "any")}</option>{options(categories)}</SelectField>
      <SelectField id="catalog-product-type" labelText={catalogText(locale, "productType")} value={state.productTypeId ?? ""} onChange={(value) => onChange({ productTypeId: value || undefined })}><option value="">{catalogText(locale, "any")}</option>{options(productTypes)}</SelectField>
      <SelectField id="catalog-brand" labelText={catalogText(locale, "brand")} value={state.brandId ?? ""} onChange={(value) => onChange({ brandId: value || undefined })}><option value="">{catalogText(locale, "any")}</option>{options(filterOptions.brands)}</SelectField>
      <SelectField id="catalog-device-class" labelText={catalogText(locale, "deviceClass")} value={state.deviceClass ?? ""} onChange={(value) => onChange({ deviceClass: value as CatalogQueryState["deviceClass"] || undefined })}><option value="">{catalogText(locale, "any")}</option>{["personal", "business", "gaming", "workstation"].map((value) => <option key={value} value={value}>{label(locale, value)}</option>)}</SelectField>
      <SelectField id="catalog-condition" labelText={catalogText(locale, "condition")} value={state.condition ?? ""} onChange={(value) => onChange({ condition: value as CatalogQueryState["condition"] || undefined })}><option value="">{catalogText(locale, "any")}</option>{filterOptions.enabledConditions.map((value) => <option key={value} value={value}>{label(locale, value)}</option>)}</SelectField>
      <SelectField id="catalog-supply" labelText={catalogText(locale, "supplyStatus")} value={state.supplyStatusId ?? ""} onChange={(value) => onChange({ supplyStatusId: value || undefined })}><option value="">{catalogText(locale, "any")}</option>{options(filterOptions.supplyStatuses)}</SelectField>
      {filterOptions.capabilities.lifecycles.length > 1 ? <SelectField id="catalog-lifecycle" labelText={catalogText(locale, "lifecycle")} value={state.lifecycle} onChange={(value) => onChange({ lifecycle: value as CatalogQueryState["lifecycle"] })}>{filterOptions.capabilities.lifecycles.map((value) => <option key={value} value={value}>{label(locale, value)}</option>)}</SelectField> : null}
      {state.branchId && filterOptions.capabilities.listingFilters.length > 1 ? <SelectField id="catalog-listing" labelText={catalogText(locale, "listing")} value={state.listing ?? "Listed"} onChange={(value) => onChange({ listing: value as CatalogQueryState["listing"] })}>{filterOptions.capabilities.listingFilters.map((value) => <option key={value} value={value}>{label(locale, value)}</option>)}</SelectField> : null}
      {state.branchId && filterOptions.capabilities.stockFilters.length ? <SelectField id="catalog-stock" labelText={catalogText(locale, "stock")} value={state.stock ?? ""} onChange={(value) => onChange({ stock: value as CatalogQueryState["stock"] || undefined })}><option value="">{catalogText(locale, "any")}</option>{filterOptions.capabilities.stockFilters.map((value) => <option key={value} value={value}>{label(locale, value)}</option>)}</SelectField> : null}
      {filterOptions.capabilities.retailPrice ? <><SelectField id="catalog-currency" labelText={catalogText(locale, "retailCurrency")} value={state.retailCurrency ?? ""} onChange={(value) => onChange({ retailCurrency: value || undefined, minRetailPrice: value ? state.minRetailPrice : undefined, maxRetailPrice: value ? state.maxRetailPrice : undefined, sort: !value && state.sort.startsWith("retail-price") ? "newest" : state.sort })}><option value="">{catalogText(locale, "any")}</option>{filterOptions.enabledCurrencies.map((value) => <option key={value} value={value}>{value}</option>)}</SelectField><div className="form-field"><label htmlFor="catalog-min-retail">{catalogText(locale, "minRetail")}</label><input id="catalog-min-retail" inputMode="numeric" pattern="[0-9]*" value={state.minRetailPrice ?? ""} disabled={!state.retailCurrency} onChange={(event) => { if (/^[0-9]{0,16}$/u.test(event.target.value)) onChange({ minRetailPrice: event.target.value || undefined }); }} /></div><div className="form-field"><label htmlFor="catalog-max-retail">{catalogText(locale, "maxRetail")}</label><input id="catalog-max-retail" inputMode="numeric" pattern="[0-9]*" value={state.maxRetailPrice ?? ""} disabled={!state.retailCurrency} onChange={(event) => { if (/^[0-9]{0,16}$/u.test(event.target.value)) onChange({ maxRetailPrice: event.target.value || undefined }); }} /></div></> : null}
    </div>
  </details>;
};

export const CatalogProductDetailsContent = ({ product, locale, returnTo }: { readonly product: CatalogProductDetailsView; readonly locale: Locale; readonly returnTo: string }) => {
  const title = titleOf(product);
  return <>
    <div className="catalog-details-heading"><div><p className="eyebrow">{catalogText(locale, "details")}</p><h1>{title}</h1><p className="catalog-card__code" dir="ltr">{product.productCode ?? product.productId}</p></div><Link className="button button--secondary" href={returnTo}>{catalogText(locale, "backToCatalog")}</Link></div>
    <div className="catalog-details-layout">
      <section className="surface-card catalog-details-media" aria-labelledby="product-media-heading"><h2 id="product-media-heading">{catalogText(locale, "media")}</h2>{product.media.length ? <div className="catalog-media-gallery">{product.media.map((item, index) => <CatalogMedia key={item.mediaId} media={item} productTitle={title} locale={locale} priority={index === 0} />)}</div> : <CatalogMedia media={null} productTitle={title} locale={locale} />}</section>
      <section className="surface-card" aria-labelledby="product-summary-heading"><h2 id="product-summary-heading">{catalogText(locale, "details")}</h2><ClassificationBadges product={product} locale={locale} /><dl className="catalog-summary"><div><dt>{catalogText(locale, "lifecycle")}</dt><dd>{label(locale, product.lifecycle)}</dd></div><div><dt>{catalogText(locale, "listingStatus")}</dt><dd>{label(locale, product.listingStatus)}</dd></div></dl><div className="catalog-price-grid">{product.retail ? <MoneyLine name={catalogText(locale, "retail")} value={product.retail} locale={locale} /> : null}{product.wholesale ? <MoneyLine name={catalogText(locale, "wholesale")} value={product.wholesale} locale={locale} /> : null}{!product.retail && !product.wholesale ? <p className="catalog-muted">{catalogText(locale, "noAuthorizedPrice")}</p> : null}</div>{product.availability ? <p className={`catalog-availability catalog-availability--${product.availability.toLowerCase()}`}><span aria-hidden="true">●</span>{label(locale, product.availability)}</p> : null}</section>
      {product.inventory ? <section className="surface-card" aria-labelledby="inventory-heading"><h2 id="inventory-heading">{catalogText(locale, "exactInventory")}</h2><dl className="catalog-inventory"><div><dt>{catalogText(locale, "available")}</dt><dd dir="ltr">{product.inventory.available}</dd></div><div><dt>{catalogText(locale, "onHand")}</dt><dd dir="ltr">{product.inventory.onHand}</dd></div><div><dt>{catalogText(locale, "reserved")}</dt><dd dir="ltr">{product.inventory.reserved}</dd></div><div><dt>{catalogText(locale, "damaged")}</dt><dd dir="ltr">{product.inventory.damaged}</dd></div></dl></section> : null}
      {Object.prototype.hasOwnProperty.call(product, "referenceCost") && product.referenceCost ? <section className="surface-card catalog-internal-card" aria-labelledby="reference-cost-heading"><h2 id="reference-cost-heading">{catalogText(locale, "referenceCost")}</h2><p>{catalogText(locale, "internalOnly")}</p><MoneyLine name={catalogText(locale, "referenceCost")} value={product.referenceCost} locale={locale} internal /></section> : null}
      <section className="surface-card catalog-details-specifications" aria-labelledby="specifications-heading"><h2 id="specifications-heading">{catalogText(locale, "specifications")}</h2>{product.specifications.length ? <dl className="catalog-specifications">{product.specifications.map((item) => <div key={item.specificationDefinitionId}><dt>{item.displayName}</dt><dd>{typeof item.value === "boolean" ? catalogText(locale, item.value ? "yes" : "no") : item.value}{item.unit ? ` ${item.unit}` : ""}</dd></div>)}</dl> : <p className="catalog-muted">{catalogText(locale, "noSpecifications")}</p>}</section>
      <div className="catalog-details-share">{product.capabilities.directSharePriceModes.length ? <DirectProductShare productId={product.productId} branchId={product.branchId} locale={locale} availablePriceModes={product.capabilities.directSharePriceModes} /> : <div className="status-message status-message--info" role="status">{catalogText(locale, "shareUnavailable")}</div>}</div>
    </div>
  </>;
};
