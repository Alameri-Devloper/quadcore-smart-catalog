"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../identity/presentation/identity-presentation.types";
import { ReservationApiClient } from "./reservation-api.client";
import { initialReservationState, ReservationCoordinator } from "./reservation.coordinator";
import { reservationFailureText, reservationText, type ReservationTextKey } from "./reservation.i18n";
import type { ReservationDraft, ReservationNavigation, ReservationOperation, ReservationResource, ReservationState } from "./reservation.types";

interface ReservationActions {
  select(id: string): void; next(): void; firstPage(): void; choose(operation: ReservationOperation): void;
  update(patch: Partial<ReservationDraft>): void; review(): void; cancel(): void; acknowledgeRetry(): void; submit(): void; reload(): void;
}
const buttonStyle = { minHeight: 44, whiteSpace: "normal" as const };

export const ReservationPanelContent = ({ state, resource, resourceLabel, canReserveHint, inactiveBranch, locale, actions }: {
  readonly state: ReservationState; readonly resource: ReservationResource; readonly resourceLabel: string; readonly canReserveHint: boolean;
  readonly inactiveBranch: boolean; readonly locale: Locale; readonly actions: ReservationActions;
}) => {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), retry = useRef<HTMLParagraphElement>(null), trigger = useRef<HTMLElement | null>(null);
  const t = (key: ReservationTextKey) => reservationText(locale, key), reviewing = Boolean(state.review), failure = state.failure;
  useEffect(() => {
    if (reviewing && dialog.current && !dialog.current.open) { dialog.current.showModal(); dialog.current.focus(); }
    if (!reviewing && dialog.current?.open) { dialog.current.close(); trigger.current?.focus(); }
  }, [reviewing]);
  useEffect(() => { if (state.reviewRequired) retry.current?.focus(); }, [state.reviewRequired]);
  const choose = (operation: ReservationOperation, element: HTMLElement) => { trigger.current = element; actions.choose(operation); };
  const detail = state.detail.type === "Ready" ? state.detail.value : null;
  return <section aria-labelledby={`${id}-title`} style={{ display: "grid", gap: "1rem", minWidth: 0 }}>
    <div><h3 id={`${id}-title`}>{t("title")}</h3><p>{resourceLabel}</p>{inactiveBranch ? <p role="status">{t("inactive")}</p> : null}</div>
    {state.cursorReset ? <p role="status" aria-live="polite">{t("cursorReset")}</p> : null}
    {state.collection.type === "Loading" ? <p role="status" aria-live="polite">{t("loadingCollection")}</p> : null}
    {state.collection.type === "Failed" ? <p role="alert">{reservationFailureText(locale, state.collection.kind)}</p> : null}
    {state.collection.type === "Ready" ? <section aria-labelledby={`${id}-collection`}><h4 id={`${id}-collection`}>{t("collection")}</h4>
      {state.collection.value.items.length ? <ul style={{ listStyle: "none", padding: 0, display: "grid", gap: ".75rem" }}>{state.collection.value.items.map(item => <li key={item.reservationId} className="surface-card" style={{ overflowWrap: "anywhere" }}>
        <strong>{t(item.status)}</strong><dl><dt>{t("reservationId")}</dt><dd><bdi dir="ltr">{item.reservationId}</bdi></dd><dt>{t("remaining")}</dt><dd><bdi dir="ltr">{item.remainingQuantity}</bdi></dd><dt>{t("updated")}</dt><dd><time dateTime={item.updatedAt}><bdi dir="ltr">{item.updatedAt}</bdi></time></dd></dl>
        <button type="button" className="button button--quiet" style={buttonStyle} aria-label={`${t("open")}: ${item.reservationId}`} onClick={() => actions.select(item.reservationId)}>{t("open")}</button>
      </li>)}</ul> : <p>{t("empty")}</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>{state.collection.value.nextCursor ? <button type="button" className="button button--quiet" style={buttonStyle} onClick={actions.next}>{t("next")}</button> : null}
        {state.navigation.reservationCursor ? <button type="button" className="button button--quiet" style={buttonStyle} onClick={actions.firstPage}>{t("firstPage")}</button> : null}</div>
    </section> : null}
    <section aria-labelledby={`${id}-detail`}><h4 id={`${id}-detail`}>{t("detail")}</h4>
      {state.detail.type === "Idle" ? <p>{t("selectReservation")}</p> : state.detail.type === "Loading" ? <p role="status" aria-live="polite">{t("loadingDetail")}</p>
        : state.detail.type === "Failed" ? <p role="alert">{reservationFailureText(locale, state.detail.kind)}</p> : <>
          <dl style={{ overflowWrap: "anywhere" }}><dt>{t("reservationId")}</dt><dd><bdi dir="ltr">{detail!.reservationId}</bdi></dd><dt>{t("status")}</dt><dd>{t(detail!.status)}</dd>
            <dt>{t("quantity")}</dt><dd><bdi dir="ltr">{detail!.quantity}</bdi></dd><dt>{t("remaining")}</dt><dd><bdi dir="ltr">{detail!.remainingQuantity}</bdi></dd>
            <dt>{t("created")}</dt><dd><time dateTime={detail!.createdAt}><bdi dir="ltr">{detail!.createdAt}</bdi></time></dd><dt>{t("updated")}</dt><dd><time dateTime={detail!.updatedAt}><bdi dir="ltr">{detail!.updatedAt}</bdi></time></dd></dl>
          <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>{detail!.allowedActions.map(operation => <button key={operation} type="button" className="button button--primary" style={buttonStyle}
            disabled={state.pending} onClick={event => choose(operation, event.currentTarget)}>{t(operation)}</button>)}</div>
          {!detail!.allowedActions.length ? <p>{t("noActions")}</p> : null}
        </>}
    </section>
    <section aria-labelledby={`${id}-operations`}><h4 id={`${id}-operations`}>{t("operations")}</h4>
      {canReserveHint && resource.productId && !inactiveBranch ? <button type="button" className="button button--primary" style={buttonStyle} disabled={state.pending}
        onClick={event => choose("Reserve", event.currentTarget)}>{t("Reserve")}</button> : null}
      {state.operation ? <form onSubmit={event => { event.preventDefault(); actions.review(); }} style={{ display: "grid", gap: ".75rem", marginTop: ".75rem" }}>
        <strong>{t(state.operation)}</strong><label htmlFor={`${id}-quantity`}>{t("quantity")}</label><input id={`${id}-quantity`} inputMode="numeric" pattern="[1-9][0-9]*" required
          value={state.draft.quantity} disabled={state.pending} onChange={event => actions.update({ quantity: event.target.value })} />
        {state.operation === "Reserve" ? <><label htmlFor={`${id}-reason`}>{t("reasonCode")}</label><input id={`${id}-reason`} maxLength={128} value={state.draft.reasonCode}
          disabled={state.pending} onChange={event => actions.update({ reasonCode: event.target.value })} /></> : null}
        {state.failure === "InvalidInput" ? <p role="alert">{t("invalidDraft")}</p> : null}
        <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}><button type="submit" className="button button--primary" style={buttonStyle}>{t("review")}</button>
          <button type="button" className="button button--quiet" style={buttonStyle} onClick={actions.cancel}>{t("cancel")}</button></div>
      </form> : null}
    </section>
    {state.outcome ? <section role="status" aria-live="polite"><p>{t("succeeded")}</p><dl><dt>{t("reservationId")}</dt><dd><bdi dir="ltr">{state.outcome.reservationId}</bdi></dd>
      <dt>{t("status")}</dt><dd>{t(state.outcome.reservationStatus)}</dd><dt>{t("remaining")}</dt><dd><bdi dir="ltr">{state.outcome.remainingQuantity}</bdi></dd></dl>
      {state.outcome.balance ? <dl><dt>{t("availability")}</dt><dd>{t(state.outcome.balance.availability)}</dd><dt>{t("quantity")}</dt><dd><bdi dir="ltr">{state.outcome.balance.quantities.available}</bdi></dd></dl>
        : state.outcome.availability ? <p>{t("availability")}: {t(state.outcome.availability)}</p> : <p>{t("mutationOnly")}</p>}</section> : null}
    {reviewing ? <dialog ref={dialog} tabIndex={-1} aria-labelledby={`${id}-confirm`} style={{ width: "min(32rem, calc(100vw - 2rem))", maxWidth: "100%", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", overflowWrap: "anywhere", padding: "1.25rem" }}
      onCancel={event => { event.preventDefault(); if (!state.pending) actions.cancel(); }}><h4 id={`${id}-confirm`}>{t("confirmTitle")}: {t(state.review!.operation)}</h4>
      <dl><dt>{t("quantity")}</dt><dd><bdi dir="ltr">{state.review!.quantity}</bdi></dd>{state.review!.reasonCode ? <><dt>{t("reasonCode")}</dt><dd><bdi dir="ltr">{state.review!.reasonCode}</bdi></dd></> : null}</dl>
      {failure ? <p role="alert">{reservationFailureText(locale, failure)}</p> : null}{state.reviewRequired ? <p ref={retry} tabIndex={-1}>{t("reviewRequired")}</p> : null}
      {state.pending ? <p role="status" aria-live="polite">{t("pending")}</p> : null}<div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        {state.reviewRequired ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.acknowledgeRetry}>{t("reviewed")}</button> : null}
        <button type="button" className="button button--primary" style={buttonStyle} disabled={state.pending || state.reviewRequired} onClick={actions.submit}>{t("confirm")}</button>
        <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.cancel}>{t("cancel")}</button></div></dialog> : null}
    {(state.collection.type === "Failed" || state.detail.type === "Failed") ? <button type="button" className="button button--quiet" style={buttonStyle} onClick={actions.reload}>{t("reload")}</button> : null}
  </section>;
};

