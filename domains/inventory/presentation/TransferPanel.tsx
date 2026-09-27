"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../identity/presentation/identity-presentation.types";
import { InventoryApiClient } from "./inventory-api.client";
import { InventorySummary } from "./InventoryPanel";
import { TransferApiClient } from "./transfer-api.client";
import { initialTransferState, TransferCoordinator } from "./transfer.coordinator";
import { transferFailureText, transferText, type TransferTextKey } from "./transfer.i18n";
import type { TransferBranchOption, TransferDraft, TransferReadHints, TransferSideState, TransferState } from "./transfer.types";

interface TransferActions { update(patch: Partial<TransferDraft>): void; review(): void; cancel(): void; acknowledgeRetry(): void; submit(): void; reload(): void }
const buttonStyle = { minHeight: 44, whiteSpace: "normal" as const };
const branchOf = (state: TransferState, id: string | null) => state.branches.find(branch => branch.branchId === id);

const SideInventory = ({ title, detail, locale, onReload }: { readonly title: string; readonly detail: TransferSideState; readonly locale: Locale; readonly onReload: () => void }) => {
  const t = (key: TransferTextKey) => transferText(locale, key);
  return <section className="surface-card" style={{ minWidth: 0, overflowWrap: "anywhere" }}><h4>{title}</h4>
    {detail.type === "Idle" ? <p>{t("unavailableRead")}</p> : detail.type === "Loading" ? <p role="status" aria-live="polite">{t("loading")}</p>
      : detail.type === "Ready" ? <InventorySummary value={detail.value} locale={locale} />
        : detail.type === "ForbiddenRead" ? <p>{t("unavailableRead")}</p> : <><p role="alert">{transferFailureText(locale, detail.kind)}</p>
          {detail.kind !== "AuthenticationRequired" && detail.kind !== "ForbiddenForRestrictedSession" ? <button type="button" className="button button--quiet" style={buttonStyle} onClick={onReload}>{t("reload")}</button> : null}</>}
  </section>;
};

