"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { identityApiClient } from "../identity-api.client";
import type { AuthViewState, SafeActorView } from "../identity-presentation.types";
import { authViewStateFromResult, safeReturnPath } from "../identity-presentation.utils";
import { PresentationShell, StatusMessage, usePageI18n } from "./presentation-shell";

export const useAuthViewState = (): { readonly state: AuthViewState; readonly refresh: () => void } => {
  const [state, setState] = useState<AuthViewState>({ type: "Loading" });
  const [revision, setRevision] = useState(0);
  useEffect(() => {
    let active = true;
    void identityApiClient.me().then((result) => {
      if (!active) return;
      setState(authViewStateFromResult(result));
    });
    return () => { active = false; };
  }, [revision]);
  return { state, refresh: () => setRevision((value) => value + 1) };
};

export const useSessionExpiryRedirect = () => {
  const router = useRouter();
  return useCallback(() => {
    const returnTo = safeReturnPath(`${window.location.pathname}${window.location.search}`, "/");
    router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}&expired=1`);
  }, [router]);
};

export const ProtectedPage = ({ children, ownerOnly = false, allowRestricted = false }: {
  readonly children: (actor: SafeActorView) => ReactNode;
  readonly ownerOnly?: boolean;
  readonly allowRestricted?: boolean;
}) => {
  const { state, refresh } = useAuthViewState();
  const router = useRouter();
  const i18n = usePageI18n();

  useEffect(() => {
    if (state.type === "Unauthenticated") {
      const returnTo = safeReturnPath(`${window.location.pathname}${window.location.search}`, "/");
      router.replace(`/login?returnTo=${encodeURIComponent(returnTo)}`);
    } else if (state.type === "Restricted" && !allowRestricted) {
      router.replace("/change-password");
    }
  }, [allowRestricted, router, state]);

  if (state.type === "Loading" || state.type === "Unauthenticated" || (state.type === "Restricted" && !allowRestricted)) {
    return <PresentationShell i18n={i18n} compact><StatusMessage kind="info">{i18n.t("loading")}</StatusMessage></PresentationShell>;
  }
  if (state.type === "Unavailable") {
    return <PresentationShell i18n={i18n} compact><StatusMessage kind="error">{i18n.t("unavailable")} <button className="text-button" type="button" onClick={refresh}>{i18n.t("refresh")}</button></StatusMessage></PresentationShell>;
  }
  const actor = state.actor;
  if (ownerOnly && actor.role !== "Owner") {
    return <PresentationShell i18n={i18n} actor={actor} compact><StatusMessage kind="error">{i18n.t("forbidden")}</StatusMessage></PresentationShell>;
  }
  return <>{children(actor)}</>;
};
