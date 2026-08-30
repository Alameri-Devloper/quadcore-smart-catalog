"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AsyncButton, FormField, StatusMessage, formSubmit } from "../../../identity/presentation/components/presentation-shell";
import { catalogReferenceDataManagementClient } from "./catalog-reference-data-management.client";
import { chooseDeactivationFocusTarget, resolveDynamicMutationFailure, type DynamicConflictRecovery, type DynamicMutationOperation } from "./catalog-reference-dynamic-manager.behavior";
import { deactivationCopy, referenceText, type ReferenceLocale, type ReferenceTextKey } from "./catalog-reference-data-management.i18n";
import type { CatalogReferenceApiFailure, CreateDynamicReferenceInput, DynamicReferenceKind, DynamicReferenceView, SpecificationDefinitionView, SpecificationValueTypeView } from "./catalog-reference-data-management.types";

interface DynamicManagerProps {
  readonly kind: DynamicReferenceKind;
  readonly titleKey: ReferenceTextKey;
  readonly records: readonly DynamicReferenceView[];
  readonly locale: ReferenceLocale;
  readonly management: boolean;
  readonly parent?: { readonly key: "departmentId" | "categoryId"; readonly id: string | null; readonly label: string | null; readonly active: boolean };
  readonly selectedId?: string | null;
  readonly onSelect?: (id: string) => void;
  readonly onReload: () => Promise<void>;
  readonly onExpired: () => void;
  readonly definitions?: boolean;
}

interface Draft {
  readonly mode: "create" | "edit";
  readonly id: string | null;
  readonly code: string;
  readonly displayName: string;
  readonly sortOrder: number;
  readonly expectedVersion: number | null;
  readonly valueType: SpecificationValueTypeView;
  readonly unit: string;
}

const newDraft = (): Draft => ({ mode: "create", id: null, code: "", displayName: "", sortOrder: 0, expectedVersion: null, valueType: "Text", unit: "" });
const editDraft = (record: DynamicReferenceView, definitions: boolean): Draft => ({
  mode: "edit", id: record.id, code: record.code, displayName: record.displayName, sortOrder: record.sortOrder,
  expectedVersion: record.version,
  valueType: definitions ? (record as SpecificationDefinitionView).valueType : "Text",
  unit: definitions ? ((record as SpecificationDefinitionView).unit ?? "") : "",
});
const editActionId = (kind: DynamicReferenceKind, recordId: string): string => `${kind}-${recordId}-edit-action`;
const statusActionId = (kind: DynamicReferenceKind, recordId: string): string => `${kind}-${recordId}-status-action`;

const messageFor = (locale: ReferenceLocale, kind: CatalogReferenceApiFailure, operation: DynamicMutationOperation) => {
  if (kind === "InvalidInput") return referenceText(locale, "invalidInput");
  if (kind === "Conflict") return referenceText(locale, operation === "create" ? "duplicate" : operation === "status" ? "statusConflict" : "conflict");
  if (kind === "NotFound") return referenceText(locale, "notFound");
  if (kind === "ForbiddenForRestrictedSession") return referenceText(locale, "restricted");
  if (kind === "Forbidden" || kind === "OriginNotAllowed") return referenceText(locale, kind === "OriginNotAllowed" ? "originDenied" : "forbidden");
  return referenceText(locale, "unavailable");
};

