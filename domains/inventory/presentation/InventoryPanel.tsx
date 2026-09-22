"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../identity/presentation/identity-presentation.types";
import { InventoryApiClient } from "./inventory-api.client";
import { InventoryCoordinator, initialInventoryState } from "./inventory.coordinator";
import { inventoryFailureText, inventoryText, type InventoryTextKey } from "./inventory.i18n";
import type { InventoryCapabilityHints, InventoryDraft, InventoryOperation, InventoryReadView, InventoryResource, InventoryState } from "./inventory.types";

interface InventoryActions {
  choose(operation: InventoryOperation): void;
  update(patch: Partial<InventoryDraft>): void;
  review(): void;
  cancel(): void;
  acknowledgeRetry(): void;
  submit(): void;
  reload(): void;
}
const buttonStyle = { minHeight: 44, whiteSpace: "normal" as const };
const isDetailed = (value: InventoryReadView): value is Extract<InventoryReadView, { quantities: object }> => "quantities" in value;
const operationHints = (hints: InventoryCapabilityHints): readonly InventoryOperation[] => [
  ...(hints.canReceive ? ["Receive" as const] : []), ...(hints.canIssue ? ["Issue" as const] : []),
  ...(hints.canAdjust ? ["CorrectIncrease" as const, "CorrectDecrease" as const] : []),
  ...(hints.canManageDamage ? ["MarkDamaged" as const, "RestoreDamaged" as const] : []),
];

export const InventorySummary = ({ value, locale }: { readonly value: InventoryReadView; readonly locale: Locale }) => {
  const t = (key: InventoryTextKey) => inventoryText(locale, key);
  return <dl className="inventory-summary" style={{ display: "grid", gridTemplateColumns: "minmax(8rem, auto) minmax(0, 1fr)", gap: ".5rem 1rem", margin: 0 }}>
    <dt>{t("availability")}</dt><dd>{t(value.availability)}</dd><dt>{t("unit")}</dt><dd>{t("Piece")}</dd>
    {isDetailed(value) ? <>
      {(["available", "onHand", "reserved", "damaged"] as const).map(key => <span key={key} style={{ display: "contents" }}><dt>{t(key)}</dt><dd><bdi dir="ltr">{value.quantities[key]}</bdi></dd></span>)}
      <dt>{t("revision")}</dt><dd><bdi dir="ltr">{value.revision}</bdi></dd>
      <dt>{t("updated")}</dt><dd><time dateTime={value.updatedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value.updatedAt))} <bdi dir="ltr">UTC</bdi></time></dd>
    </> : null}
  </dl>;
};

