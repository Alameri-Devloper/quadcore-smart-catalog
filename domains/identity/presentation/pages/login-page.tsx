"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { identityApiClient } from "../identity-api.client";
import { REMEMBERED_WORKSPACE_CODE_STORAGE_NAME, safeReturnPath } from "../identity-presentation.utils";
import { AsyncButton, FormField, PresentationShell, StatusMessage, formSubmit, usePageI18n } from "../components/presentation-shell";
import { AuthFormShell, PasswordField } from "../components/auth-components";

export const LoginPage = () => {
  const i18n = usePageI18n();
  const router = useRouter();
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [failure, setFailure] = useState(false);
  const [expired, setExpired] = useState(false);
  const [returnTo, setReturnTo] = useState("/");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const saved = window.localStorage.getItem(REMEMBERED_WORKSPACE_CODE_STORAGE_NAME);
      if (saved) { setWorkspaceCode(saved); setRemember(true); }
      const search = new URLSearchParams(window.location.search);
      setReturnTo(safeReturnPath(search.get("returnTo"), "/"));
      setExpired(search.get("expired") === "1");
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  const submit = async () => {
    setSubmitting(true);
    setFailure(false);
    const result = await identityApiClient.login({ workspaceCode, username, password });
    setPassword("");
    setSubmitting(false);
    if (!result.ok) { setFailure(true); return; }
    if (remember) window.localStorage.setItem(REMEMBERED_WORKSPACE_CODE_STORAGE_NAME, workspaceCode);
    else window.localStorage.removeItem(REMEMBERED_WORKSPACE_CODE_STORAGE_NAME);
    router.replace(result.value.passwordChangeRequired || result.value.sessionClass === "Restricted" ? "/change-password" : returnTo);
  };

  return (
    <PresentationShell i18n={i18n} compact>
      <AuthFormShell i18n={i18n} title={i18n.t("signIn")} description={i18n.t("loginIntro")} footer={<Link href="/recover-password">{i18n.t("forgotPassword")}</Link>}>
        <form className="form-stack" onSubmit={formSubmit(submit)} noValidate>
          {expired ? <StatusMessage kind="warning">{i18n.locale === "ar" ? "انتهت جلستك. سجّل الدخول للعودة بأمان إلى الصفحة السابقة، ولن يُعاد إرسال أي إجراء تلقائيًا." : "Your session expired. Sign in to return safely; no previous action will be resubmitted automatically."}</StatusMessage> : null}
          {failure ? <StatusMessage kind="error">{i18n.t("genericLoginFailure")}</StatusMessage> : null}
          <FormField id="workspaceCode" label={i18n.t("workspaceCode")}>
            <input id="workspaceCode" name="workspaceCode" value={workspaceCode} onChange={(event) => setWorkspaceCode(event.target.value)} autoComplete="organization" autoCapitalize="none" spellCheck={false} required dir="ltr" />
          </FormField>
          <FormField id="username" label={i18n.t("username")}>
            <input id="username" name="username" value={username} onChange={(event) => setUsername(event.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} required dir="ltr" />
          </FormField>
          <PasswordField id="password" label={i18n.t("password")} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" i18n={i18n} />
          <label className="checkbox-row">
            <input type="checkbox" checked={remember} onChange={(event) => setRemember(event.target.checked)} />
            <span>{i18n.t("rememberWorkspace")}</span>
          </label>
          <AsyncButton type="submit" submitting={submitting} className="button--full">{submitting ? i18n.t("loading") : i18n.t("signIn")}</AsyncButton>
        </form>
      </AuthFormShell>
    </PresentationShell>
  );
};
