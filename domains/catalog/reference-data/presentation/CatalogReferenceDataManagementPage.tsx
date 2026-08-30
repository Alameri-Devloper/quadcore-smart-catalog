"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { SafeActorView } from "../../../identity/presentation/identity-presentation.types";
import { ProtectedPage, useSessionExpiryRedirect } from "../../../identity/presentation/components/auth-guard";
import { Card, PageHeading, PresentationShell, StatusMessage, usePageI18n } from "../../../identity/presentation/components/presentation-shell";
import { DynamicReferenceManager } from "./catalog-reference-dynamic-manager";
import { FixedRegistryManager } from "./catalog-reference-registry-manager";
import { SpecificationTemplateManager } from "./catalog-reference-template-manager";
import { catalogReferenceDataManagementClient } from "./catalog-reference-data-management.client";
import { categoriesForDepartment, loadCatalogReferenceAccess, productTypesForCategory, resolveCatalogReferenceSection } from "./catalog-reference-data-management.coordinator";
import { referenceText, type ReferenceLocale, type ReferenceTextKey } from "./catalog-reference-data-management.i18n";
import { CATALOG_REFERENCE_SECTIONS, type CatalogReferenceAccess, type CatalogReferenceApiFailure, type CatalogReferenceSection } from "./catalog-reference-data-management.types";

const sectionLabels: Readonly<Record<CatalogReferenceSection, ReferenceTextKey>> = {
  hierarchy: "hierarchy", brands: "brands", "supply-statuses": "supplyStatuses", "device-classes": "deviceClasses",
  conditions: "conditions", currencies: "currencies", "specification-definitions": "specificationDefinitions", "specification-templates": "specificationTemplates",
};

const loadFailureText = (locale: ReferenceLocale, kind: CatalogReferenceApiFailure) => {
  if (kind === "Forbidden") return referenceText(locale, "forbidden");
  if (kind === "ForbiddenForRestrictedSession") return referenceText(locale, "restricted");
  return referenceText(locale, "unavailable");
};

const DeviceClasses = ({ access, locale }: { readonly access: CatalogReferenceAccess; readonly locale: ReferenceLocale }) => <section className="reference-manager" aria-labelledby="device-classes-heading">
  <div className="reference-manager__heading"><div><h2 id="device-classes-heading">{referenceText(locale, "deviceClasses")}</h2><p>{referenceText(locale, "systemDefined")}</p></div></div>
  <div className="registry-list">{access.snapshot.deviceClasses.map((item) => <article className="registry-row registry-row--readonly" key={item.code}><div className="registry-row__identity"><strong>{item.labels[locale]}</strong><code dir="ltr">{item.code}</code></div><span className="badge badge--active">{referenceText(locale, "systemDefined")}</span></article>)}</div>
</section>;

