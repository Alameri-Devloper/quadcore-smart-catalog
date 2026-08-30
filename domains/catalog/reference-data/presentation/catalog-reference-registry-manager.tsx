"use client";

import { useMemo, useState } from "react";
import { AsyncButton, FormField, StatusMessage } from "../../../identity/presentation/components/presentation-shell";
import { catalogReferenceDataManagementClient } from "./catalog-reference-data-management.client";
import { dirtyRegistryValues, mergeRegistryAvailability } from "./catalog-reference-data-management.coordinator";
import { referenceText, type ReferenceLocale } from "./catalog-reference-data-management.i18n";
import type { CatalogReferenceApiFailure, CatalogReferenceManagementSnapshot, RegistryAvailabilityView } from "./catalog-reference-data-management.types";

interface Props {
  readonly type: "conditions" | "currencies";
  readonly snapshot: CatalogReferenceManagementSnapshot;
  readonly management: boolean;
  readonly locale: ReferenceLocale;
  readonly onReload: () => Promise<void>;
  readonly onExpired: () => void;
}

const failureText = (locale: ReferenceLocale, failure: CatalogReferenceApiFailure) => {
  if (failure === "InvalidInput") return referenceText(locale, "invalidInput");
  if (failure === "ForbiddenForRestrictedSession") return referenceText(locale, "restricted");
  if (failure === "Forbidden" || failure === "OriginNotAllowed") return referenceText(locale, failure === "OriginNotAllowed" ? "originDenied" : "forbidden");
  return referenceText(locale, "unavailable");
};

export const FixedRegistryManager = ({ type, snapshot, management, locale, onReload, onExpired }: Props) => {
  const registry = type === "conditions" ? snapshot.conditionRegistry : snapshot.currencyRegistry;
  const configured = type === "conditions" ? snapshot.conditions : snapshot.currencies;
  const merged = useMemo(() => mergeRegistryAvailability(registry, configured), [configured, registry]);
  const [draft, setDraft] = useState<ReadonlyMap<string, RegistryAvailabilityView>>(new Map());
  const [dirty, setDirty] = useState<ReadonlySet<string>>(new Set());
  const [search, setSearch] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ readonly kind: "success" | "error" | "info"; readonly text: string } | null>(null);

  const rows = merged.filter((row) => (management || row.enabled) && (type !== "currencies" || row.code.includes(search.trim().toUpperCase())));
  const update = (code: string, patch: Partial<RegistryAvailabilityView>) => {
    const current = draft.get(code) ?? merged.find((row) => row.code === code);
    if (!current) return;
    setDraft(new Map(draft).set(code, { code, enabled: patch.enabled ?? current.enabled, sortOrder: patch.sortOrder ?? current.sortOrder }));
    setDirty(new Set(dirty).add(code)); setMessage(null);
  };
  const save = async () => {
    const values = dirtyRegistryValues(draft, dirty);
    if (values.length === 0) { setMessage({ kind: "info", text: referenceText(locale, "noChangedRows") }); return; }
    setSubmitting(true); setMessage(null);
    const result = type === "conditions"
      ? await catalogReferenceDataManagementClient.configureConditions(values)
      : await catalogReferenceDataManagementClient.configureCurrencies(values);
    setSubmitting(false);
    if (!result.ok) {
      if (result.kind === "AuthenticationRequired") { onExpired(); return; }
      setMessage({ kind: "error", text: failureText(locale, result.kind) }); return;
    }
    setDirty(new Set()); setDraft(new Map()); setMessage({ kind: "success", text: referenceText(locale, "saved") }); await onReload();
  };

  return <section className="reference-manager" aria-labelledby={`${type}-heading`}>
    <div className="reference-manager__heading"><div><h2 id={`${type}-heading`}>{referenceText(locale, type)}</h2><p>{referenceText(locale, "fixedRegistryHint")}</p></div></div>
    {type === "currencies" ? <FormField id="currency-search" label={referenceText(locale, "searchCurrency")}><input id="currency-search" type="search" dir="ltr" value={search} onChange={(event) => setSearch(event.target.value)} /></FormField> : null}
    {message ? <StatusMessage kind={message.kind}>{message.text}</StatusMessage> : null}
    <div className="registry-list">
      {rows.map((row) => {
        const current = draft.get(row.code) ?? row;
        const localized = type === "conditions" ? snapshot.conditionRegistry.find(({ code }) => code === row.code)?.labels[locale] : null;
        const digits = type === "currencies" ? snapshot.currencyRegistry.find(({ code }) => code === row.code)?.minorUnitDigits : undefined;
        return <article className="registry-row" key={row.code}>
          <div className="registry-row__identity"><strong dir={type === "currencies" ? "ltr" : "auto"}>{localized ?? row.code}</strong><code dir="ltr">{row.code}</code></div>
          <span className={`badge ${current.enabled ? "badge--active" : "badge--suspended"}`}>{referenceText(locale, current.enabled ? "enabled" : "disabled")}</span>
          {digits !== undefined ? <dl><dt>{referenceText(locale, "minorUnit")}</dt><dd dir="ltr">{digits === null ? referenceText(locale, "notApplicable") : digits}</dd></dl> : null}
          {management ? <div className="registry-row__controls"><label className="checkbox-row"><input type="checkbox" checked={current.enabled} onChange={(event) => update(row.code, { enabled: event.target.checked })} /><span>{referenceText(locale, current.enabled ? "enabled" : "disabled")}</span></label><FormField id={`${type}-${row.code}-order`} label={`${referenceText(locale, "sortOrder")} — ${row.code}`}><input id={`${type}-${row.code}-order`} type="number" min={0} max={1000000} step={1} value={current.sortOrder} onChange={(event) => update(row.code, { sortOrder: Number(event.target.value) })} /></FormField></div> : null}
        </article>;
      })}
    </div>
    {management ? <AsyncButton type="button" submitting={submitting} disabled={dirty.size === 0} onClick={() => void save()}>{submitting ? referenceText(locale, "saving") : referenceText(locale, "saveChanges")}</AsyncButton> : null}
  </section>;
};
