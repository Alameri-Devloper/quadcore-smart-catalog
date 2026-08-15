"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { identityApiClient } from "../identity-api.client";
import { passwordValidationCode } from "../identity-presentation.utils";
import { ProtectedPage, useSessionExpiryRedirect } from "../components/auth-guard";
import { AuthFormShell, PasswordField } from "../components/auth-components";
import { AsyncButton, PresentationShell, StatusMessage, formSubmit, usePageI18n } from "../components/presentation-shell";

const ChangePasswordContent = ({ restricted }: { readonly restricted: boolean }) => {
  const i18n = usePageI18n();
  const router = useRouter();
  const redirectExpired = useSessionExpiryRedirect();
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  useEffect(() => () => { setCurrentPassword(""); setNewPassword(""); setConfirmation(""); }, []);

  const submit = async () => {
    const validation = passwordValidationCode(newPassword);
    if (validation) { setError(i18n.t(validation === "PasswordLength" ? "passwordLength" : "passwordAllSpace")); return; }
    if (newPassword !== confirmation) { setError(i18n.t("passwordMismatch")); return; }
    setSubmitting(true); setError(null);
    const result = await identityApiClient.changePassword({ currentPassword, newPassword });
    setSubmitting(false);
    if (!result.ok) {
      if (result.kind === "Unauthorized") { redirectExpired(); return; }
      setError(result.code === "InvalidCurrentPassword" ? i18n.t("invalidCurrentPassword") : i18n.t("validationError"));
      return;
    }
    setCurrentPassword(""); setNewPassword(""); setConfirmation("");
    router.refresh();
    router.replace("/");
  };

  return (
    <PresentationShell i18n={i18n} compact>
      <AuthFormShell i18n={i18n} title={i18n.t("changePassword")} description={i18n.t("changePasswordIntro")}>
        <form className="form-stack" onSubmit={formSubmit(submit)} noValidate>
          {restricted ? <StatusMessage kind="warning">{i18n.t("restrictedNotice")}</StatusMessage> : null}
          {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
          <PasswordField id="currentPassword" label={i18n.t("currentPassword")} value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} autoComplete="current-password" i18n={i18n} />
          <PasswordField id="newPassword" label={i18n.t("newPassword")} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" i18n={i18n} />
          <PasswordField id="confirmPassword" label={i18n.t("confirmPassword")} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" i18n={i18n} />
          <p className="field-hint">{i18n.t("passwordRules")}</p>
          <AsyncButton type="submit" submitting={submitting} className="button--full">{submitting ? i18n.t("submitting") : i18n.t("changePassword")}</AsyncButton>
        </form>
      </AuthFormShell>
    </PresentationShell>
  );
};

export const ChangePasswordPage = () => (
  <ProtectedPage allowRestricted>{(actor) => <ChangePasswordContent restricted={actor.sessionClass === "Restricted" || actor.passwordChangeRequired} />}</ProtectedPage>
);
