"use client";

import { useMemo, useRef, useState } from "react";
import { AsyncButton, FormField, StatusMessage } from "../../../identity/presentation/components/presentation-shell";
import { catalogReferenceDataManagementClient } from "./catalog-reference-data-management.client";
import { beginTemplateConflictReview, completeTemplateConflictReview, resolveTemplateVisibilityConflict, templateHasInactiveEntries, templateMutationInput, type TemplateConflictReview } from "./catalog-reference-data-management.coordinator";
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
  const [conflictReview, setConflictReview] = useState<TemplateConflictReview | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const saveGate = useRef(false);
  const [message, setMessage] = useState<{ readonly kind: "success" | "warning" | "error"; readonly text: string } | null>(null);
  const activeDefinitions = snapshot.specificationDefinitions.filter(({ status }) => status === "Active");

  const definitionsById = useMemo(() => new Map(snapshot.specificationDefinitions.map((item) => [item.id, item])), [snapshot.specificationDefinitions]);
  const selectable = activeDefinitions.filter(({ id }) => !entries.some(({ specificationDefinitionId }) => specificationDefinitionId === id));
  const invalidHistorical = templateHasInactiveEntries(entries, snapshot.specificationDefinitions);
  const add = () => {
    if (!management || submitting || conflict || !definitionId || entries.some((entry) => entry.specificationDefinitionId === definitionId)) return;
    setEntries([...entries, { specificationDefinitionId: definitionId, sortOrder: entries.length, required: false, publicVisibility: "internal" }]); setDefinitionId(""); setMessage(null);
  };
  const replaceEntry = (index: number, patch: Partial<SpecificationTemplateEntryView>) => setEntries(entries.map((entry, position) => position === index ? { ...entry, ...patch } : entry));
  const reloadConflict = async () => {
    setConflictReview(null);
    const latest = await catalogReferenceDataManagementClient.load(true);
    if (!latest.ok) {
      if (latest.kind === "AuthenticationRequired") onExpired();
      setMessage({ kind: "error", text: referenceText(locale, "unavailable") });
      return;
    }
    setConflictReview(beginTemplateConflictReview(entries, latest.value.specificationTemplates.find((item) => item.productTypeId === productTypeId) ?? null));
    setMessage({ kind: "warning", text: referenceText(locale, "conflict") });
    await onReload();
  };
  const save = async () => {
    if (!management || saveGate.current || conflict || invalidHistorical || !productTypeId) return;
    saveGate.current = true;
    setSubmitting(true); setMessage(null);
    try {
    const result = await catalogReferenceDataManagementClient.configureTemplate(productTypeId, templateMutationInput(entries, expectedVersion));
    if (!result.ok) {
      if (result.kind === "AuthenticationRequired") { onExpired(); return; }
      if (result.kind === "Conflict") { setConflict(true); await reloadConflict(); return; }
      setMessage({ kind: "error", text: referenceText(locale, result.kind === "InvalidInput" ? "invalidInput" : result.kind === "NotFound" ? "notFound" : "unavailable") });
      if (result.kind === "NotFound") await onReload();
      return;
    }
    setConflict(false); setConflictReview(null); setExpectedVersion(result.value.version); setEntries(result.value.entries); setMessage({ kind: "success", text: referenceText(locale, "saved") }); await onReload();
    } finally { saveGate.current = false; setSubmitting(false); }
  };
  const retryConflict = async () => {
    if (saveGate.current) return;
    saveGate.current = true; setSubmitting(true);
    try { await reloadConflict(); } finally { saveGate.current = false; setSubmitting(false); }
  };
  const reviewCurrent = () => {
    if (submitting || !conflictReview) return;
    const completed = completeTemplateConflictReview(conflictReview);
    if (!completed) return;
    setExpectedVersion(completed.expectedVersion); setConflict(false); setConflictReview(null); setMessage({ kind: "warning", text: referenceText(locale, "currentVersionReady") });
  };
  const decideVisibility = (id: string, decision: "latest" | "draft") => {
    if (submitting || !conflictReview) return;
    const resolved = resolveTemplateVisibilityConflict(entries, conflictReview, id, decision);
    setEntries(resolved.entries); setConflictReview(resolved.review);
    const completed = completeTemplateConflictReview(resolved.review);
    if (completed) { setExpectedVersion(completed.expectedVersion); setConflict(false); setConflictReview(null); setMessage({ kind: "warning", text: referenceText(locale, "currentVersionReady") }); }
  };

  return <section className="reference-manager" aria-labelledby="templates-heading">
    <div className="reference-manager__heading"><h2 id="templates-heading">{referenceText(locale, "specificationTemplates")}</h2></div>
    <StatusMessage kind="warning">{referenceText(locale, "templateWarning")}</StatusMessage>
    <FormField id="template-product-type" label={referenceText(locale, "selectProductType")}><select id="template-product-type" value={productTypeId} disabled={submitting} onChange={(event) => { const nextId = event.target.value; const nextTemplate = snapshot.specificationTemplates.find((item) => item.productTypeId === nextId); setProductTypeId(nextId); setEntries(nextTemplate?.entries ?? []); setExpectedVersion(nextTemplate?.version ?? null); setConflict(false); setConflictReview(null); setMessage(null); }}><option value="">—</option>{productTypes.map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.code})</option>)}</select></FormField>
    {!productTypeId ? <div className="empty-state"><strong>{referenceText(locale, "chooseProductType")}</strong></div> : null}
    {productTypeId ? <>
      {message ? <StatusMessage kind={message.kind}>{message.text}{conflict ? <> <button className="text-button" type="button" disabled={submitting || !conflictReview || conflictReview.conflicts.some(({ decision }) => decision === null)} onClick={reviewCurrent}>{referenceText(locale, "reviewCurrent")}</button>{!conflictReview ? <button className="text-button" type="button" disabled={submitting} onClick={() => void retryConflict()}>{referenceText(locale, "retry")}</button> : null}</> : null}</StatusMessage> : null}
      {entries.length === 0 ? <div className="empty-state"><strong>{referenceText(locale, "noTemplateEntries")}</strong></div> : <div className="template-entry-list">{entries.map((entry, index) => {
        const definition = definitionsById.get(entry.specificationDefinitionId); const inactive = definition?.status !== "Active";
        const visibilityId = `template-visibility-${encodeURIComponent(productTypeId)}-${encodeURIComponent(entry.specificationDefinitionId)}`;
        const visibilityConflict = conflictReview?.conflicts.find((item) => item.specificationDefinitionId === entry.specificationDefinitionId);
        return <article className={`template-entry${inactive ? " template-entry--historical" : ""}`} key={entry.specificationDefinitionId}>
          <div><strong dir="auto">{definition?.displayName ?? entry.specificationDefinitionId}</strong><code dir="ltr">{definition?.code ?? entry.specificationDefinitionId}</code>{inactive ? <span className="badge badge--warning">{referenceText(locale, "historicalDefinition")}</span> : null}</div>
          {management ? <><FormField id={`template-order-${index}`} label={`${referenceText(locale, "sortOrder")} — ${definition?.displayName ?? index + 1}`}><input id={`template-order-${index}`} type="number" min={0} max={1000000} step={1} value={entry.sortOrder} disabled={submitting || conflict} onChange={(event) => replaceEntry(index, { sortOrder: Number(event.target.value) })} /></FormField><label className="checkbox-row"><input type="checkbox" checked={entry.required} disabled={submitting || conflict} onChange={(event) => replaceEntry(index, { required: event.target.checked })} />{referenceText(locale, "required")}</label>
            <FormField id={visibilityId} label={`${referenceText(locale, "publicVisibility")} — ${definition?.displayName ?? entry.specificationDefinitionId}`} hint={referenceText(locale, "visibilityHelp")}><select id={visibilityId} aria-describedby={`${visibilityId}-hint`} value={entry.publicVisibility} disabled={submitting || conflict} onChange={(event) => { const value = event.target.value; if (value === "internal" || value === "public") replaceEntry(index, { publicVisibility: value }); }}><option value="internal">{referenceText(locale, "visibilityInternal")}</option><option value="public">{referenceText(locale, "visibilityPublic")}</option></select></FormField>
            <button className="button button--secondary button--small" type="button" disabled={submitting || conflict} onClick={() => setEntries(entries.filter((_, position) => position !== index))}>{referenceText(locale, "removeEntry")}</button></> : <dl className="labeled-value"><dt>{referenceText(locale, "publicVisibility")}</dt><dd>{referenceText(locale, entry.publicVisibility === "public" ? "visibilityPublic" : "visibilityInternal")}</dd></dl>}
          {visibilityConflict ? <div className="template-visibility-conflict" role="group" aria-label={`${referenceText(locale, "visibilityConflict")} — ${definition?.displayName ?? entry.specificationDefinitionId}`}>
            <p>{referenceText(locale, "visibilityConflict")}</p><p>{referenceText(locale, "draftVisibility")}: {referenceText(locale, visibilityConflict.draftVisibility === "public" ? "visibilityPublic" : "visibilityInternal")} · {referenceText(locale, "latestVisibility")}: {referenceText(locale, visibilityConflict.latestVisibility === "public" ? "visibilityPublic" : "visibilityInternal")}</p>
            {visibilityConflict.decision === null ? <div className="template-visibility-conflict__actions"><button type="button" className="button button--secondary" disabled={submitting} onClick={() => decideVisibility(entry.specificationDefinitionId, "latest")}>{referenceText(locale, "useLatestVisibility")}</button><button type="button" className="button button--secondary" disabled={submitting} onClick={() => decideVisibility(entry.specificationDefinitionId, "draft")}>{referenceText(locale, "keepDraftVisibility")}</button></div> : <p>{referenceText(locale, "visibilityResolved")}</p>}
          </div> : null}
        </article>;
      })}</div>}
      {management ? <div className="template-add"><FormField id="template-definition" label={referenceText(locale, "addDefinition")}><select id="template-definition" value={definitionId} disabled={submitting || conflict} onChange={(event) => setDefinitionId(event.target.value)}><option value="">—</option>{selectable.map((item) => <option key={item.id} value={item.id}>{item.displayName} ({item.code})</option>)}</select></FormField><button className="button button--secondary" type="button" disabled={!definitionId || submitting || conflict} onClick={add}>{referenceText(locale, "addDefinition")}</button></div> : null}
      {invalidHistorical ? <StatusMessage kind="error">{referenceText(locale, "inactiveTemplateError")}</StatusMessage> : null}
      {management ? <AsyncButton type="button" submitting={submitting} disabled={invalidHistorical || conflict} onClick={() => void save()}>{submitting ? referenceText(locale, "saving") : referenceText(locale, "save")}</AsyncButton> : null}
    </> : null}
  </section>;
};
