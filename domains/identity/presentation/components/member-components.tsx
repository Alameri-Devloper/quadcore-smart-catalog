"use client";

import { useEffect, useState, type ReactNode } from "react";
import type { IdentityI18n } from "../identity-i18n";
import type {
  AccountStatus,
  BranchReferenceView,
  BranchScopeDraft,
  PermissionDefinitionView,
  WorkspaceRole,
} from "../identity-presentation.types";
import { PasswordField } from "./auth-components";
import { StatusMessage } from "./presentation-shell";

export const RoleBadge = ({ role, i18n }: { readonly role: WorkspaceRole; readonly i18n: IdentityI18n }) => (
  <span className={`badge badge--${role.toLowerCase()}`}>{i18n.t(role === "Owner" ? "owner" : "staff")}</span>
);

export const MemberStatusBadge = ({ status, i18n }: { readonly status: AccountStatus; readonly i18n: IdentityI18n }) => {
  const key = status === "PendingActivation" ? "pendingActivation" : status.toLowerCase();
  return <span className={`badge badge--${status.toLowerCase()}`}>{i18n.t(key)}</span>;
};

export const PermissionSelector = ({ definitions, selected, onChange, i18n, disabled = false }: {
  readonly definitions: readonly PermissionDefinitionView[];
  readonly selected: readonly string[];
  readonly onChange: (codes: readonly string[]) => void;
  readonly i18n: IdentityI18n;
  readonly disabled?: boolean;
}) => {
  const modules = [...new Set(definitions.filter((item) => item.assignableToStaff).map((item) => item.module))];
  const toggle = (code: string) => onChange(selected.includes(code)
    ? selected.filter((item) => item !== code)
    : [...selected, code].sort());
  return (
    <div className="permission-groups">
      {modules.map((module) => (
        <fieldset className="permission-group" key={module} disabled={disabled}>
          <legend>{module}</legend>
          <div className="permission-grid">
            {definitions.filter((definition) => definition.module === module && definition.assignableToStaff).map((definition) => {
              const text = i18n.permissionText(definition);
              return (
                <label key={definition.code} className={`permission-option${definition.sensitive ? " permission-option--sensitive" : ""}`}>
                  <input type="checkbox" checked={selected.includes(definition.code)} onChange={() => toggle(definition.code)} />
                  <span>
                    <strong>{text.name}</strong>
                    {definition.sensitive ? <span className="sensitive-label">{i18n.t("sensitivePermission")}</span> : null}
                    <small>{text.description}</small>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>
      ))}
    </div>
  );
};

export const BranchScopeSelector = ({ scope, references, onChange, i18n, owner = false, error }: {
  readonly scope: BranchScopeDraft;
  readonly references: readonly BranchReferenceView[];
  readonly onChange: (scope: BranchScopeDraft) => void;
  readonly i18n: IdentityI18n;
  readonly owner?: boolean;
  readonly error?: string | null;
}) => {
  if (owner) return <StatusMessage kind="info">{i18n.t("ownerAccessExplanation")}</StatusMessage>;
  const selectType = (type: BranchScopeDraft["type"]) => onChange({ type, branchIds: [] });
  const toggleBranch = (branchId: string) => onChange({
    type: "SelectedBranches",
    branchIds: scope.branchIds.includes(branchId)
      ? scope.branchIds.filter((item) => item !== branchId)
      : [...scope.branchIds, branchId].sort(),
  });
  return (
    <fieldset className="branch-scope" aria-describedby={error ? "branch-scope-error" : undefined}>
      <legend>{i18n.t("branchScope")}</legend>
      <label className="choice-card">
        <input type="radio" name="branchScope" checked={scope.type === "AllBranches"} onChange={() => selectType("AllBranches")} />
        <span><strong>{i18n.t("allBranches")}</strong></span>
      </label>
      <label className="choice-card">
        <input type="radio" name="branchScope" checked={scope.type === "SelectedBranches"} onChange={() => selectType("SelectedBranches")} />
        <span><strong>{i18n.t("selectedBranches")}</strong></span>
      </label>
      {scope.type === "SelectedBranches" ? (
        <div className="branch-options">
          {references.length === 0 ? <p className="field-hint">{i18n.t("noBranchesAvailable")}</p> : references.map((reference) => (
            <label key={reference.branchId} className="branch-option technical-value">
              <input type="checkbox" checked={scope.branchIds.includes(reference.branchId)} onChange={() => toggleBranch(reference.branchId)} />
              <span dir="ltr">{reference.branchId}</span>
            </label>
          ))}
        </div>
      ) : null}
      {error ? <p id="branch-scope-error" className="field-error" role="alert">{error}</p> : null}
    </fieldset>
  );
};

export const TemporaryPasswordControl = ({ value, onChange, onGenerate, i18n, error, id = "temporaryPassword" }: {
  readonly value: string;
  readonly onChange: (value: string) => void;
  readonly onGenerate: () => void;
  readonly i18n: IdentityI18n;
  readonly error?: string | null;
  readonly id?: string;
}) => (
  <div className="stack-sm">
    <PasswordField id={id} label={i18n.t("temporaryPassword")} value={value} onChange={(event) => onChange(event.target.value)} autoComplete="new-password" i18n={i18n} error={error} />
    <p className="field-hint">{i18n.t("passwordRules")}</p>
    <button className="button button--secondary" type="button" onClick={onGenerate}>{i18n.t("generatePassword")}</button>
  </div>
);

export const TemporaryPasswordOnce = ({ password, i18n }: { readonly password: string; readonly i18n: IdentityI18n }) => {
  const [copied, setCopied] = useState(false);
  useEffect(() => () => setCopied(false), []);
  const copy = async () => {
    await navigator.clipboard.writeText(password);
    setCopied(true);
  };
  return (
    <div className="temporary-once">
      <StatusMessage kind="warning">{i18n.t("temporaryOnce")}</StatusMessage>
      <div className="copy-row">
        <code dir="ltr">{password}</code>
        <button type="button" className="button button--secondary" onClick={copy}>{copied ? i18n.t("copied") : i18n.t("copy")}</button>
      </div>
    </div>
  );
};

export const ConfirmationField = ({ checked, onChange, i18n }: {
  readonly checked: boolean;
  readonly onChange: (checked: boolean) => void;
  readonly i18n: IdentityI18n;
}) => (
  <label className="confirmation-field">
    <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} />
    <span>{i18n.t("confirmAction")}</span>
  </label>
);

export const DetailSection = ({ title, description, children, className = "" }: {
  readonly title: string;
  readonly description?: string;
  readonly children: ReactNode;
  readonly className?: string;
}) => (
  <section className={`detail-section ${className}`.trim()}>
    <div className="detail-section__heading"><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
    {children}
  </section>
);

export const LabeledValue = ({ label, children, technical = false }: { readonly label: string; readonly children: ReactNode; readonly technical?: boolean }) => (
  <div className="labeled-value"><dt>{label}</dt><dd className={technical ? "technical-value" : undefined}>{children}</dd></div>
);
