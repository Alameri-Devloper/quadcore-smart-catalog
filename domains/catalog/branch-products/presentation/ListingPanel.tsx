"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { ListingApiClient } from "./listing-api.client";
import { ListingCoordinator, initialListingState } from "./listing.coordinator";
import { listingFailureText, listingText, type ListingTextKey } from "./listing.i18n";
import type { ListingAction, ListingResource, ListingState } from "./listing.types";

interface ListingActions { choose(action: ListingAction): void; cancel(): void; review(): void; submit(): void; reload(): void }
const buttonStyle = { minHeight: 44, whiteSpace: "normal" as const };
export const ListingPanelContent = ({ state, locale, resourceLabel, inspectionOnly = false, actions }: {
  readonly state: ListingState; readonly locale: Locale; readonly resourceLabel: string; readonly inspectionOnly?: boolean; readonly actions: ListingActions;
}) => {
  const id = useId(), heading = useRef<HTMLHeadingElement>(null), dialog = useRef<HTMLDialogElement>(null), review = useRef<HTMLParagraphElement>(null);
  const t = (key: ListingTextKey) => listingText(locale, key);
  const value = state.detail.type === "Ready" ? state.detail.value : null;
  const failure = state.detail.type === "Failed" ? state.detail.kind : state.failure;
  const canConfirm = !inspectionOnly && !state.pending && !state.reviewRequired && !!state.intent && !!value?.allowedActions.includes(state.intent);
  const reviewing = state.intent !== null;
  useEffect(() => {
    if (!reviewing) return;
    const element = dialog.current, fallback = heading.current, previous = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    if (!element) return;
    element.showModal();
    return () => { if (element.open) element.close(); (previous?.isConnected ? previous : fallback)?.focus(); };
  }, [reviewing]);
  useEffect(() => { if (state.reviewRequired && !state.pending) review.current?.focus(); }, [state.reviewRequired, state.pending]);
  const current = <>
    {state.detail.type === "Idle" || state.detail.type === "Loading" ? <p role="status" aria-live="polite">{t("loading")}</p> : null}
    {value ? <dl><dt>{t("current")}</dt><dd>{t(value.listingStatus)}</dd>
      {value.updatedAt ? <><dt>{t("updated")}</dt><dd><time dateTime={value.updatedAt}>{new Intl.DateTimeFormat(locale, { dateStyle: "medium", timeStyle: "short", timeZone: "UTC" }).format(new Date(value.updatedAt))} <bdi dir="ltr">UTC</bdi></time></dd></> : null}</dl> : null}
  </>;
  const error = failure ? <p role="alert">{listingFailureText(locale, failure)}</p> : null;
  const retry = state.detail.type === "Failed" && !["AuthenticationRequired", "ForbiddenForRestrictedSession", "OriginNotAllowed"].includes(state.detail.kind)
    ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.reload}>{t("retry")}</button> : null;
  return <section className="listing-panel" aria-labelledby={`${id}-heading`} aria-busy={state.pending}
    style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", display: "grid", gap: "1rem" }}>
    <h3 id={`${id}-heading`} ref={heading} tabIndex={-1}>{t("title")}: <bdi>{resourceLabel}</bdi></h3>
    {inspectionOnly ? <p role="status">{t("inspection")}</p> : null}
    {current}{!reviewing ? <>{error}{retry}</> : null}
    {state.saved ? <p role="status" aria-live="polite">{t(state.detail.type === "Ready" ? "saved" : state.detail.type === "Failed" ? "savedRefreshFailed" : "saving")}</p> : null}
    {value ? <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
      {!inspectionOnly && value.allowedActions.map((action, index) => <button key={`${action}:${index}`} type="button" className="button button--primary" style={buttonStyle}
        disabled={state.pending || reviewing} aria-label={`${t(action)}: ${resourceLabel}`} onClick={() => actions.choose(action)}>{t(action)}</button>)}
      {!value.allowedActions.length ? <p>{t("noActions")}</p> : null}
    </div> : null}
    {reviewing ? <dialog ref={dialog} aria-labelledby={`${id}-confirm`} style={{ width: "min(32rem, calc(100vw - 2rem))", maxWidth: "100%", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", overflowWrap: "anywhere", padding: "1.25rem" }}
      onCancel={event => { event.preventDefault(); if (!state.pending) actions.cancel(); }}>
      <h4 id={`${id}-confirm`}>{t("confirmTitle")}: <bdi>{resourceLabel}</bdi></h4>
      {current}<p>{t("requested")}: {t(state.intent!)}</p>{error}
      {state.reviewRequired ? <p ref={review} tabIndex={-1}>{t("reviewRequired")}</p> : null}
      {state.pending ? <p role="status" aria-live="polite">{t("saving")}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        {retry}
        {state.reviewRequired && value?.allowedActions.includes(state.intent!) && !inspectionOnly ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.review}>{t("reviewed")}</button> : null}
        {value?.allowedActions.includes(state.intent!) && !inspectionOnly ? <button type="button" className="button button--primary" style={buttonStyle} disabled={!canConfirm} onClick={actions.submit}>{t("confirm")}</button> : null}
        <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.cancel}>{t("cancel")}</button>
      </div>
    </dialog> : null}
  </section>;
};

export const ListingPanel = ({ resource, resourceLabel, locale, lifecycle, inspectionOnly = false, onAuthenticationRequired, onResourceStale }: {
  readonly resource: ListingResource; readonly resourceLabel: string; readonly locale: Locale; readonly lifecycle: object;
  readonly inspectionOnly?: boolean; readonly onAuthenticationRequired: () => void; readonly onResourceStale: () => void;
}) => {
  const { branchId, productId } = resource;
  const key = JSON.stringify([branchId, productId, inspectionOnly]);
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; key: string; state: ListingState } | null>(null);
  const mounted = useRef<{ lifecycle: object; key: string; coordinator: ListingCoordinator } | null>(null);
  useEffect(() => {
    const coordinator = new ListingCoordinator(new ListingApiClient(), { branchId, productId }, {
      onChange: state => setSnapshot({ lifecycle, key, state }), onAuthenticationRequired, onResourceStale,
    }, inspectionOnly);
    mounted.current = { lifecycle, key, coordinator }; void coordinator.load();
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [lifecycle, key, branchId, productId, inspectionOnly, onAuthenticationRequired, onResourceStale]);
  const state = snapshot?.lifecycle === lifecycle && snapshot.key === key ? snapshot.state : initialListingState();
  const current = () => mounted.current?.lifecycle === lifecycle && mounted.current.key === key ? mounted.current.coordinator : null;
  return <ListingPanelContent key={key} state={state} locale={locale} resourceLabel={resourceLabel} inspectionOnly={inspectionOnly} actions={{
    choose: action => current()?.choose(action), cancel: () => current()?.cancel(), review: () => current()?.reviewLatest(),
    submit: () => { void current()?.submit(); }, reload: () => { void current()?.load(); },
  }} />;
};