export const DynamicReferenceManager = ({ kind, titleKey, records, locale, management, parent, selectedId, onSelect, onReload, onExpired, definitions = false }: DynamicManagerProps) => {
  const [statusFilter, setStatusFilter] = useState<"All" | "Active" | "Inactive">("All");
  const [draft, setDraft] = useState<Draft | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState<{ readonly kind: "success" | "warning" | "error"; readonly text: string; readonly conflictRecovery?: DynamicConflictRecovery } | null>(null);
  const [confirming, setConfirming] = useState<DynamicReferenceView | null>(null);
  const managerHeading = useRef<HTMLHeadingElement>(null);
  const formHeading = useRef<HTMLHeadingElement>(null);
  const confirmationDialog = useRef<HTMLDialogElement>(null);
  const cancelConfirmation = useRef<HTMLButtonElement>(null);
  const actionOrigin = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (!confirming) return;
    const dialog = confirmationDialog.current;
    if (dialog && !dialog.open) dialog.showModal();
    cancelConfirmation.current?.focus();
  }, [confirming]);
  const focusForm = () => window.setTimeout(() => formHeading.current?.focus(), 0);

  const shown = useMemo(() => records.filter(({ status }) => statusFilter === "All" || status === statusFilter), [records, statusFilter]);
  const closeConfirmation = (recordId: string) => {
    setConfirming(null);
    window.setTimeout(() => {
      chooseDeactivationFocusTarget(
        actionOrigin.current,
        document.getElementById(statusActionId(kind, recordId)),
        document.getElementById(editActionId(kind, recordId)),
        managerHeading.current,
      )?.focus();
    }, 0);
  };
  const fail = async (kind: CatalogReferenceApiFailure, operation: DynamicMutationOperation) => {
    if (kind === "AuthenticationRequired") { onExpired(); return; }
    const policy = resolveDynamicMutationFailure(kind, operation);
    setNotice({ kind: kind === "Conflict" ? "warning" : "error", text: messageFor(locale, kind, operation), conflictRecovery: policy.conflictRecovery });
    if (policy.refreshAuthoritativeState) await onReload();
  };

  const save = async () => {
    if (!draft) return;
    setSubmitting(true); setNotice(null);
    const valueTypeFields = definitions ? { valueType: draft.valueType, unit: draft.unit.trim() || null } : {};
    const result = draft.mode === "create"
      ? await catalogReferenceDataManagementClient.create(kind, {
        code: draft.code, displayName: draft.displayName, sortOrder: draft.sortOrder, ...valueTypeFields,
        ...(parent?.key === "departmentId" && parent.id ? { departmentId: parent.id } : {}),
        ...(parent?.key === "categoryId" && parent.id ? { categoryId: parent.id } : {}),
      } satisfies CreateDynamicReferenceInput)
      : await catalogReferenceDataManagementClient.update(kind, draft.id!, {
        expectedVersion: draft.expectedVersion!, displayName: draft.displayName, sortOrder: draft.sortOrder, ...valueTypeFields,
      });
    setSubmitting(false);
    if (!result.ok) { await fail(result.kind, draft.mode); return; }
    setDraft(null); setNotice({ kind: "success", text: referenceText(locale, "saved") });
    await onReload();
  };

  const changeStatus = async (record: DynamicReferenceView, status: "Active" | "Inactive") => {
    setSubmitting(true); setNotice(null);
    const result = await catalogReferenceDataManagementClient.update(kind, record.id, { expectedVersion: record.version, status });
    setSubmitting(false);
    if (!result.ok) { await fail(result.kind, "status"); if (status === "Inactive") closeConfirmation(record.id); return; }
    setNotice({ kind: "success", text: referenceText(locale, status === "Active" ? "activated" : "deactivated") });
    await onReload();
    if (status === "Inactive") closeConfirmation(record.id);
  };

  const reviewCurrent = () => {
    if (!draft?.id) return;
    const current = records.find(({ id }) => id === draft.id);
    if (!current) return;
    setDraft({ ...draft, expectedVersion: current.version });
    setNotice({ kind: "warning", text: referenceText(locale, "currentVersionReady") });
  };

  const parentMissing = Boolean(parent && !parent.id);
  const createBlocked = parentMissing || Boolean(parent && !parent.active);
  return (
    <section className="reference-manager" aria-labelledby={`${kind}-heading`}>
      <div className="reference-manager__heading">
        <h2 ref={managerHeading} id={`${kind}-heading`} tabIndex={-1}>{referenceText(locale, titleKey)}</h2>
        {management ? <button className="button button--secondary button--small" type="button" disabled={createBlocked} title={createBlocked ? referenceText(locale, "selectParent") : undefined} onClick={() => { setDraft(newDraft()); setNotice(null); focusForm(); }}>{referenceText(locale, "createNew")}</button> : null}
      </div>
      {management ? <FormField id={`${kind}-filter`} label={referenceText(locale, "statusFilter")}>
        <select id={`${kind}-filter`} value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)}>
          <option value="All">{referenceText(locale, "all")}</option><option value="Active">{referenceText(locale, "active")}</option><option value="Inactive">{referenceText(locale, "inactive")}</option>
        </select>
      </FormField> : null}
      {parentMissing ? <p className="field-hint">{referenceText(locale, parent?.key === "departmentId" ? "selectDepartment" : "selectCategory")}</p> : null}
      {notice ? <StatusMessage kind={notice.kind}>{notice.text}{notice.conflictRecovery === "review-edit" ? <> <button className="text-button" type="button" onClick={reviewCurrent}>{referenceText(locale, "reviewCurrent")}</button></> : null}</StatusMessage> : null}
      {!parentMissing && shown.length === 0 ? <div className="empty-state"><strong>{referenceText(locale, management ? "noRecordsManager" : "noRecordsViewer")}</strong></div> : null}
      <div className="reference-records">
        {shown.map((record) => <article className={`reference-record${selectedId === record.id ? " is-selected" : ""}`} key={record.id}>
          <div className="reference-record__heading">
            <div>{onSelect ? <button className="reference-record__select" type="button" aria-pressed={selectedId === record.id} onClick={() => onSelect(record.id)}>{record.displayName}</button> : <h3>{record.displayName}</h3>}<code dir="ltr">{record.code}</code></div>
            <span className={`badge ${record.status === "Active" ? "badge--active" : "badge--suspended"}`}>{referenceText(locale, record.status === "Active" ? "active" : "inactive")}</span>
          </div>
          <dl className="reference-record__meta"><div><dt>{referenceText(locale, "sortOrder")}</dt><dd dir="ltr">{record.sortOrder}</dd></div><div><dt>{referenceText(locale, "version")}</dt><dd dir="ltr">{record.version}</dd></div>{definitions ? <><div><dt>{referenceText(locale, "valueType")}</dt><dd>{(record as SpecificationDefinitionView).valueType}</dd></div><div><dt>{referenceText(locale, "unit")}</dt><dd dir="auto">{(record as SpecificationDefinitionView).unit || "—"}</dd></div></> : null}</dl>
          {management ? <div className="reference-record__actions">
            <button id={editActionId(kind, record.id)} className="button button--secondary button--small" type="button" onClick={() => { setDraft(editDraft(record, definitions)); setNotice(null); focusForm(); }}>{referenceText(locale, "edit")}</button>
            {kind === "product-types" && record.status === "Active" ? <Link className="button button--secondary button--small" href="/catalog/reference-data?section=specification-templates">{referenceText(locale, "specificationTemplates")}</Link> : null}
            {record.status === "Active" ? <button id={statusActionId(kind, record.id)} className="button button--danger button--small" type="button" onClick={(event) => { actionOrigin.current = event.currentTarget; setConfirming(record); }}>{referenceText(locale, "deactivate")}</button>
              : <button id={statusActionId(kind, record.id)} className="button button--secondary button--small" type="button" onClick={() => void changeStatus(record, "Active")}>{referenceText(locale, "activate")}</button>}
          </div> : null}
        </article>)}
      </div>
      {definitions ? <p className="field-hint">{referenceText(locale, "definitionHistory")}</p> : null}
      {draft ? <form className="reference-form form-stack" onSubmit={formSubmit(save)}>
        <h3 ref={formHeading} tabIndex={-1}>{referenceText(locale, draft.mode === "create" ? "create" : "edit")} — {referenceText(locale, titleKey)}</h3>
        {draft.mode === "create" ? <FormField id={`${kind}-code`} label={referenceText(locale, "code")} hint={referenceText(locale, "codeHint")}><input id={`${kind}-code`} required maxLength={64} dir="ltr" value={draft.code} onChange={(event) => setDraft({ ...draft, code: event.target.value })} /></FormField> : <dl className="labeled-value"><dt>{referenceText(locale, "code")}</dt><dd><code dir="ltr">{draft.code}</code></dd></dl>}
        {parent ? <dl className="labeled-value"><dt>{referenceText(locale, "parent")}</dt><dd dir="auto">{parent.label}</dd></dl> : null}
        <FormField id={`${kind}-name`} label={referenceText(locale, "displayName")} hint={referenceText(locale, "displayNameHint")}><input id={`${kind}-name`} required maxLength={160} dir="auto" value={draft.displayName} onChange={(event) => setDraft({ ...draft, displayName: event.target.value })} /></FormField>
        <div className="order-control"><FormField id={`${kind}-order`} label={referenceText(locale, "sortOrder")}><input id={`${kind}-order`} type="number" min={0} max={1000000} step={1} required value={draft.sortOrder} onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })} /></FormField><div><button type="button" className="button button--quiet" aria-label={referenceText(locale, "decreaseOrder")} onClick={() => setDraft({ ...draft, sortOrder: Math.max(0, draft.sortOrder - 1) })}>−</button><button type="button" className="button button--quiet" aria-label={referenceText(locale, "increaseOrder")} onClick={() => setDraft({ ...draft, sortOrder: Math.min(1000000, draft.sortOrder + 1) })}>+</button></div></div>
        {definitions ? <div className="responsive-form-grid"><FormField id={`${kind}-type`} label={referenceText(locale, "valueType")}><select id={`${kind}-type`} value={draft.valueType} onChange={(event) => setDraft({ ...draft, valueType: event.target.value as SpecificationValueTypeView })}><option value="Text">Text</option><option value="Number">Number</option><option value="Boolean">Boolean</option></select></FormField><FormField id={`${kind}-unit`} label={referenceText(locale, "unit")}><input id={`${kind}-unit`} maxLength={32} dir="auto" value={draft.unit} onChange={(event) => setDraft({ ...draft, unit: event.target.value })} /></FormField></div> : null}
        <div className="reference-form__actions"><AsyncButton type="submit" submitting={submitting}>{submitting ? referenceText(locale, "saving") : referenceText(locale, "save")}</AsyncButton><button className="button button--secondary" type="button" onClick={() => setDraft(null)}>{referenceText(locale, "cancel")}</button></div>
      </form> : null}
      {confirming ? <dialog ref={confirmationDialog} className="reference-confirmation" role="alertdialog" aria-modal="true" aria-labelledby={`${kind}-confirm-heading`} onCancel={(event) => { event.preventDefault(); closeConfirmation(confirming.id); }}>
        <h3 id={`${kind}-confirm-heading`}>{referenceText(locale, "confirmDeactivate")}</h3><p>{deactivationCopy(locale, confirming.displayName, kind === "departments" || kind === "categories")}</p>
        <div className="reference-form__actions"><button className="button button--danger" type="button" disabled={submitting} onClick={() => void changeStatus(confirming, "Inactive")}>{referenceText(locale, "deactivate")}</button><button ref={cancelConfirmation} className="button button--secondary" type="button" onClick={() => closeConfirmation(confirming.id)}>{referenceText(locale, "cancel")}</button></div>
      </dialog> : null}
    </section>
  );
};
