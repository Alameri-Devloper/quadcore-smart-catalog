"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { BranchPricingApiClient } from "./branch-pricing-api.client";
import { BranchPricingCoordinator, initialBranchPricingFieldState, initialBranchPricingState, type BranchPricingSurface } from "./branch-pricing.coordinator";
import { branchPricingFailureText, branchPricingFieldText, branchPricingText } from "./branch-pricing.i18n";
import type { BranchMoneyView, BranchPricingField, BranchPricingFieldState, BranchPricingSlot, BranchPricingState } from "./branch-pricing.types";

interface BranchPricingActions {
  chooseSet(field: BranchPricingField, draft: BranchMoneyView): void;
  chooseClear(field: BranchPricingField): void;
  activate(field: BranchPricingField): void;
  cancel(): void; review(): void; submit(): void; reload(): void;
}
const buttonStyle = { minHeight: 44, whiteSpace: "normal" as const };

const Money = ({ value }: { readonly value: BranchMoneyView | null }) => value
  ? <><bdi dir="ltr">{value.amountMinor}</bdi> <bdi dir="ltr">{value.currency}</bdi></> : <>—</>;

const SlotEditor = ({ field, slot, locale, workflow, active, actions }: {
  readonly field: BranchPricingField; readonly slot: BranchPricingSlot; readonly locale: Locale;
  readonly workflow: BranchPricingFieldState; readonly active: boolean; readonly actions: BranchPricingActions;
}) => {
  const id = useId();
  const initial = slot.override.value ?? slot.effective;
  const [amountMinor, setAmountMinor] = useState(initial?.amountMinor ?? "");
  const [currency, setCurrency] = useState(initial?.currency ?? "");
  const busy = workflow.pending || active;
  return <article className="surface-card" aria-labelledby={`${id}-heading`} aria-busy={workflow.pending}
    style={{ minWidth: 0, maxWidth: "100%", display: "grid", gap: ".75rem", overflowWrap: "anywhere" }}>
    <h4 id={`${id}-heading`}>{branchPricingFieldText(locale, field)}</h4>
    <dl>
      <dt>{branchPricingText(locale, "base")}: {branchPricingText(locale, slot.base.state)}</dt><dd><Money value={slot.base.value} /></dd>
      <dt>{branchPricingText(locale, "override")}: {branchPricingText(locale, slot.override.state)}</dt><dd><Money value={slot.override.value} /></dd>
      <dt>{branchPricingText(locale, "effective")}</dt><dd><Money value={slot.effective} /></dd>
      <dt>{branchPricingText(locale, "source")}</dt><dd>{branchPricingText(locale, slot.source === "NotConfigured" ? "NotConfiguredSource" : slot.source)}</dd>
      <dt>{branchPricingText(locale, "overrideRevision")}</dt><dd><bdi dir="ltr">{slot.overrideRevision}</bdi></dd>
    </dl>
    {slot.allowedActions.includes("SetOverride") ? <form onSubmit={event => { event.preventDefault(); actions.chooseSet(field, { amountMinor, currency }); }}
      style={{ display: "grid", gap: ".5rem", minWidth: 0 }}>
      <label htmlFor={`${id}-amount`}>{branchPricingText(locale, "amountMinor")}</label>
      <input id={`${id}-amount`} dir="ltr" inputMode="numeric" value={amountMinor} disabled={busy}
        onChange={event => setAmountMinor(event.target.value)} />
      <label htmlFor={`${id}-currency`}>{branchPricingText(locale, "currency")}</label>
      <input id={`${id}-currency`} dir="ltr" autoCapitalize="characters" maxLength={3} value={currency} disabled={busy}
        onChange={event => setCurrency(event.target.value.toUpperCase())} />
      <button type="submit" className="button button--primary" style={buttonStyle} disabled={busy}
        aria-label={`${branchPricingText(locale, "SetOverride")}: ${branchPricingFieldText(locale, field)}`}>
        {branchPricingText(locale, "SetOverride")}
      </button>
    </form> : null}
    {slot.allowedActions.includes("ClearOverride") ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={busy}
      aria-label={`${branchPricingText(locale, "ClearOverride")}: ${branchPricingFieldText(locale, field)}`}
      onClick={() => actions.chooseClear(field)}>{branchPricingText(locale, "ClearOverride")}</button> : null}
    {!slot.allowedActions.length ? <p>{branchPricingText(locale, "noActions")}</p> : null}
    {workflow.validation ? <p role="alert">{branchPricingText(locale, workflow.validation === "Amount" ? "invalidAmount" : "invalidCurrency")}</p> : null}
    {workflow.failure && !active ? <p role="alert">{branchPricingFailureText(locale, workflow.failure)}</p> : null}
    {workflow.pending ? <p role="status" aria-live="polite">{branchPricingText(locale, "saving")}</p> : null}
    {workflow.saved ? <p role="status" aria-live="polite">{branchPricingText(locale, "saved")}</p> : null}
    {workflow.intent && workflow.reviewRequired && !active && !workflow.pending
      ? <button type="button" className="button button--quiet" style={buttonStyle} onClick={() => actions.activate(field)}>
        {branchPricingText(locale, "resumeReview")}</button> : null}
  </article>;
};