export const TransferPanelContent = ({ state, locale, canTransferHint, productLabel, actions }: {
  readonly state: TransferState; readonly locale: Locale; readonly canTransferHint: boolean; readonly productLabel: string; readonly actions: TransferActions;
}) => {
  const id = useId(), dialog = useRef<HTMLDialogElement>(null), retry = useRef<HTMLParagraphElement>(null), previousFocus = useRef<HTMLElement | null>(null);
  const t = (key: TransferTextKey) => transferText(locale, key), source = branchOf(state, state.sourceBranchId), destination = branchOf(state, state.destinationBranchId);
  const reviewing = Boolean(state.review), inactive = source?.status !== "Active" || destination?.status !== "Active";
  const blocked = inactive || state.sourceBranchId === state.destinationBranchId;
  useEffect(() => {
    if (!reviewing || !dialog.current) return;
    const element = dialog.current;
    previousFocus.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    element.showModal(); element.focus();
    return () => { if (element.open) element.close(); previousFocus.current?.focus(); };
  }, [reviewing]);
  useEffect(() => { if (state.reviewRequired && !state.pending) retry.current?.focus(); }, [state.reviewRequired, state.pending]);
  const outcome = state.outcome;
  return <section aria-labelledby={`${id}-title`} aria-busy={state.pending} style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere", display: "grid", gap: "1rem" }}>
    <h3 id={`${id}-title`}>{t("title")}</h3>
    <dl><dt>{t("sourceBranch")}</dt><dd><bdi>{source?.displayName ?? state.sourceBranchId}</bdi></dd>
      <dt>{t("destinationBranch")}</dt><dd><bdi>{destination?.displayName ?? state.destinationBranchId}</bdi></dd>
      <dt>{t("product")}</dt><dd><bdi>{productLabel}</bdi></dd></dl>
    {!canTransferHint ? <p role="status">{t("hintUnavailable")}</p> : null}
    {state.sourceBranchId === state.destinationBranchId ? <p role="alert">{t("sameBranch")}</p> : null}
    {inactive ? <p role="alert">{t("inactive")}</p> : null}
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "1rem" }}>
      <SideInventory title={t("sourceInventory")} detail={state.sourceDetail} locale={locale} onReload={actions.reload} />
      <SideInventory title={t("destinationInventory")} detail={state.destinationDetail} locale={locale} onReload={actions.reload} />
    </div>
    {outcome ? <section role="status" aria-live="polite" aria-labelledby={`${id}-success`}><h4 id={`${id}-success`}>{t("succeeded")}</h4>
      <dl><dt>{t("operationId")}</dt><dd><bdi dir="ltr">{outcome.operationId}</bdi></dd><dt>{t("status")}</dt><dd>{t("Succeeded")}</dd>
        <dt>{t("transferId")}</dt><dd><bdi dir="ltr">{outcome.transferId}</bdi></dd></dl>
      {"sourceBalance" in outcome ? <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 16rem), 1fr))", gap: "1rem" }}>
        <section><h5>{t("sourceInventory")}</h5><InventorySummary value={outcome.sourceBalance} locale={locale} /></section>
        <section><h5>{t("destinationInventory")}</h5><InventorySummary value={outcome.destinationBalance} locale={locale} /></section></div>
        : "sourceAvailability" in outcome ? <dl><dt>{t("sourceInventory")} — {t("availability")}</dt><dd>{t(outcome.sourceAvailability)}</dd>
          <dt>{t("destinationInventory")} — {t("availability")}</dt><dd>{t(outcome.destinationAvailability)}</dd></dl>
          : <p>{t("minimumDisclosure")}</p>}
    </section> : null}
    {!reviewing ? <form onSubmit={event => { event.preventDefault(); actions.review(); }} style={{ display: "grid", gap: ".75rem", maxWidth: "32rem" }}>
      <label htmlFor={`${id}-quantity`}>{t("quantity")}</label><input id={`${id}-quantity`} inputMode="numeric" pattern="[1-9][0-9]*" required autoComplete="off"
        dir="ltr" value={state.draft.quantity} disabled={state.pending || !canTransferHint || blocked} onChange={event => actions.update({ quantity: event.target.value })} />
      <label htmlFor={`${id}-reason`}>{t("reasonCode")}</label><input id={`${id}-reason`} maxLength={64} autoComplete="off" aria-describedby={`${id}-reason-help`}
        dir="ltr" value={state.draft.reasonCode} disabled={state.pending || !canTransferHint || blocked} onChange={event => actions.update({ reasonCode: event.target.value })} />
      <p id={`${id}-reason-help`}>{t("reasonGuidance")}</p>
      {state.failure ? <p role="alert">{state.failure === "InvalidInput" ? t("invalidDraft") : transferFailureText(locale, state.failure)}</p> : null}
      <button type="submit" className="button button--primary" style={buttonStyle} disabled={state.pending || !canTransferHint || blocked}>{t("review")}</button>
    </form> : null}
    {reviewing ? <dialog ref={dialog} tabIndex={-1} aria-labelledby={`${id}-confirm`} style={{ width: "min(32rem, calc(100vw - 2rem))", maxWidth: "100%", maxHeight: "calc(100dvh - 2rem)", overflowY: "auto", overflowWrap: "anywhere", padding: "1.25rem" }}
      onCancel={event => { event.preventDefault(); if (!state.pending) actions.cancel(); }}><h4 id={`${id}-confirm`}>{t("confirmTitle")}</h4>
      <dl><dt>{t("sourceBranch")}</dt><dd><bdi>{source?.displayName ?? state.review!.sourceBranchId}</bdi></dd>
        <dt>{t("destinationBranch")}</dt><dd><bdi>{destination?.displayName ?? state.review!.destinationBranchId}</bdi></dd>
        <dt>{t("product")}</dt><dd><bdi>{productLabel}</bdi></dd><dt>{t("quantity")}</dt><dd><bdi dir="ltr">{state.review!.quantity}</bdi></dd>
        {state.review!.reasonCode ? <><dt>{t("reasonCode")}</dt><dd><bdi dir="ltr">{state.review!.reasonCode}</bdi></dd></> : null}</dl>
      {state.failure ? <p role="alert">{transferFailureText(locale, state.failure)}</p> : null}
      {state.reviewRequired ? <p ref={retry} tabIndex={-1} role="status" aria-live="polite">{t("reviewRequired")}</p> : null}
      {state.pending ? <p role="status" aria-live="polite">{t("pending")}</p> : null}
      <div style={{ display: "flex", flexWrap: "wrap", gap: ".75rem" }}>
        {state.reviewRequired ? <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.acknowledgeRetry}>{t("reviewed")}</button> : null}
        <button type="button" className="button button--primary" style={buttonStyle} disabled={state.pending || state.reviewRequired || blocked} onClick={actions.submit}>{t("confirm")}</button>
        <button type="button" className="button button--quiet" style={buttonStyle} disabled={state.pending} onClick={actions.cancel}>{t("cancel")}</button>
      </div></dialog> : null}
  </section>;
};

