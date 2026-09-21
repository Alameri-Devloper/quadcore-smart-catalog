"use client";

import { useCallback, useEffect, useId, useRef, useState, type ReactNode } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { OperationalBranchApiClient } from "./operational-branch-api.client";
import { freshOperationalBranchEligible, mountOperationalBranchSelector, operationalBranchSelection, type OperationalBranchSelectorCoordinator } from "./operational-branch-selector.coordinator";
import type { OperationalBranchFailure, OperationalBranchPurpose, OperationalBranchState } from "./operational-branch-selector.types";
import { operationsText, type OperationsTextKey } from "./operations-presentation.i18n";

const failureLabels: Readonly<Record<OperationalBranchFailure, OperationsTextKey>> = {
  AuthenticationRequired: "AuthenticationRequired", ForbiddenForRestrictedSession: "selectorRestricted",
  InvalidInput: "selectorInvalidInput", Forbidden: "selectorForbidden", BranchServiceUnavailable: "selectorUnavailable",
  NetworkFailure: "NetworkFailure", MalformedResponse: "MalformedResponse", UnexpectedResponse: "UnexpectedResponse",
};

export const OperationalBranchSelectorContent = ({ state, purpose, branchId, locale, onSelectBranch, onRetry }: {
  readonly state: OperationalBranchState; readonly purpose: OperationalBranchPurpose; readonly branchId: string | null;
  readonly locale: Locale; readonly onSelectBranch: (id: string | null) => void; readonly onRetry: () => void;
}) => {
  const id = useId(), t = (key: OperationsTextKey) => operationsText(locale, key);
  const selection = operationalBranchSelection(state, purpose, branchId);
  const current = state.type !== "Idle" && state.purpose === purpose;
  return <section className="operational-branch-selector" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>{t("operationalBranch")}</h3>
    {!current || state.type === "Loading" ? <p role="status" aria-live="polite">{t("selectorLoading")}</p> : null}
    {current && state.type === "Failed" ? <>
      <p role="alert">{t(failureLabels[state.kind])}</p>
      {state.kind !== "AuthenticationRequired" && state.kind !== "ForbiddenForRestrictedSession" ?
        <button type="button" className="button button--quiet" onClick={onRetry}>{t("retry")}</button> : null}
    </> : null}
    {current && state.type === "Ready" ? <>
      <p id={`${id}-guidance`}>{t("freshBranchGuidance")}</p>
      {state.availability === "AuthorizedEmpty" ? <p role="status" aria-live="polite">{t("operationalEmpty")}</p> : null}
      {state.availability === "AllInactive" ? <p role="status" aria-live="polite">{t("allBranchesInactive")}</p> : null}
      {selection.type === "StaleSelectedBranch" ? <p role="alert">{t("staleSelectedBranch")}</p> : null}
      {selection.type === "Inactive" ? <p role="alert">{t("selectedBranchInactive")}</p> : null}
      {state.options.length ? <fieldset aria-describedby={`${id}-guidance`}>
        <legend>{t(purpose === "Transfer" ? "sourceBranch" : "selectOperationalBranch")}</legend>
        <div className="operational-branch-options">{state.options.map((branch, index) => <label key={branch.branchId} htmlFor={`${id}-${index}`}
          className="operational-branch-option">
          <input id={`${id}-${index}`} name={`${id}-branch`} type="radio" value={branch.branchId}
            disabled={!freshOperationalBranchEligible(branch)}
            checked={selection.type === "Selected" && selection.branch.branchId === branch.branchId}
            aria-describedby={!freshOperationalBranchEligible(branch) ? `${id}-guidance` : undefined}
            onChange={() => { if (operationalBranchSelection(state, purpose, branch.branchId).type === "Selected") onSelectBranch(branch.branchId); }} />
          <span><strong><bdi>{branch.displayName}</bdi></strong><bdi dir="ltr">{branch.code}</bdi><span>{t(branch.status)}</span></span>
        </label>)}</div>
      </fieldset> : null}
      {selection.type === "Selected" ? <p role="status" aria-live="polite">{t("selectedOperationalBranch")}: <bdi>{selection.branch.displayName}</bdi></p> : null}
      {branchId ? <button type="button" className="button button--quiet" onClick={() => onSelectBranch(null)}>{t("clearBranchSelection")}</button> : null}
    </> : null}
  </section>;
};

export const OperationalBranchSelector = ({ purpose, branchId, locale, lifecycle, onAuthenticationRequired, onSelectBranch, children }: {
  readonly purpose: OperationalBranchPurpose; readonly branchId: string | null; readonly locale: Locale;
  readonly lifecycle: object; readonly onAuthenticationRequired: () => void; readonly onSelectBranch: (id: string | null) => void;
  readonly children?: (state: OperationalBranchState, refresh: () => void) => ReactNode;
}) => {
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; state: OperationalBranchState } | null>(null);
  const [refreshVersion, setRefreshVersion] = useState(0);
  const mounted = useRef<{ lifecycle: object; purpose: OperationalBranchPurpose; coordinator: OperationalBranchSelectorCoordinator } | null>(null);
  useEffect(() => {
    const coordinator = mountOperationalBranchSelector(new OperationalBranchApiClient(), purpose, {
      onChange: (state) => setSnapshot({ lifecycle, state }), onAuthenticationRequired,
    });
    mounted.current = { lifecycle, purpose, coordinator };
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [lifecycle, purpose, onAuthenticationRequired, refreshVersion]);
  // Mask previous lifecycle/purpose data before effect cleanup, without refetching on URL selection alone.
  const state = snapshot?.lifecycle === lifecycle ? snapshot.state : { type: "Idle" as const };
  const refresh = useCallback(() => setRefreshVersion(version => version + 1), []);
  return <><OperationalBranchSelectorContent state={state} purpose={purpose} branchId={branchId} locale={locale}
    onSelectBranch={onSelectBranch} onRetry={refresh} />{children?.(state, refresh)}</>;
};
