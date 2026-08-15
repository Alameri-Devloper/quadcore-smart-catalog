"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, type FormEvent, type ReactNode } from "react";
import { identityApiClient } from "../identity-api.client";
import type { ApiFailureKind, SafeActorView } from "../identity-presentation.types";
import { createAsyncActionGate, isLogoutSafelyConfirmed } from "../identity-presentation.utils";
import { useIdentityI18n, type IdentityI18n } from "../identity-i18n";

export const PresentationShell = ({
  children,
  actor,
  i18n,
  compact = false,
}: {
  readonly children: ReactNode;
  readonly actor?: SafeActorView;
  readonly i18n: IdentityI18n;
  readonly compact?: boolean;
}) => {
  const router = useRouter();
  const [logoutGate] = useState(createAsyncActionGate);
  const [logoutSubmitting, setLogoutSubmitting] = useState(false);
  const [logoutError, setLogoutError] = useState(false);
  const logout = async () => {
    if (logoutGate.isActive()) return;
    setLogoutSubmitting(true);
    setLogoutError(false);
    const result = await logoutGate.run(() => identityApiClient.logout());
    setLogoutSubmitting(false);
    if (result && isLogoutSafelyConfirmed(result)) {
      router.replace("/login");
      router.refresh();
      return;
    }
    setLogoutError(true);
  };

  return (
    <div className="identity-app" dir={i18n.dir}>
      <a className="skip-link" href="#main-content">{i18n.locale === "ar" ? "انتقل إلى المحتوى" : "Skip to content"}</a>
      <header className="app-header">
        <div className="app-header__inner">
          <Link href="/" className="brand-link" aria-label={i18n.t("brand")}>
            <span className="brand-mark" aria-hidden="true">Q</span>
            <span>{i18n.t("brand")}</span>
          </Link>
          <div className="app-header__actions">
            {actor?.role === "Owner" ? <Link className="header-link" href="/members">{i18n.t("members")}</Link> : null}
            {actor ? <span className="actor-name">{actor.displayName}</span> : null}
            <button className="button button--quiet button--small" type="button" onClick={() => i18n.setLocale(i18n.locale === "ar" ? "en" : "ar")}>
              {i18n.t("language")}
            </button>
            {actor ? <button className="button button--quiet button--small" type="button" disabled={logoutSubmitting} aria-busy={logoutSubmitting} onClick={logout}>{i18n.t("signOut")}</button> : null}
          </div>
        </div>
      </header>
      <main id="main-content" className={compact ? "page-shell page-shell--compact" : "page-shell"}>
        {logoutError ? <StatusMessage kind="error">{i18n.t("signOutUnconfirmed")}</StatusMessage> : null}
        {children}
      </main>
    </div>
  );
};

export const PageHeading = ({ eyebrow, title, description, actions }: {
  readonly eyebrow?: string;
  readonly title: string;
  readonly description?: string;
  readonly actions?: ReactNode;
}) => (
  <div className="page-heading">
    <div>
      {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
      <h1>{title}</h1>
      {description ? <p className="page-description">{description}</p> : null}
    </div>
    {actions ? <div className="page-heading__actions">{actions}</div> : null}
  </div>
);

export const Card = ({ children, className = "" }: { readonly children: ReactNode; readonly className?: string }) => (
  <section className={`surface-card ${className}`.trim()}>{children}</section>
);

export const StatusMessage = ({ kind, children }: {
  readonly kind: "info" | "success" | "warning" | "error";
  readonly children: ReactNode;
}) => <div className={`status-message status-message--${kind}`} role={kind === "error" ? "alert" : "status"} aria-live="polite">{children}</div>;

export const AsyncButton = ({ submitting, children, className = "", ...props }: {
  readonly submitting: boolean;
  readonly children: ReactNode;
  readonly className?: string;
} & Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, "children">) => (
  <button {...props} className={`button button--primary ${className}`.trim()} disabled={submitting || props.disabled} aria-busy={submitting}>
    {children}
  </button>
);

export const failureMessageKey = (kind: ApiFailureKind, code?: string): string => {
  if (code === "LastActiveOwnerProtected") return "lastOwnerProtected";
  if (kind === "Conflict") return "conflict";
  if (kind === "Forbidden") return "forbidden";
  if (kind === "ValidationError") return "validationError";
  return "unavailable";
};

export const FormField = ({ id, label, hint, error, children }: {
  readonly id: string;
  readonly label: string;
  readonly hint?: string;
  readonly error?: string | null;
  readonly children: ReactNode;
}) => (
  <div className="form-field">
    <label htmlFor={id}>{label}</label>
    {children}
    {hint ? <p id={`${id}-hint`} className="field-hint">{hint}</p> : null}
    {error ? <p id={`${id}-error`} className="field-error" role="alert">{error}</p> : null}
  </div>
);

export const formSubmit = (handler: () => void | Promise<void>) => (event: FormEvent<HTMLFormElement>) => {
  event.preventDefault();
  void handler();
};

export const usePageI18n = useIdentityI18n;
