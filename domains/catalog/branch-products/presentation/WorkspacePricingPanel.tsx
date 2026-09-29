"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { WorkspacePricingApiClient } from "./workspace-pricing-api.client";
import { initialWorkspacePricingState, WorkspacePricingCoordinator, type WorkspacePricingSurface } from "./workspace-pricing.coordinator";
import { workspacePricingFailureText, workspacePricingFieldText, workspacePricingText } from "./workspace-pricing.i18n";
import type { WorkspaceMoneyView, WorkspacePricingField, WorkspacePricingSlot, WorkspacePricingState } from "./workspace-pricing.types";

interface WorkspacePricingActions {
  chooseSet(field: WorkspacePricingField, draft: WorkspaceMoneyView): void;
  chooseClear(field: WorkspacePricingField): void;
  cancel(): void; review(): void; submit(): void; reload(): void;
}
const buttonStyle = { minHeight: 44, whiteSpace: "normal" as const };

const SlotEditor = ({ field, slot, revision, locale, state, actions }: {
  readonly field: WorkspacePricingField; readonly slot: WorkspacePricingSlot; readonly revision: number; readonly locale: Locale;
  readonly state: WorkspacePricingState; readonly actions: WorkspacePricingActions;
}) => {
  const id = useId();
  const [amountMinor, setAmountMinor] = useState(slot.value?.amountMinor ?? "");
  const [currency, setCurrency] = useState(slot.value?.currency ?? "");
  const busy = state.pendingField !== null || state.intent !== null;
  return <article className="surface-card" aria-labelledby={`${id}-heading`} style={{ minWidth: 0, display: "grid", gap: ".75rem" }}>
    <h4 id={`${id}-heading`}>{workspacePricingFieldText(locale, field)}</h4>
    <dl><dt>{workspacePricingText(locale, slot.state)}</dt><dd>{slot.value ? <><bdi dir="ltr">{slot.value.amountMinor}</bdi> <bdi dir="ltr">{slot.value.currency}</bdi></> : "—"}</dd>
      <dt>{workspacePricingText(locale, "revision")}</dt><dd><bdi dir="ltr">{revision}</bdi></dd></dl>
    {slot.allowedActions.includes("Set") ? <form onSubmit={event => { event.preventDefault(); actions.chooseSet(field, { amountMinor, currency }); }}
      style={{ display: "grid", gap: ".5rem", minWidth: 0 }}>
      <label htmlFor={`${id}-amount`}>{workspacePricingText(locale, "amountMinor")}</label>
      <input id={`${id}-amount`} dir="ltr" inputMode="numeric" value={amountMinor} disabled={busy}
        onChange={event => setAmountMinor(event.target.value)} />
      <label htmlFor={`${id}-currency`}>{workspacePricingText(locale, "currency")}</label>
      <input id={`${id}-currency`} dir="ltr" autoCapitalize="characters" maxLength={3} value={currency} disabled={busy}
        onChange={event => setCurrency(event.target.value.toUpperCase())} />
      <button type="submit" className="button button--primary" style={buttonStyle} disabled={busy}
        aria-label={`${workspacePricingText(locale, "Set")}: ${workspacePricingFieldText(locale, field)}`}>{workspacePricingText(locale, "Set")}</button>
    </form> : null}
    {slot.allowedActions.includes("Clear") ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={busy}
      aria-label={`${workspacePricingText(locale, "Clear")}: ${workspacePricingFieldText(locale, field)}`}
      onClick={() => actions.chooseClear(field)}>{workspacePricingText(locale, "Clear")}</button> : null}
    {!slot.allowedActions.length ? <p>{workspacePricingText(locale, "noActions")}</p> : null}
  </article>;
};

