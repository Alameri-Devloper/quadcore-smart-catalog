"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import { BranchManagementCoordinator, initialBranchManagementState } from "./branch-management.coordinator";
import type { BranchDraft, BranchField, BranchManagementFailure, BranchManagementState, BranchManagementView } from "./branch-management.types";
import { operationsText } from "./operations-presentation.i18n";
import { WorkspaceBranchApiClient } from "./workspace-branch-api.client";

interface BranchActions {
  readonly loadList: () => void;
  readonly select: (branchId: string) => void;
  readonly create: () => void;
  readonly change: (patch: Partial<BranchDraft>) => void;
  readonly cancel: () => void;
  readonly save: () => void;
  readonly loadDetail: () => void;
  readonly review: () => void;
}
const Failure = ({ kind, locale }: { readonly kind: BranchManagementFailure; readonly locale: Locale }) =>
  <p role="alert">{operationsText(locale, kind)}</p>;

const LatestBranch = ({ branch, locale }: { readonly branch: BranchManagementView; readonly locale: Locale }) => <dl className="branch-latest">
  <dt>{operationsText(locale, "code")}</dt><dd><bdi dir="ltr">{branch.code}</bdi></dd>
  <dt>{operationsText(locale, "displayName")}</dt><dd><bdi>{branch.displayName}</bdi></dd>
  <dt>{operationsText(locale, "sortOrder")}</dt><dd><bdi dir="ltr">{branch.sortOrder}</bdi></dd>
  <dt>{operationsText(locale, "status")}</dt><dd>{operationsText(locale, branch.status)}</dd>
</dl>;

export const BranchManagementContent = ({ state, locale, actions }: {
  readonly state: BranchManagementState; readonly locale: Locale; readonly actions: BranchActions;
}) => {
  const id = useId(), editorHeading = useRef<HTMLHeadingElement>(null), errorSummary = useRef<HTMLDivElement>(null);
  const { editor } = state;
  const draft = editor.type === "Closed" ? null : editor.draft;
  const selection = editor.type === "Edit" ? editor.branchId : editor.type;
  const summaryVisible = Boolean(state.failure || Object.keys(state.fields).length);
  useEffect(() => { if (editor.type !== "Closed") editorHeading.current?.focus(); }, [selection, editor.type]);
  useEffect(() => { if (summaryVisible) errorSummary.current?.focus(); }, [summaryVisible, state.failure, state.fields]);
  const t = (key: Parameters<typeof operationsText>[1]) => operationsText(locale, key);
  const field = (name: BranchField, readOnly = false) => {
    const error = state.fields[name];
    const codeConflict = name === "code" && state.failure === "CodeConflict";
    return <div className="branch-field" key={name}>
      <label htmlFor={`${id}-${name}`}>{t(name)}</label>
      <input id={`${id}-${name}`} name={name} type={name === "sortOrder" ? "number" : "text"}
        step={name === "sortOrder" ? "1" : undefined} dir={name === "displayName" ? "auto" : "ltr"}
        value={draft?.[name] ?? ""} readOnly={readOnly} required={!readOnly}
        aria-invalid={Boolean(error || codeConflict)} aria-describedby={error || codeConflict ? `${id}-${name}-error` : undefined}
        onChange={(event) => actions.change({ [name]: event.target.value })} />
      {error || codeConflict ? <span id={`${id}-${name}-error`}>{t(codeConflict ? "CodeConflict" : error!)}</span> : null}
    </div>;
  };
  return <section className="branch-management" aria-labelledby={`${id}-heading`}>
    <h3 id={`${id}-heading`}>{t("management")}</h3>
    <div className="branch-management-grid">
      <div className="branch-master">
        {state.list.type === "Idle" || state.list.type === "Loading" ? <p role="status" aria-live="polite">{t("branchLoading")}</p> : null}
        {state.list.type === "Failed" ? <><Failure kind={state.list.kind} locale={locale} />
          <button type="button" className="button button--quiet" disabled={state.pending} onClick={actions.loadList}>{t("retry")}</button></> : null}
        {state.list.type === "Ready" ? <>
          <button type="button" className="button button--primary" disabled={state.pending} onClick={actions.create}>{t("createBranch")}</button>
          {state.list.value.length === 0 ? <p role="status" aria-live="polite">{t("noBranches")}</p> : <ul className="branch-list">
            {state.list.value.map((branch) => <li key={branch.branchId}><button type="button" disabled={state.pending}
              aria-pressed={editor.type === "Edit" && editor.branchId === branch.branchId} onClick={() => actions.select(branch.branchId)}>
              <strong><bdi>{branch.displayName}</bdi></strong><bdi dir="ltr">{branch.code}</bdi><span>{t(branch.status)}</span>
            </button></li>)}
          </ul>}
        </> : null}
      </div>
      <div className="branch-editor" aria-busy={state.pending}>
        {state.saved ? <p role="status" aria-live="polite">{t("branchSaved")}</p> : null}
        {editor.type === "Closed" ? <p>{t("selectBranch")}</p> : <>
          <h4 ref={editorHeading} tabIndex={-1}>{t(editor.type === "Create" ? "createBranch" : "editBranch")}</h4>
          {summaryVisible ? <div ref={errorSummary} tabIndex={-1} className="branch-error-summary">
            {state.failure ? <Failure kind={state.failure} locale={locale} /> : <p role="alert">{t("validationSummary")}</p>}
            {Object.keys(state.fields).length ? <ul>{(Object.keys(state.fields) as BranchField[]).map((key) => <li key={key}><a href={`#${id}-${key}`}>{t(key)}</a></li>)}</ul> : null}
          </div> : null}
          {editor.type === "Edit" ? <>
            {editor.detail.type === "Idle" || editor.detail.type === "Loading" ? <p role="status" aria-live="polite">{t("detailLoading")}</p> : null}
            {editor.detail.type === "Failed" ? <><Failure kind={editor.detail.kind} locale={locale} />
              <button type="button" className="button button--quiet" disabled={state.pending} onClick={actions.loadDetail}>{t("retry")}</button></> : null}
            {editor.reviewRequired ? <section className="branch-conflict" aria-label={t("latestVersion")}>
              <p role="alert">{t("Conflict")} {t("reviewBeforeRetry")}</p>
              {editor.detail.type === "Ready" ? <><h5>{t("latestVersion")}</h5><LatestBranch branch={editor.detail.value} locale={locale} />
                <button type="button" className="button button--quiet" disabled={state.pending} onClick={actions.review}>{t("reviewed")}</button></> : null}
            </section> : null}
          </> : null}
          {draft ? <form noValidate onSubmit={(event) => { event.preventDefault(); actions.save(); }}>
            <fieldset disabled={state.pending}>
              <legend className="sr-only">{t(editor.type === "Create" ? "createBranch" : "editBranch")}</legend>
              {field("code", editor.type === "Edit")}{field("displayName")}{field("sortOrder")}
              {editor.type === "Edit" ? <div className="branch-field"><label htmlFor={`${id}-status`}>{t("status")}</label>
                <select id={`${id}-status`} value={draft.status} onChange={(event) => actions.change({ status: event.target.value as BranchDraft["status"] })}>
                  <option value="Active">{t("Active")}</option><option value="Inactive">{t("Inactive")}</option>
                </select></div> : null}
              <button type="submit" className="button button--primary" disabled={state.pending || (editor.type === "Edit" && (editor.reviewRequired || editor.detail.type !== "Ready"))}>
                {t(state.pending ? "branchSaving" : "save")}
              </button>
            </fieldset>
          </form> : null}
          <button type="button" className="button button--quiet" disabled={state.pending} onClick={actions.cancel}>{t("cancel")}</button>
        </>}
      </div>
    </div>
  </section>;
};

