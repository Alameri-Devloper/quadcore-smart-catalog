"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthFormShell, PasswordField } from "../components/auth-components";
import { AsyncButton, FormField, PresentationShell, StatusMessage, formSubmit, usePageI18n } from "../components/presentation-shell";
import { identityApiClient } from "../identity-api.client";
import { currentBrowserTime, isWesternOtp, normalizeWesternOtpDraft, passwordValidationCode, secondsRemaining } from "../identity-presentation.utils";
import { useRecoveryFlow } from "../recovery-flow-context";

type VerifyState = "Idle" | "Verifying" | "Verified" | "Resending" | "Resetting" | "Completed" | "Invalid" | "Throttled" | "Unavailable";

export const RecoveryVerifyPage = () => {
  const i18n = usePageI18n();
  const router = useRouter();
  const recoveryFlow = useRecoveryFlow();
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [codeVerified, setCodeVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [state, setState] = useState<VerifyState>("Idle");
  const [remaining, setRemaining] = useState(() => recoveryFlow.flow
    ? secondsRemaining(recoveryFlow.flow.resendAvailableAt, currentBrowserTime())
    : 0);

  useEffect(() => {
    const timer = window.setInterval(() => setRemaining(recoveryFlow.flow
      ? secondsRemaining(recoveryFlow.flow.resendAvailableAt, currentBrowserTime())
      : 0), 1_000);
    return () => {
      window.clearInterval(timer);
      setOtp("");
      setNewPassword("");
      setConfirmation("");
    };
  }, [recoveryFlow.flow]);

  if (!recoveryFlow.flow) {
    return (
      <PresentationShell i18n={i18n} compact>
        <AuthFormShell i18n={i18n} title={i18n.t("verifyRecovery")} description={i18n.t("otpHint")} footer={<Link href="/login">{i18n.t("backToLogin")}</Link>}>
          <StatusMessage kind="warning">{i18n.t("recoveryFlowMissing")}</StatusMessage>
          <Link className="button button--primary button--full" href="/recover-password">{i18n.t("startRecoveryAgain")}</Link>
        </AuthFormShell>
      </PresentationShell>
    );
  }

  const verify = async () => {
    if (!isWesternOtp(otp)) { setError(i18n.t("invalidOtp")); return; }
    setError(null);
    setState("Verifying");
    const result = await identityApiClient.verifyRecovery(recoveryFlow.flow!.recoveryReference, otp);
    if (!result.ok) {
      setState(result.kind === "Unavailable" ? "Unavailable" : "Invalid");
      return;
    }
    setOtp("");
    setCodeVerified(true);
    setState("Verified");
  };

  const reset = async () => {
    const validation = passwordValidationCode(newPassword);
    if (validation) { setError(i18n.t(validation === "PasswordLength" ? "passwordLength" : "passwordAllSpace")); return; }
    if (newPassword !== confirmation) { setError(i18n.t("passwordMismatch")); return; }
    setError(null);
    setState("Resetting");
    const result = await identityApiClient.resetRecovery(recoveryFlow.flow!.recoveryReference, newPassword);
    if (!result.ok) {
      setState(result.kind === "Unavailable" ? "Unavailable" : "Invalid");
      return;
    }
    setNewPassword("");
    setConfirmation("");
    recoveryFlow.clearFlow();
    setState("Completed");
    router.replace("/login");
  };

  const resend = async () => {
    if (remaining > 0 || state === "Resending") return;
    setState("Resending");
    const result = await identityApiClient.resendRecovery(recoveryFlow.flow!.recoveryReference);
    if (!result.ok) {
      setState(result.kind === "Throttled" ? "Throttled" : result.kind === "Unavailable" ? "Unavailable" : "Invalid");
      return;
    }
    setOtp("");
    recoveryFlow.setFlow({
      recoveryReference: result.value.recoveryReference,
      resendAvailableAt: currentBrowserTime() + result.value.retryAfterSeconds * 1_000,
    });
    setState("Idle");
  };

  const verified = codeVerified;
  return (
    <PresentationShell i18n={i18n} compact>
      <AuthFormShell i18n={i18n} title={i18n.t("verifyRecovery")} description={i18n.t("otpHint")} footer={<Link href="/login">{i18n.t("backToLogin")}</Link>}>
        <form className="form-stack" onSubmit={formSubmit(verified ? reset : verify)} noValidate>
          {error ? <StatusMessage kind="error">{error}</StatusMessage> : null}
          {state === "Invalid" ? <StatusMessage kind="error">{i18n.t("recoveryCodeRejected")}</StatusMessage> : null}
          {state === "Throttled" ? <StatusMessage kind="warning">{i18n.t("recoveryThrottled")}</StatusMessage> : null}
          {state === "Unavailable" ? <StatusMessage kind="warning">{i18n.t("recoveryDeferred")}</StatusMessage> : null}
          {verified ? <StatusMessage kind="success">{i18n.t("recoveryVerified")}</StatusMessage> : null}
          {state === "Completed" ? <StatusMessage kind="success">{i18n.t("recoveryResetCompleted")}</StatusMessage> : null}
          {!verified ? <>
            <FormField id="otp" label={i18n.t("otp")} hint={i18n.t("otpHint")} error={!error ? null : undefined}>
              <input id="otp" className="otp-input technical-value" value={otp} onChange={(event) => setOtp(normalizeWesternOtpDraft(event.target.value))} onPaste={(event) => { event.preventDefault(); setOtp(normalizeWesternOtpDraft(event.clipboardData.getData("text"))); }} inputMode="numeric" pattern="[0-9]{8}" maxLength={8} autoComplete="one-time-code" dir="ltr" aria-describedby="otp-hint" disabled={state === "Verifying" || state === "Resending"} />
            </FormField>
            <AsyncButton type="submit" submitting={state === "Verifying"} className="button--full">{i18n.t("verifyRecovery")}</AsyncButton>
            <button type="button" className="button button--quiet button--full" disabled={remaining > 0 || state === "Resending"} onClick={resend}>
              {remaining > 0 ? i18n.t("resendIn", { seconds: remaining }) : i18n.t("resend")}
            </button>
          </> : <>
            <PasswordField id="recoveryNewPassword" label={i18n.t("newPassword")} value={newPassword} onChange={(event) => setNewPassword(event.target.value)} autoComplete="new-password" i18n={i18n} />
            <PasswordField id="recoveryConfirmPassword" label={i18n.t("confirmPassword")} value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="new-password" i18n={i18n} />
            <AsyncButton type="submit" submitting={state === "Resetting"} className="button--full">{i18n.t("resetPassword")}</AsyncButton>
          </>}
        </form>
      </AuthFormShell>
    </PresentationShell>
  );
};