export const TransferPanel = ({ sourceBranchId, destinationBranchId, productId, productLabel, branches, hints, canTransferHint, locale, lifecycle,
  onAuthenticationRequired, onBranchesStale, onProductStale }: { readonly sourceBranchId: string; readonly destinationBranchId: string;
  readonly productId: string; readonly productLabel: string; readonly branches: readonly TransferBranchOption[]; readonly hints: TransferReadHints;
  readonly canTransferHint: boolean; readonly locale: Locale; readonly lifecycle: object; readonly onAuthenticationRequired: () => void;
  readonly onBranchesStale: () => void; readonly onProductStale: (kind: "ProductArchived" | "ProductNotFound") => void;
}) => {
  const key = JSON.stringify([sourceBranchId, hints]);
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; key: string; state: TransferState } | null>(null);
  const mounted = useRef<{ lifecycle: object; key: string; coordinator: TransferCoordinator } | null>(null);
  const initialSelection = useRef({ branches, destinationBranchId, productId });
  const callbackRef = useRef({ onAuthenticationRequired, onBranchesStale, onProductStale });
  useEffect(() => { initialSelection.current = { branches, destinationBranchId, productId };
    callbackRef.current = { onAuthenticationRequired, onBranchesStale, onProductStale };
  }, [branches, destinationBranchId, productId, onAuthenticationRequired, onBranchesStale, onProductStale]);
  useEffect(() => {
    const initial = initialSelection.current;
    const coordinator = new TransferCoordinator(new TransferApiClient(), new InventoryApiClient(), sourceBranchId, initial.branches,
      initial.destinationBranchId, initial.productId, hints, {
      onChange: state => setSnapshot({ lifecycle, key, state }), onAuthenticationRequired: () => callbackRef.current.onAuthenticationRequired(),
      onBranchesStale: () => callbackRef.current.onBranchesStale(), onProductStale: kind => callbackRef.current.onProductStale(kind),
    });
    mounted.current = { lifecycle, key, coordinator }; void coordinator.load();
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [lifecycle, key, sourceBranchId, hints]);
  useEffect(() => { void mounted.current?.coordinator.sync(branches, destinationBranchId, productId); }, [branches, destinationBranchId, productId]);
  const state = snapshot?.lifecycle === lifecycle && snapshot.key === key ? snapshot.state
    : initialTransferState(sourceBranchId, branches, destinationBranchId, productId);
  const current = () => mounted.current?.lifecycle === lifecycle && mounted.current.key === key ? mounted.current.coordinator : null;
  return <TransferPanelContent state={state} locale={locale} canTransferHint={canTransferHint} productLabel={productLabel} actions={{
    update: patch => current()?.updateDraft(patch), review: () => current()?.review(), cancel: () => current()?.cancel(),
    acknowledgeRetry: () => current()?.acknowledgeRetry(), submit: () => { void current()?.submit(); }, reload: () => { void current()?.load(); },
  }} />;
};