export const ReservationPanel = ({ resource, navigation, resourceLabel, canReserveHint, inactiveBranch = false, invalidCursor = false, locale, lifecycle,
  onNavigationChange, onAuthenticationRequired, onResourceStale }: {
  readonly resource: ReservationResource; readonly navigation: ReservationNavigation; readonly resourceLabel: string; readonly canReserveHint: boolean;
  readonly inactiveBranch?: boolean; readonly invalidCursor?: boolean; readonly locale: Locale; readonly lifecycle: object; readonly onNavigationChange: (value: ReservationNavigation) => void;
  readonly onAuthenticationRequired: () => void; readonly onResourceStale: () => void;
}) => {
  const { branchId, productId } = resource, { reservationCursor, reservationId } = navigation;
  const key = JSON.stringify([branchId, productId, inactiveBranch, canReserveHint]);
  const initialNavigation = useRef({ lifecycle, key, navigation });
  const callbackRef = useRef({ onNavigationChange, onAuthenticationRequired, onResourceStale });
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; key: string; state: ReservationState } | null>(null);
  const mounted = useRef<{ lifecycle: object; key: string; coordinator: ReservationCoordinator } | null>(null);
  useEffect(() => {
    initialNavigation.current = { lifecycle, key, navigation };
    callbackRef.current = { onNavigationChange, onAuthenticationRequired, onResourceStale };
  }, [lifecycle, key, navigation, onNavigationChange, onAuthenticationRequired, onResourceStale]);
  useEffect(() => {
    const coordinator = new ReservationCoordinator(new ReservationApiClient(), { branchId, productId }, initialNavigation.current.navigation, canReserveHint, {
      onChange: state => setSnapshot({ lifecycle, key, state }),
      onNavigationChange: value => callbackRef.current.onNavigationChange(value),
      onAuthenticationRequired: () => callbackRef.current.onAuthenticationRequired(),
      onResourceStale: () => callbackRef.current.onResourceStale(),
    }, inactiveBranch);
    mounted.current = { lifecycle, key, coordinator }; void coordinator.load();
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [lifecycle, key, branchId, productId, canReserveHint, inactiveBranch]);
  useEffect(() => { void mounted.current?.coordinator.syncNavigation({ reservationCursor, reservationId }); }, [reservationCursor, reservationId]);
  useEffect(() => { if (invalidCursor) void mounted.current?.coordinator.recoverInvalidCursor(); }, [invalidCursor]);
  const state = snapshot?.lifecycle === lifecycle && snapshot.key === key ? snapshot.state : initialReservationState(navigation);
  const current = () => mounted.current?.lifecycle === lifecycle && mounted.current.key === key ? mounted.current.coordinator : null;
  return <ReservationPanelContent state={state} resource={resource} resourceLabel={resourceLabel} canReserveHint={canReserveHint} inactiveBranch={inactiveBranch} locale={locale} actions={{
    select: value => { void current()?.select(value); }, next: () => { void current()?.nextPage(); }, firstPage: () => { void current()?.restartCollection(); },
    choose: value => current()?.choose(value), update: value => current()?.updateDraft(value), review: () => current()?.review(), cancel: () => current()?.cancel(),
    acknowledgeRetry: () => current()?.acknowledgeRetry(), submit: () => { void current()?.submit(); }, reload: () => { void current()?.load(); },
  }} />;
};