const ReferenceDataContent = ({ actor }: { readonly actor: SafeActorView }) => {
  const i18n = usePageI18n(); const locale = i18n.locale as ReferenceLocale;
  const searchParams = useSearchParams();
  const section = resolveCatalogReferenceSection(searchParams.getAll("section"));
  const redirectExpired = useSessionExpiryRedirect();
  const [access, setAccess] = useState<CatalogReferenceAccess | null>(null);
  const [failure, setFailure] = useState<CatalogReferenceApiFailure | null>(null);
  const [loading, setLoading] = useState(true); const [refreshing, setRefreshing] = useState(false);
  const [departmentId, setDepartmentId] = useState<string | null>(null); const [categoryId, setCategoryId] = useState<string | null>(null);
  const load = useCallback(async () => {
    if (access) setRefreshing(true); else setLoading(true);
    const result = await loadCatalogReferenceAccess(catalogReferenceDataManagementClient);
    setLoading(false); setRefreshing(false);
    if (!result.ok) {
      if (result.kind === "AuthenticationRequired") { redirectExpired(); return; }
      setFailure(result.kind); if (!access) setAccess(null); return;
    }
    setFailure(null); setAccess(result.value);
  }, [access, redirectExpired]);

  useEffect(() => {
    const timer = window.setTimeout(() => { void load(); }, 0);
    return () => window.clearTimeout(timer);
    // The initial request is intentionally keyed to the authenticated page mount only.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const management = access?.type === "Management";
  const validDepartmentId = access?.snapshot.departments.some(({ id }) => id === departmentId) ? departmentId : null;
  const validCategoryId = access?.snapshot.categories.some(({ id, departmentId: parentId }) => id === categoryId && parentId === validDepartmentId) ? categoryId : null;
  const selectedDepartment = access?.snapshot.departments.find(({ id }) => id === validDepartmentId);
  const selectedCategory = access?.snapshot.categories.find(({ id }) => id === validCategoryId);
  const categories = useMemo(() => access ? categoriesForDepartment(access.snapshot, validDepartmentId) : [], [access, validDepartmentId]);
  const productTypes = useMemo(() => access ? productTypesForCategory(access.snapshot, validCategoryId) : [], [access, validCategoryId]);
  const common = access ? { locale, management, onReload: load, onExpired: redirectExpired } : null;

  return <PresentationShell i18n={i18n} actor={actor}>
    <PageHeading eyebrow="Task 3.21" title={referenceText(locale, "title")} description={referenceText(locale, "intro")} />
    {access ? <StatusMessage kind={access.type === "Management" ? "info" : "warning"}>{referenceText(locale, access.type === "Management" ? "managementMode" : "readOnlyMode")}</StatusMessage> : null}
    <nav className="reference-section-nav" aria-label={referenceText(locale, "title")}><ul>{CATALOG_REFERENCE_SECTIONS.map((item) => <li key={item}><Link className={section === item ? "is-current" : ""} aria-current={section === item ? "page" : undefined} href={item === "hierarchy" ? "/catalog/reference-data" : `/catalog/reference-data?section=${item}`}>{referenceText(locale, sectionLabels[item])}</Link></li>)}</ul></nav>
    {loading ? <div className="skeleton-list reference-loading" aria-label={referenceText(locale, "loading")}><span /><span /><span /></div> : null}
    {refreshing ? <StatusMessage kind="info">{referenceText(locale, "refreshing")}</StatusMessage> : null}
    {failure ? <StatusMessage kind="error">{loadFailureText(locale, failure)} <button type="button" className="text-button" onClick={() => void load()}>{referenceText(locale, "retry")}</button></StatusMessage> : null}
    {access && common ? <Card className="reference-workspace">
      {section === "hierarchy" ? <div className="reference-hierarchy">
        <DynamicReferenceManager {...common} kind="departments" titleKey="departments" records={access.snapshot.departments} selectedId={validDepartmentId} onSelect={(id) => { setDepartmentId(id); setCategoryId(null); }} />
        <DynamicReferenceManager {...common} kind="categories" titleKey="categories" records={categories} parent={{ key: "departmentId", id: validDepartmentId, label: selectedDepartment?.displayName ?? null, active: selectedDepartment?.status === "Active" }} selectedId={validCategoryId} onSelect={setCategoryId} />
        <DynamicReferenceManager {...common} kind="product-types" titleKey="productTypes" records={productTypes} parent={{ key: "categoryId", id: validCategoryId, label: selectedCategory?.displayName ?? null, active: selectedCategory?.status === "Active" }} />
      </div> : null}
      {section === "brands" ? <DynamicReferenceManager {...common} kind="brands" titleKey="brands" records={access.snapshot.brands} /> : null}
      {section === "supply-statuses" ? <DynamicReferenceManager {...common} kind="supply-statuses" titleKey="supplyStatuses" records={access.snapshot.supplyStatuses} /> : null}
      {section === "device-classes" ? <DeviceClasses access={access} locale={locale} /> : null}
      {section === "conditions" ? <FixedRegistryManager {...common} type="conditions" snapshot={access.snapshot} /> : null}
      {section === "currencies" ? <FixedRegistryManager {...common} type="currencies" snapshot={access.snapshot} /> : null}
      {section === "specification-definitions" ? <DynamicReferenceManager {...common} kind="specification-definitions" titleKey="specificationDefinitions" records={access.snapshot.specificationDefinitions} definitions /> : null}
      {section === "specification-templates" ? <SpecificationTemplateManager {...common} snapshot={access.snapshot} /> : null}
    </Card> : null}
  </PresentationShell>;
};

export const CatalogReferenceDataManagementPage = () => <ProtectedPage>{(actor) => <ReferenceDataContent actor={actor} />}</ProtectedPage>;
