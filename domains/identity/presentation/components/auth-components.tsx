"use client";

import Link from "next/link";
import { useState, type ChangeEvent, type ReactNode } from "react";
import type { IdentityI18n } from "../identity-i18n";
import { Card, FormField } from "./presentation-shell";

export const AuthFormShell = ({ i18n, title, description, children, footer }: {
  readonly i18n: IdentityI18n;
  readonly title: string;
  readonly description: string;
  readonly children: ReactNode;
  readonly footer?: ReactNode;
}) => (
  <div className="auth-layout">
    <div className="auth-brand-panel" aria-hidden="true">
      <span className="auth-brand-panel__mark">Q</span>
      <p>{i18n.t("brand")}</p>
    </div>
    <Card className="auth-card">
      <div className="auth-card__heading">
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {children}
      {footer ? <div className="auth-card__footer">{footer}</div> : null}
    </Card>
  </div>
);

export const PasswordField = ({ id, label, value, onChange, autoComplete, i18n, error, required = true }: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  readonly autoComplete: string;
  readonly i18n: IdentityI18n;
  readonly error?: string | null;
  readonly required?: boolean;
}) => {
  const [visible, setVisible] = useState(false);
  return (
    <FormField id={id} label={label} error={error}>
      <div className="password-control">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          value={value}
          onChange={onChange}
          autoComplete={autoComplete}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : undefined}
        />
        <button type="button" className="password-toggle" aria-label={visible ? i18n.t("hidePassword") : i18n.t("showPassword")} aria-pressed={visible} onClick={() => setVisible((current) => !current)}>
          {visible ? (i18n.locale === "ar" ? "إخفاء" : "Hide") : (i18n.locale === "ar" ? "إظهار" : "Show")}
        </button>
      </div>
    </FormField>
  );
};

export const AuthFooterLinks = ({ i18n, recovery = true }: { readonly i18n: IdentityI18n; readonly recovery?: boolean }) => (
  <div className="auth-links">
    {recovery ? <Link href="/recover-password">{i18n.t("forgotPassword")}</Link> : null}
    {!recovery ? <Link href="/login">{i18n.t("backToLogin")}</Link> : null}
  </div>
);
