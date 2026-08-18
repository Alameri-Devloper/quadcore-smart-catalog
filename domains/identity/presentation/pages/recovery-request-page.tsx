"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthFormShell } from "../components/auth-components";
import { AsyncButton, FormField, PresentationShell, StatusMessage, formSubmit, usePageI18n } from "../components/presentation-shell";
import { identityApiClient } from "../identity-api.client";
import { currentBrowserTime } from "../identity-presentation.utils";
import { useRecoveryFlow } from "../recovery-flow-context";

type RequestState = "Idle" | "Submitting" | "Accepted" | "Unavailable" | "UnexpectedError";

export const RecoveryRequestPage = () => {
  const i18n = usePageI18n();
  const recoveryFlow = useRecoveryFlow();
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [username, setUsername] = useState("");
  const [state, setState] = useState<RequestState>("Idle");

  const submit = async () => {
    if (state === "Submitting") return;
    setState("Submitting");
    const result = await identityApiClient.requestRecovery({ workspaceCode, username });
    if (!result.ok) {
      setState(result.kind === "Unavailable" ? "Unavailable" : "UnexpectedError");
      return;
    }
    recoveryFlow.setFlow({
      recoveryReference: result.value.recoveryReference,
      resendAvailableAt: currentBrowserTime() + result.value.retryAfterSeconds * 1_000,
    });
    setState("Accepted");
  };

  return (
    <PresentationShell i18n={i18n} compact>
      <AuthFormShell i18n={i18n} title={i18n.t("recovery")} description={i18n.t("recoveryIntro")} footer={<Link href="/login">{i18n.t("backToLogin")}</Link>}>
        <form className="form-stack" onSubmit={formSubmit(submit)}>
          {state === "Accepted" ? <StatusMessage kind="info">{i18n.t("recoveryGeneric")}</StatusMessage> : null}
          {state === "Unavailable" ? <StatusMessage kind="warning">{i18n.t("recoveryDeferred")}</StatusMessage> : null}
          {state === "UnexpectedError" ? <StatusMessage kind="error">{i18n.t("unavailable")}</StatusMessage> : null}
          <FormField id="recoveryWorkspaceCode" label={i18n.t("workspaceCode")}>
            <input id="recoveryWorkspaceCode" value={workspaceCode} onChange={(event) => setWorkspaceCode(event.target.value)} required dir="ltr" autoCapitalize="none" disabled={state === "Submitting" || state === "Accepted"} />
          </FormField>
          <FormField id="recoveryUsername" label={i18n.t("username")}>
            <input id="recoveryUsername" value={username} onChange={(event) => setUsername(event.target.value)} required dir="ltr" autoCapitalize="none" disabled={state === "Submitting" || state === "Accepted"} />
          </FormField>
          {state === "Accepted"
            ? <Link className="button button--primary button--full" href="/recover-password/verify">{i18n.t("recoveryContinue")}</Link>
            : <AsyncButton submitting={state === "Submitting"} type="submit" className="button--full">{i18n.t("requestRecovery")}</AsyncButton>}
        </form>
      </AuthFormShell>
    </PresentationShell>
  );
};
