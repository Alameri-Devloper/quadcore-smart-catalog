"use client";

import Link from "next/link";
import { useState } from "react";
import { AuthFormShell } from "../components/auth-components";
import { AsyncButton, FormField, PresentationShell, StatusMessage, formSubmit, usePageI18n } from "../components/presentation-shell";

export const RecoveryRequestPage = () => {
  const i18n = usePageI18n();
  const [workspaceCode, setWorkspaceCode] = useState("");
  const [username, setUsername] = useState("");
  const [state, setState] = useState<"Ready" | "RecoveryUnavailable">("Ready");
  const submit = () => setState("RecoveryUnavailable");
  return (
    <PresentationShell i18n={i18n} compact>
      <AuthFormShell i18n={i18n} title={i18n.t("recovery")} description={i18n.t("recoveryIntro")} footer={<Link href="/login">{i18n.t("backToLogin")}</Link>}>
        <form className="form-stack" onSubmit={formSubmit(submit)}>
          {state === "RecoveryUnavailable" ? <><StatusMessage kind="info">{i18n.t("recoveryGeneric")}</StatusMessage><StatusMessage kind="warning">{i18n.t("recoveryDeferred")}</StatusMessage></> : null}
          <FormField id="recoveryWorkspaceCode" label={i18n.t("workspaceCode")}>
            <input id="recoveryWorkspaceCode" value={workspaceCode} onChange={(event) => setWorkspaceCode(event.target.value)} required dir="ltr" autoCapitalize="none" />
          </FormField>
          <FormField id="recoveryUsername" label={i18n.t("username")}>
            <input id="recoveryUsername" value={username} onChange={(event) => setUsername(event.target.value)} required dir="ltr" autoCapitalize="none" />
          </FormField>
          <AsyncButton submitting={false} type="submit" className="button--full">{i18n.t("requestRecovery")}</AsyncButton>
        </form>
      </AuthFormShell>
    </PresentationShell>
  );
};