export const BranchManagementPanel = ({ locale, lifecycle, onAuthenticationRequired }: {
  readonly locale: Locale; readonly lifecycle: object; readonly onAuthenticationRequired: () => void;
}) => {
  const [snapshot, setSnapshot] = useState<{ lifecycle: object; state: BranchManagementState } | null>(null);
  const mounted = useRef<{ lifecycle: object; coordinator: BranchManagementCoordinator } | null>(null);
  useEffect(() => {
    const coordinator = new BranchManagementCoordinator(new WorkspaceBranchApiClient(), {
      onChange: (state) => setSnapshot({ lifecycle, state }), onAuthenticationRequired,
    });
    mounted.current = { lifecycle, coordinator };
    void Promise.resolve().then(() => coordinator.loadList());
    return () => { coordinator.dispose(); if (mounted.current?.coordinator === coordinator) mounted.current = null; };
  }, [lifecycle, onAuthenticationRequired]);
  const coordinator = () => mounted.current?.lifecycle === lifecycle ? mounted.current.coordinator : null;
  return <BranchManagementContent locale={locale} state={snapshot?.lifecycle === lifecycle ? snapshot.state : initialBranchManagementState()} actions={{
    loadList: () => { void coordinator()?.loadList(); }, select: (id) => { void coordinator()?.select(id); },
    create: () => coordinator()?.createDraft(), change: (patch) => coordinator()?.changeDraft(patch),
    cancel: () => coordinator()?.cancel(), save: () => { void coordinator()?.submit(); },
    loadDetail: () => { void coordinator()?.loadDetail(); }, review: () => coordinator()?.reviewLatest(),
  }} />;
};
