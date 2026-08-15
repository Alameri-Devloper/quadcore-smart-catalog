"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { AuthFormShell, PasswordField } from "../components/auth-components";
import { AsyncButton, FormField, PresentationShell, StatusMessage, formSubmit, usePageI18n } from "../components/presentation-shell";
import { isWesternOtp, normalizeWesternOtpDraft, passwordValidationCode, secondsRemaining } from "../identity-presentation.utils";

export const RecoveryVerifyPage = () => {
  const i18n = usePageI18n();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [availableAt] = useState(() => Date.now() + 60_000);
  const [remaining, setRemaining] = useState(60);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(secondsRemaining(availableAt, Date.now())), 1000);
    return () => { window.clearInterval(timer); setOtp(""); setNewPassword(""); setConfirmation(""); };
  }, [availableAt]);

  const submit = () => {
    if (!isWesternOtp(otp)) { setError(i18n.t("invalidOtp")); return; }
    const validation = passwordValidationCode(newPassword);
    if (validation) { setError(i18n.t(validation === "PasswordLength" ? "passwordLength" : "passwordAllSpace")); return; }
    if (newPassword !== confirmation) { setError(i18n.t("passwordMismatch")); return; }
    setError(null); setUnavailable(true);
  };

  return (
    <PresentationShell i18n={i18n} compact>
      <AuthFormShell i18n={i18n} title={i18n.t("verifyRecovery")} description={i18n.t("otpHint")} footer={<Link href="/login">{i18n.t("backToLogin")}</Link>}>
        <form className="form-stack" onSubmit={formSubmit(submit)} noValidate>
          {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
          {unavailable ? <StatusMessage kind="warning">{i18n.t("recoveryDeferred")}</StatusMessage> : null}
          <FormField id="otp" label={i18n.t("otp")} hint={i18n.t("otpHint")} error={!error ? null : undefined}>
            <input id="otp" className="otp-input technical-value" value={otp} onChange={(event) => setOtp(normalizeWesternOtpDraft(event.target.value))} onPaste={(event) => { event.preventDefault(); setOtp(normalizeWesternOtpDraft(event.clipboardData.getData("text"))); }} inputMode="numeric" pattern="[0-9]{8}" maxLength={8} autoComplete="one-time-code" dir="ltr" aria-describedby="otp-hint" />
          </FormField>
          <PasswordField id="recoveryNewPassword" label={i18n.t("newPassword")} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" i18n={i18n} />
          <PasswordField id="recoveryConfirmPassword" label={i18n.t("confirmPassword")} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" i18n={i18n} />
          <AsyncButton type="submit" submitting={false} className="button--full">{i18n.t("verifyRecovery")}</AsyncButton>
          <button type="button" className="button button--quiet button--full" disabled={remaining > 0} onClick={() => setUnavailable(true)}>
            {remaining > 0 ? i18n.t("resendIn", { seconds: remaining }) : i18n.t("resend")}
          </button>
        </form>
      </AuthFormShell>
    </PresentationShell>
  );
};