export const WorkspacePricingPanelContent = ({ state, locale, productLabel, surface, actions }: {
  readonly state: WorkspacePricingState; readonly locale: Locale; readonly productLabel: string; readonly surface: WorkspacePricingSurface;
  readonly actions: WorkspacePricingActions;
}) => {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), review = useRef<HTMLParagraphElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const value = state.detail.type === "Ready" ? state.detail.value : null;
  const failure = state.detail.type === "Failed" ? state.detail.kind : state.failure;
  const intent = state.intent;
  const currentSlot = value && intent ? intent.field === "Retail" ? value.retail : intent.field === "Wholesale" ? value.wholesale : value.referenceCost : null;
  const canConfirm = Boolean(intent && currentSlot?.allowedActions.includes(intent.action) && !state.pendingField && !state.reviewRequired);
  useEffect(() => {
    if (!intent) return;
    const element = dialog.current, fallback = heading.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { if (element?.open) element.close(); (previous?.isConnected ? previous : fallback)?.focus(); };
  }, [intent]);
  useEffect(() => { if (state.reviewRequired && !state.pendingField) review.current?.focus(); }, [state.reviewRequired, state.pendingField]);
  const retry = state.detail.type === "Failed" && !["AuthenticationRequired", "ForbiddenForRestrictedSession", "OriginNotAllowed"].includes(state.detail.kind)
    ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pendingField !== null} onClick={actions.reload}>{workspacePricingText(locale, "retry")}</button> : null;
  return <section aria-labelledby={`${id}-heading`} aria-busy={state.pendingField !== null}
    style={{ minWidth: 0, maxWidth: "100%", display: "grid", gap: "1rem", overflowWrap: "anywhere" }}>
    <h3 id={`${id}-heading`} ref={heading} tabIndex={-1}>{workspacePricingText(locale, surface === "prices" ? "pricesTitle" : "referenceCostTitle")}: <bdi>{productLabel}</bdi></h3>
    {state.detail.type === "Idle" || state.detail.type === "Loading" ? <p role="status" aria-live="polite">{workspacePricingText(locale, "loading")}</p> : null}
    {!intent && failure ? <p role="alert">{workspacePricingFailureText(locale, failure)}</p> : null}{!intent ? retry : null}
    {state.validation ? <p role="alert">{workspacePricingText(locale, state.validation === "Amount" ? "invalidAmount" : "invalidCurrency")}</p> : null}
    {state.savedField ? <p role="status" aria-live="polite">{workspacePricingText(locale,
      state.detail.type === "Ready" ? "saved" : state.detail.type === "Failed" ? "savedRefreshFailed" : "saving")}</p> : null}
    {value ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "1rem", minWidth: 0 }}>
      {surface === "prices" && value.retail ? <SlotEditor field="Retail" slot={value.retail} revision={value.productRevision} locale={locale} state={state} actions={actions} /> : null}
      {surface === "prices" && value.wholesale ? <SlotEditor field="Wholesale" slot={value.wholesale} revision={value.productRevision} locale={locale} state={state} actions={actions} /> : null}
      {surface === "reference-cost" && value.referenceCost ? <SlotEditor field="ReferenceCost" slot={value.referenceCost}
        revision={value.referenceCost.referenceCostRevision} locale={locale} state={state} actions={actions} /> : null}
    </div> : null}
    {intent ? <dialog ref={dialog} aria-labelledby={`${id}-confirm`} style={{ width: "min(34rem, calc(100vw - 2rem))", maxWidth: "100%", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", padding: "1.25rem" }}
      onCancel={event => { event.preventDefault(); if (!state.pendingField) actions.cancel(); }}>
      <h4 id={`${id}-confirm`}>{workspacePricingText(locale, "confirmTitle")}</h4>
      <dl><dt>{workspacePricingText(locale, "product")}</dt><dd><bdi>{productLabel}</bdi></dd>
        <dt>{workspacePricingText(locale, "field")}</dt><dd>{workspacePricingFieldText(locale, intent.field)}</dd>
        <dt>{workspacePricingText(locale, "action")}</dt><dd>{workspacePricingText(locale, intent.action)}</dd>
        {intent.action === "Set" ? <><dt>{workspacePricingText(locale, "amountMinor")}</dt><dd><bdi dir="ltr">{intent.amountMinor}</bdi></dd>
          <dt>{workspacePricingText(locale, "currency")}</dt><dd><bdi dir="ltr">{intent.currency}</bdi></dd></> : null}</dl>
      {failure ? <p role="alert">{workspacePricingFailureText(locale, failure)}</p> : null}
      {state.reviewRequired ? <p ref={review} tabIndex={-1}>{workspacePricingText(locale, "reviewRequired")}</p> : null}
      {state.pendingField ? <p role="status" aria-live="polite">{workspacePricingText(locale, "saving")}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        {state.reviewRequired && currentSlot?.allowedActions.includes(intent.action) ? <button type="button" className="button button--quiet" style={buttonStyle}
          disabled={state.pendingField !== null} onClick={actions.review}>{workspacePricingText(locale, "reviewed")}</button> : null}
        {currentSlot?.allowedActions.includes(intent.action) ? <button type="button" className="button button--primary" style={buttonStyle}
          disabled={!canConfirm} onClick={actions.submit}>{workspacePricingText(locale, "confirm")}</button> : null}
        <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pendingField !== null}
          onClick={actions.cancel}>{workspacePricingText(locale, "cancel")}</button>
      </div>
    </dialog> : null}
  </section>;
};

export const WorkspacePricingPanel = ({ productId, productLabel, surface, locale, lifecycle, onAuthenticationRequired, onProductStale }: {
  readonly productId: string; readonly productLabel: string; readonly surface: WorkspacePricingSurface; readonly locale: Locale; readonly lifecycle: object;
  readonly onAuthenticationRequired: () => void; readonly onProductStale: () => void;
}) => {
  const key = JSON.stringify([productId, surface]);
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; key: string; state: WorkspacePricingState } | null>(null);
  const mounted = useRef<{ lifecycle: object; key: string; coordinator: WorkspacePricingCoordinator } | null>(null);
  useEffect(() => {
    const coordinator = new WorkspacePricingCoordinator(new WorkspacePricingApiClient(), productId, surface, {
      onChange: state => setSnapshot({ lifecycle, key, state }), onAuthenticationRequired, onProductStale,
    });
    mounted.current = { lifecycle, key, coordinator }; void coordinator.load();
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [lifecycle, key, productId, surface, onAuthenticationRequired, onProductStale]);
  const state = snapshot?.lifecycle === lifecycle && snapshot.key === key ? snapshot.state : initialWorkspacePricingState();
  const current = () => mounted.current?.lifecycle === lifecycle && mounted.current.key === key ? mounted.current.coordinator : null;
  return <WorkspacePricingPanelContent key={key} state={state} locale={locale} productLabel={productLabel} surface={surface} actions={{
    chooseSet: (field, draft) => current()?.choose(field, "Set", draft), chooseClear: field => current()?.choose(field, "Clear"),
    cancel: () => current()?.cancel(), review: () => current()?.reviewLatest(), submit: () => { void current()?.submit(); }, reload: () => { void current()?.load(); },
  }} />;
};
