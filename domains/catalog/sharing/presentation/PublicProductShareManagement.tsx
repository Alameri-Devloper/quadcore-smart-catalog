"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useOperationalManagementCapabilities } from "../../../identity/presentation/operational-management-capabilities.context";
import { PublicProductShareManagementApiClient } from "./public-product-share-management-api.client";
import { emptyPublicShareManagementState, PublicShareManagementCoordinator, type PublicShareManagementState } from "./public-product-share-management.coordinator";
import { publicShareManagementText } from "./public-product-share-management.i18n";

interface PanelProps {
  readonly id: string; readonly locale: "ar" | "en"; readonly branchId?: string;
  readonly canRetrieve: boolean; readonly canRevoke: boolean; readonly known: string;
  readonly state: PublicShareManagementState;
  readonly onKnown: (value: string) => void; readonly onIssue: (trigger: HTMLButtonElement) => void; readonly onCopy: (trigger: HTMLButtonElement) => void;
  readonly onReview: (operation: "revoke" | "replace", grantId?: string, trigger?: HTMLButtonElement) => void;
  readonly onAccept: () => void; readonly onCancel: () => void; readonly onHide: () => void;
}
/** Pure renderer; receives only transient authenticated presentation state. */
export function PublicProductShareManagementPanel(props: PanelProps) {
  const { id, locale, state } = props, text = publicShareManagementText(locale);
  if (!props.canRetrieve && !props.canRevoke) return null;
  const message = state.busy ? text.busy : state.message === "Idle" ? "" : state.message === "Copied" ? text.copied
    : state.message === "ClipboardDenied" ? text.manual : state.message === "ExpectedCurrentGrantConflict" ? text.conflict
    : ["NotFound", "NoActiveGrant"].includes(state.message) ? text.missing
    : ["AuthenticationRequired", "ForbiddenForRestrictedSession", "PermissionDenied", "BranchScopeDenied"].includes(state.message) ? text.denied
    : ["IssueIneligible", "ReplacementIneligible"].includes(state.message) ? text.ineligible
    : ["Created", "Reused", "Found", "Replaced", "Revoked", "AlreadyRevoked"].includes(state.message) ? text.ready : text.unavailable;
  return <section id={id} tabIndex={-1} className="public-share-management surface-card" lang={locale} dir={locale === "ar" ? "rtl" : "ltr"} aria-labelledby={id + "-title"} aria-busy={state.busy}>
    <h2 id={id + "-title"}>{text.title}</h2><p>{text.warning}</p>
    {props.canRetrieve && !props.branchId ? <p>{text.branch}</p> : null}
    <div className="public-share-management__actions">
      {props.canRetrieve ? <><button type="button" className="button button--secondary" disabled={state.busy || !props.branchId} onClick={(event) => props.onIssue(event.currentTarget)}>{text.issue}</button>
      <button type="button" className="button button--secondary" disabled={state.busy || !props.branchId} onClick={(event) => props.onCopy(event.currentTarget)}>{text.copy}</button></> : null}
      {state.grantId && props.canRevoke ? <button type="button" className="button button--secondary" disabled={state.busy} onClick={(event) => props.onReview("revoke", state.grantId, event.currentTarget)}>{text.revoke}</button> : null}
      {state.grantId && props.canRetrieve ? <button type="button" className="button button--secondary" disabled={state.busy || !props.branchId} onClick={(event) => props.onReview("replace", state.grantId, event.currentTarget)}>{text.replace}</button> : null}
    </div>
    {props.canRevoke ? <form className="form-stack" onSubmit={(event) => { event.preventDefault(); const submitter = (event.nativeEvent as SubmitEvent).submitter; props.onReview("revoke", props.known.trim(), submitter instanceof HTMLButtonElement ? submitter : undefined); }}>
      <h3>{text.known}</h3><label htmlFor={id + "-grant"}>{text.grant}</label><input id={id + "-grant"} type="text" dir="ltr" autoComplete="off" value={props.known} disabled={state.busy} onChange={(event) => props.onKnown(event.currentTarget.value)} />
      <button type="submit" className="button button--secondary" disabled={state.busy || !props.known.trim()}>{text.reviewRevoke}</button>
    </form> : null}
    {state.confirmation ? <fieldset className="public-share-management__confirmation" disabled={state.busy}><legend>{state.confirmation.operation === "revoke" ? text.confirmRevoke : text.confirmReplace}</legend>
      <button type="button" className="button button--secondary" autoFocus onClick={props.onCancel}>{text.cancel}</button>
      <button type="button" className="button button--primary" onClick={props.onAccept}>{text.confirm}</button>
    </fieldset> : null}
    <p role="status" aria-live="polite">{message}</p>
    {state.url ? <div className="form-stack"><label htmlFor={id + "-url"}>{text.url}</label><textarea id={id + "-url"} readOnly dir="ltr" autoComplete="off" spellCheck={false} value={state.url} rows={3} onFocus={(event) => event.currentTarget.select()} />
      <button type="button" className="button button--secondary" onClick={props.onHide}>{text.hide}</button></div> : null}
  </section>;
}
export function PublicProductShareManagement({ productId, branchId, locale }: { readonly productId: string; readonly branchId?: string; readonly locale: "ar" | "en" }) {
  const capabilities = useOperationalManagementCapabilities(), id = useId();
  const identity = useMemo(() => ({ productId, branchId, capabilities: capabilities.state }), [productId, branchId, capabilities.state]);
  const mounted = useRef<{ identity: object; coordinator: PublicShareManagementCoordinator } | null>(null);
  const [snapshot, setSnapshot] = useState<{ identity: object; state: PublicShareManagementState } | null>(null);
  const [known, setKnown] = useState<{ identity: object; value: string } | null>(null);
  const returnFocus = useRef<HTMLButtonElement | null>(null);
  const focusAfterOperation = useRef(false);
  const available = capabilities.state.type === "Ready" ? capabilities.state.value.publicSharing : null;
  const state = snapshot?.identity === identity ? snapshot.state : emptyPublicShareManagementState;
  const coordinator = () => mounted.current?.identity === identity ? mounted.current.coordinator : null;
  useEffect(() => {
    if (capabilities.state.type !== "Ready") return;
    const hints = capabilities.state.value.publicSharing;
    const current = new PublicShareManagementCoordinator(new PublicProductShareManagementApiClient(), { writeText: (value) => navigator.clipboard.writeText(value) },
      { productId, branchId, ...hints }, (value) => setSnapshot({ identity, state: value }));
    mounted.current = { identity, coordinator: current };
    const clear = () => current.clear(), visibility = () => { if (document.visibilityState === "hidden") clear(); };
    window.addEventListener("pagehide", clear); document.addEventListener("visibilitychange", visibility);
    return () => { current.dispose(); setSnapshot(null); setKnown(null); returnFocus.current = null; focusAfterOperation.current = false; if (mounted.current?.coordinator === current) mounted.current = null;
      window.removeEventListener("pagehide", clear); document.removeEventListener("visibilitychange", visibility); };
  }, [branchId, productId, identity, capabilities.state]);
  useEffect(() => {
    if (state.busy || !focusAfterOperation.current) return;
    focusAfterOperation.current = false;
    const target = returnFocus.current?.isConnected ? returnFocus.current : document.getElementById(id + "-grant") ?? document.getElementById(id);
    target?.focus();
  }, [id, state]);
  return <PublicProductShareManagementPanel id={id} locale={locale} branchId={branchId} canRetrieve={available?.canRetrieve ?? false} canRevoke={available?.canRevoke ?? false}
    state={state} known={known?.identity === identity ? known.value : ""} onKnown={(value) => setKnown({ identity, value })}
    onIssue={(trigger) => { returnFocus.current = trigger; focusAfterOperation.current = true; void coordinator()?.run("issue"); }}
    onCopy={(trigger) => { returnFocus.current = trigger; focusAfterOperation.current = true; void coordinator()?.run("copy"); }}
    onReview={(operation, grantId, trigger) => { returnFocus.current = trigger ?? null; coordinator()?.confirm(operation, grantId); }}
    onCancel={() => { focusAfterOperation.current = true; coordinator()?.cancel(); }}
    onAccept={() => { focusAfterOperation.current = true; void coordinator()?.accept(); }}
    onHide={() => { returnFocus.current = null; focusAfterOperation.current = true; coordinator()?.clear(); }} />;
}
