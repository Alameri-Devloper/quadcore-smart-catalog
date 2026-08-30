"use client";

import { useMemo, useState } from "react";
import { AsyncButton, FormField, StatusMessage } from "../../../identity/presentation/components/presentation-shell";
import { catalogReferenceDataManagementClient } from "./catalog-reference-data-management.client";
import { templateHasInactiveEntries, templateMutationInput } from "./catalog-reference-data-management.coordinator";
import { referenceText, type ReferenceLocale } from "./catalog-reference-data-management.i18n";
import type { CatalogReferenceManagementSnapshot, SpecificationTemplateEntryView } from "./catalog-reference-data-management.types";

interface Props {
  readonly snapshot: CatalogReferenceManagementSnapshot;
  readonly management: boolean;
  readonly locale: ReferenceLocale;
  readonly onReload: () => Promise<void>;
  readonly onExpired: () => void;
}

export const SpecificationTemplateManager = ({ snapshot, management, locale, onReload, onExpired }: Props) => {
  const productTypes = snapshot.productTypes.filter(({ status }) => status === "Active");
  const [productTypeId, setProductTypeId] = useState("");
  const [entries, setEntries] = useState<readonly SpecificationTemplateEntryView[]>([]);
  const [expectedVersion, setExpectedVersion] = useState<number | null>(null);
  const [definitionId, setDefinitionId] = useState("");
  const [conflict, setConflict] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ readonly kind: "success" | "warning" | "error"; readonly text: string } | null>(null);
  const activeDefinitions = snapshot.specificationDefinitions.filter(({ status }) => status === "Active");

  const definitionsById = useMemo(() => new Map(snapshot.specificationDefinitions.map((item) => [item.id, item])), [snapshot.specificationDefinitions]);
  const selectable = activeDefinitions.filter(({ id }) => !entries.some(({ specificationDefinitionId }) => specificationDefinitionId === id));
  const invalidHistorical = templateHasInactiveEntries(entries, snapshot.specificationDefinitions);
  const add = () => {
    if (!definitionId || entries.some((entry) => entry.specificationDefinitionId === definitionId)) return;
    setEntries([...entries, { specificationDefinitionId: definitionId, sortOrder: entries.length, required: false }]); setDefinitionId(""); setMessage(null);
  };
  const replaceEntry = (index: number, patch: Partial<SpecificationTemplateEntryView>) => setEntries(entries.map((entry, position) => position === index ? { ...entry, ...patch } : entry));
  const save = async () => {
    setSubmitting(true); setMessage(null);
    const result = await catalogReferenceDataManagementClient.configureTemplate(productTypeId, templateMutationInput(entries, expectedVersion));
    setSubmitting(false);
    if (!result.ok) {
      if (result.kind === "AuthenticationRequired") { onExpired(); return; }
      if (result.kind === "Conflict") { setConflict(true); setMessage({ kind: "warning", text: referenceText(locale, "conflict") }); await onReload(); return; }
      setMessage({ kind: "error", text: referenceText(locale, result.kind === "InvalidInput" ? "invalidInput" : result.kind === "NotFound" ? "notFound" : "unavailable") });
      if (result.kind === "NotFound") await onReload();
      return;
    }
    setConflict(false); setExpectedVersion(result.value.version); setEntries(result.value.entries); setMessage({ kind: "success", text: referenceText(locale, "saved") }); await onReload();
  };
  const reviewCurrent = () => {
    const latest = snapshot.specificationTemplates.find((item) => item.productTypeId === productTypeId);
    setExpectedVersion(latest?.version ?? null); setConflict(false); setMessage({ kind: "warning", text: referenceText(locale, "currentVersionReady") });
  };

  return <section className="reference-manager" aria-labelledby="templates-heading">
    <div className="reference-manager__heading"><h2 id="templates-heading">{referenceText(locale, "specificationTemplates")}</h2></div>
    <StatusMessage kind="warning">{referenceText(locale, "templateWarning")}</StatusMessage>
    <FormField id="template-product-type" label={referenceText(locale, "selectProductType")}><select id="template-product-type" value={productTypeId} onChange={(event) => { const nextId = event.target.value; const nextTemplate = snapshot.specificationTemplates.find((item) => item.productTypeId === nextId); setProductTypeId(nextId); setEntries(nextTemplate?.entries ?? []); setExpectedVersion(nextTemplate?.version ?? null); setConflict(false); setMessage(null); }}><option value="">—</option>{productTypes.map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.code})</option>)}</select></FormField>
    {!productTypeId ? <div className="empty-state"><strong>{referenceText(locale, "chooseProductType")}</strong></div> : null}
    {productTypeId ? <>
      {message ? <StatusMessage kind={message.kind}>{message.text}{conflict ? <> <button className="text-button" type="button" onClick={reviewCurrent}>{referenceText(locale, "reviewCurrent")}</button></> : null}</StatusMessage> : null}
      {entries.length === 0 ? <div className="empty-state"><strong>{referenceText(locale, "noTemplateEntries")}</strong></div> : <div className="template-entry-list">{entries.map((entry, index) => {
        const definition = definitionsById.get(entry.specificationDefinitionId); const inactive = definition?.status !== "Active";
        return <article className={`template-entry${inactive ? " template-entry--historical" : ""}`} key={entry.specificationDefinitionId}>
          <div><strong dir="auto">{definition?.displayName ?? entry.specificationDefinitionId}</strong><code dir="ltr">{definition?.code ?? entry.specificationDefinitionId}</code>{inactive ? <span className="badge badge--warning">{referenceText(locale, "historicalDefinition")}</span> : null}</div>
          {management ? <><FormField id={`template-order-${index}`} label={`${referenceText(locale, "sortOrder")} — ${definition?.displayName ?? index + 1}`}><input id={`template-order-${index}`} type="number" min={0} max={1000000} step={1} value={entry.sortOrder} onChange={(event) => replaceEntry(index, { sortOrder: Number(event.target.value) })} /></FormField><label className="checkbox-row"><input type="checkbox" checked={entry.required} onChange={(event) => replaceEntry(index, { required: event.target.checked })} />{referenceText(locale, "required")}</label><button className="button button--secondary button--small" type="button" onClick={() => setEntries(entries.filter((_, position) => position !== index))}>{referenceText(locale, "removeEntry")}</button></> : null}
        </article>;
      })}</div>}
      {management ? <div className="template-add"><FormField id="template-definition" label={referenceText(locale, "addDefinition")}><select id="template-definition" value={definitionId} onChange={(event) => setDefinitionId(event.target.value)}><option value="">—</option>{selectable.map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.code})</option>)}</select></FormField><button className="button button--secondary" type="button" disabled={!definitionId} onClick={add}>{referenceText(locale, "addDefinition")}</button></div> : null}
      {invalidHistorical ? <StatusMessage kind="error">{referenceText(locale, "inactiveTemplateError")}</StatusMessage> : null}
      {management ? <AsyncButton type="button" submitting={submitting} disabled={invalidHistorical || conflict} onClick={() => void save()}>{submitting ? referenceText(locale, "saving") : referenceText(locale, "save")}</AsyncButton> : null}
    </> : null}
  </section>;
};