export const InventoryPanelContent = ({ state, hints, locale, resourceLabel, inspectionOnly = false, actions }: {
  readonly state: InventoryState; readonly hints: InventoryCapabilityHints; readonly locale: Locale; readonly resourceLabel: string;
  readonly inspectionOnly?: boolean; readonly actions: InventoryActions;
}) => {
  const id = useId(), heading = useRef<HTMLHeadingElement>(null), dialog = useRef<HTMLDialogElement>(null), retry = useRef<HTMLParagraphElement>(null);
  const t = (key: InventoryTextKey) => inventoryText(locale, key), detail = state.detail.type === "Ready" ? state.detail.value : null;
  const operations = inspectionOnly ? [] : operationHints(hints), reviewing = state.review !== null;
  const correction = state.operation === "CorrectIncrease" || state.operation === "CorrectDecrease";
  useEffect(() => {
    if (!reviewing) return;
    const element = dialog.current, fallback = heading.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element) return; element.showModal();
    return () => { if (element.open) element.close(); (previous?.isConnected ? previous : fallback)?.focus(); };
  }, [reviewing]);
  useEffect(() => { if (state.reviewRequired && !state.pending) retry.current?.focus(); }, [state.reviewRequired, state.pending]);
  const failure = state.failure ?? (state.detail.type === "Failed" ? state.detail.kind : null);
  const reload = state.detail.type === "Failed" && !["AuthenticationRequired", "ForbiddenForRestrictedSession", "OriginNotAllowed"].includes(state.detail.kind)
    ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.reload}>{t("retry")}</button> : null;
  return <section className="inventory-panel" aria-labelledby={`${id}-heading`} aria-busy={state.pending}
    style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", display: "grid", gap: "1rem" }}>
    <h3 id={`${id}-heading`} ref={heading} tabIndex={-1}>{t("title")}: <bdi>{resourceLabel}</bdi></h3>
    {inspectionOnly ? <p role="status">{t("inspection")}</p> : null}
    {state.detail.type === "Idle" || state.detail.type === "Loading" ? <p role="status" aria-live="polite">{t("loading")}</p> : null}
    {detail ? <InventorySummary value={detail} locale={locale} /> : null}
    {state.detail.type === "ForbiddenRead" ? <p role="status" aria-live="polite">{t("forbiddenRead")}</p> : null}
    {!reviewing && failure ? <p role="alert">{inventoryFailureText(locale, failure)}</p> : null}{!reviewing ? reload : null}
    {state.outcome ? <section aria-label={t("succeeded")}><p role="status" aria-live="polite">{t("succeeded")}</p>
      {state.outcome.balance ? <InventorySummary value={state.outcome.balance} locale={locale} />
        : state.outcome.availability ? <p>{t("availability")}: {t(state.outcome.availability)}</p> : <p>{t("mutationOnly")}</p>}
    </section> : null}
    <section aria-labelledby={`${id}-operations`}><h4 id={`${id}-operations`}>{t("operations")}</h4>
      {operations.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>{operations.map(operation => <button key={operation} type="button"
        className="button button--primary" style={buttonStyle} disabled={state.pending || reviewing} onClick={() => actions.choose(operation)}>{t(operation)}</button>)}</div>
        : <p>{t("noOperations")}</p>}
    </section>
    {state.operation && !reviewing ? <form style={{ display: "grid", gap: ".75rem", maxWidth: "32rem" }} onSubmit={event => { event.preventDefault(); actions.review(); }}>
      <h4>{t(state.operation)}</h4>
      <label htmlFor={`${id}-quantity`}>{t("quantity")}</label><input id={`${id}-quantity`} inputMode="numeric" autoComplete="off" value={state.draft.quantity}
        disabled={state.pending} onChange={event => actions.update({ quantity: event.target.value })} />
      <label htmlFor={`${id}-reason`}>{t(correction ? "reasonCode" : "optionalReason")}</label><input id={`${id}-reason`} maxLength={64} autoComplete="off"
        value={state.draft.reasonCode} disabled={state.pending} onChange={event => actions.update({ reasonCode: event.target.value })} />
      <label htmlFor={`${id}-note`}>{t("note")}</label><textarea id={`${id}-note`} maxLength={500} value={state.draft.note} disabled={state.pending}
        onChange={event => actions.update({ note: event.target.value })} />
      {state.failure === "InvalidInput" ? <p role="alert">{t("invalidDraft")}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}><button type="submit" className="button button--primary" style={buttonStyle}>{t("review")}</button>
        <button type="button" className="button button--quiet" style={buttonStyle} onClick={actions.cancel}>{t("cancel")}</button></div>
    </form> : null}
    {reviewing ? <dialog ref={dialog} aria-labelledby={`${id}-confirm`} style={{ width: "min(32rem, calc(100vw - 2rem))", maxWidth: "100%", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", overflowWrap: "anywhere", padding: "1.25rem" }}
      onCancel={event => { event.preventDefault(); if (!state.pending) actions.cancel(); }}>
      <h4 id={`${id}-confirm`}>{t("confirmTitle")}: {t(state.review!.operation)}</h4>
      <dl><dt>{t("quantity")}</dt><dd><bdi dir="ltr">{state.review!.quantity}</bdi></dd>
        {state.review!.reasonCode ? <><dt>{t("reasonCode")}</dt><dd><bdi dir="ltr">{state.review!.reasonCode}</bdi></dd></> : null}
        {state.review!.note ? <><dt>{t("note")}</dt><dd>{state.review!.note}</dd></> : null}</dl>
      {failure ? <p role="alert">{inventoryFailureText(locale, failure)}</p> : null}
      {state.reviewRequired ? <p ref={retry} tabIndex={-1}>{t("reviewRequired")}</p> : null}
      {state.pending ? <p role="status" aria-live="polite">{t("pending")}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        {state.reviewRequired ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.acknowledgeRetry}>{t("reviewed")}</button> : null}
        <button type="button" className="button button--primary" style={buttonStyle} disabled={state.pending || state.reviewRequired} onClick={actions.submit}>{t("confirm")}</button>
        <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.cancel}>{t("cancel")}</button>
      </div>
    </dialog> : null}
  </section>;
};

export const InventoryPanel = ({ resource, resourceLabel, hints, locale, lifecycle, inspectionOnly = false, onAuthenticationRequired, onResourceStale }: {
  readonly resource: InventoryResource; readonly resourceLabel: string; readonly hints: InventoryCapabilityHints; readonly locale: Locale; readonly lifecycle: object;
  readonly inspectionOnly?: boolean; readonly onAuthenticationRequired: () => void; readonly onResourceStale: () => void;
}) => {
  const { branchId, productId } = resource, key = JSON.stringify([branchId, productId, inspectionOnly, hints]);
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; key: string; state: InventoryState } | null>(null);
  const mounted = useRef<{ lifecycle: object; key: string; coordinator: InventoryCoordinator } | null>(null);
  useEffect(() => {
    const coordinator = new InventoryCoordinator(new InventoryApiClient(), { branchId, productId }, hints, {
      onChange: state => setSnapshot({ lifecycle, key, state }), onAuthenticationRequired, onResourceStale,
    }, inspectionOnly);
    mounted.current = { lifecycle, key, coordinator }; void coordinator.load();
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [lifecycle, key, branchId, productId, hints, inspectionOnly, onAuthenticationRequired, onResourceStale]);
  const state = snapshot?.lifecycle === lifecycle && snapshot.key === key ? snapshot.state : initialInventoryState();
  const current = () => mounted.current?.lifecycle === lifecycle && mounted.current.key === key ? mounted.current.coordinator : null;
  return <InventoryPanelContent key={key} state={state} hints={hints} locale={locale} resourceLabel={resourceLabel} inspectionOnly={inspectionOnly} actions={{
    choose: operation => current()?.choose(operation), update: patch => current()?.updateDraft(patch), review: () => current()?.review(), cancel: () => current()?.cancel(),
    acknowledgeRetry: () => current()?.acknowledgeRetry(), submit: () => { void current()?.submit(); }, reload: () => { void current()?.load(); },
  }} />;
};