export const BranchPricingPanelContent = ({ state, locale, branchLabel, productLabel, surface, inspectionOnly, actions }: {
  readonly state: BranchPricingState; readonly locale: Locale; readonly branchLabel: string; readonly productLabel: string;
  readonly surface: BranchPricingSurface; readonly inspectionOnly: boolean; readonly actions: BranchPricingActions;
}) => {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), review = useRef<HTMLParagraphElement>(null), heading = useRef<HTMLHeadingElement>(null);
  const value = state.detail.type === "Ready" ? state.detail.value : null;
  const activeField = state.activeField, workflow = activeField ? state.fields[activeField] : undefined, intent = workflow?.intent ?? null;
  const currentSlot = value && activeField ? value.prices[activeField] : undefined;
  const canConfirm = Boolean(intent && currentSlot?.allowedActions.includes(intent.action) && !workflow?.pending && !workflow?.reviewRequired);
  useEffect(() => {
    if (!intent) return;
    const element = dialog.current, fallback = heading.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element?.showModal();
    return () => { if (element?.open) element.close(); (previous?.isConnected ? previous : fallback)?.focus(); };
  }, [intent]);
  useEffect(() => { if (workflow?.reviewRequired && !workflow.pending) review.current?.focus(); }, [workflow?.reviewRequired, workflow?.pending]);
  const anyPending = Object.values(state.fields).some(field => field?.pending);
  const savedWithoutRefresh = state.detail.type === "Failed" && Object.values(state.fields).some(field => field?.saved);
  const retry = state.detail.type === "Failed" && !["AuthenticationRequired", "ForbiddenForRestrictedSession", "OriginNotAllowed", "Forbidden"].includes(state.detail.kind)
    ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={anyPending} onClick={actions.reload}>{branchPricingText(locale, "retry")}</button> : null;
  const baseRevision = value ? surface === "prices" ? value.baseProductRevision : value.baseReferenceCostRevision : undefined;
  return <section aria-labelledby={`${id}-heading`} aria-busy={anyPending || state.refreshing}
    style={{ minWidth: 0, maxWidth: "100%", display: "grid", gap: "1rem", overflowWrap: "anywhere" }}>
    <h3 id={`${id}-heading`} ref={heading} tabIndex={-1}>{branchPricingText(locale, surface === "prices" ? "pricesTitle" : "referenceCostTitle")}: <bdi>{productLabel}</bdi> — <bdi>{branchLabel}</bdi></h3>
    {inspectionOnly ? <p role="status">{branchPricingText(locale, "inspectionOnly")}</p> : null}
    {state.detail.type === "Idle" || state.detail.type === "Loading" ? <p role="status" aria-live="polite">{branchPricingText(locale, "loading")}</p> : null}
    {state.refreshing && state.detail.type === "Ready" ? <p role="status" aria-live="polite">{branchPricingText(locale, "refreshing")}</p> : null}
    {state.detail.type === "Failed" ? <p role="alert">{branchPricingFailureText(locale, state.detail.kind)}</p> : null}{retry}
    {savedWithoutRefresh ? <p role="status" aria-live="polite">{branchPricingText(locale, "savedRefreshFailed")}</p> : null}
    {baseRevision !== undefined ? <p>{branchPricingText(locale, "baseRevision")}: <bdi dir="ltr">{baseRevision}</bdi></p> : null}
    {value ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 18rem), 1fr))", gap: "1rem", minWidth: 0 }}>
      {(["Retail", "Wholesale", "ReferenceCost"] as const).map(field => value.prices[field]
        ? <SlotEditor key={`${field}:${value.prices[field]!.overrideRevision}`} field={field} slot={value.prices[field]!} locale={locale}
          workflow={state.fields[field] ?? initialBranchPricingFieldState()} active={activeField === field} actions={actions} /> : null)}
    </div> : null}
    {intent && activeField && workflow ? <dialog ref={dialog} aria-labelledby={`${id}-confirm`}
      style={{ width: "min(36rem, calc(100vw - 2rem))", maxWidth: "100%", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", padding: "1.25rem" }}
      onCancel={event => { event.preventDefault(); if (!workflow.pending) actions.cancel(); }}>
      <h4 id={`${id}-confirm`}>{branchPricingText(locale, "confirmTitle")}</h4>
      <dl>
        <dt>{branchPricingText(locale, "branch")}</dt><dd><bdi>{branchLabel}</bdi></dd>
        <dt>{branchPricingText(locale, "product")}</dt><dd><bdi>{productLabel}</bdi></dd>
        <dt>{branchPricingText(locale, "field")}</dt><dd>{branchPricingFieldText(locale, intent.field)}</dd>
        <dt>{branchPricingText(locale, "action")}</dt><dd>{branchPricingText(locale, intent.action)}</dd>
        {intent.action === "SetOverride" ? <><dt>{branchPricingText(locale, "amountMinor")}</dt><dd><bdi dir="ltr">{intent.amountMinor}</bdi></dd>
          <dt>{branchPricingText(locale, "currency")}</dt><dd><bdi dir="ltr">{intent.currency}</bdi></dd></> : null}
      </dl>
      {workflow.failure ? <p role="alert">{branchPricingFailureText(locale, workflow.failure)}</p> : null}
      {workflow.reviewRequired ? <p ref={review} tabIndex={-1}>{branchPricingText(locale, "reviewRequired")}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        {workflow.reviewRequired && currentSlot?.allowedActions.includes(intent.action) ? <button type="button" className="button button--quiet" style={buttonStyle}
          onClick={actions.review}>{branchPricingText(locale, "reviewed")}</button> : null}
        {currentSlot?.allowedActions.includes(intent.action) ? <button type="button" className="button button--primary" style={buttonStyle}
          disabled={!canConfirm} onClick={actions.submit}>{branchPricingText(locale, "confirm")}</button> : null}
        <button type="button" className="button button--quiet" style={buttonStyle} onClick={actions.cancel}>{branchPricingText(locale, "cancel")}</button>
      </div>
    </dialog> : null}
  </section>;
};

export const BranchPricingPanel = ({ branchId, branchLabel, productId, productLabel, surface, inspectionOnly, locale, lifecycle,
  onAuthenticationRequiredAction, onBranchStaleAction, onProductStaleAction }: {
  readonly branchId: string; readonly branchLabel: string; readonly productId: string; readonly productLabel: string;
  readonly surface: BranchPricingSurface; readonly inspectionOnly: boolean; readonly locale: Locale; readonly lifecycle: object;
  readonly onAuthenticationRequiredAction: () => void; readonly onBranchStaleAction: () => void; readonly onProductStaleAction: () => void;
}) => {
  const key = JSON.stringify([branchId, productId, surface]);
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; key: string; state: BranchPricingState } | null>(null);
  const mounted = useRef<{ lifecycle: object; key: string; coordinator: BranchPricingCoordinator } | null>(null);
  useEffect(() => {
    const coordinator = new BranchPricingCoordinator(new BranchPricingApiClient(), branchId, productId, surface, {
      onChange: state => setSnapshot({ lifecycle, key, state }), onAuthenticationRequired: onAuthenticationRequiredAction,
      onBranchStale: onBranchStaleAction, onProductStale: onProductStaleAction,
    });
    mounted.current = { lifecycle, key, coordinator }; void coordinator.load();
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [branchId, key, lifecycle, onAuthenticationRequiredAction, onBranchStaleAction, onProductStaleAction, productId, surface]);
  const state = snapshot?.lifecycle === lifecycle && snapshot.key === key ? snapshot.state : initialBranchPricingState();
  const current = () => mounted.current?.lifecycle === lifecycle && mounted.current.key === key ? mounted.current.coordinator : null;
  return <BranchPricingPanelContent key={key} state={state} locale={locale} branchLabel={branchLabel} productLabel={productLabel}
    surface={surface} inspectionOnly={inspectionOnly} actions={{
      chooseSet: (field, draft) => current()?.choose(field, "SetOverride", draft),
      chooseClear: field => current()?.choose(field, "ClearOverride"), activate: field => current()?.activate(field),
      cancel: () => current()?.cancel(), review: () => current()?.reviewLatest(), submit: () => { void current()?.submit(); }, reload: () => { void current()?.load(); },
    }} />;
};
