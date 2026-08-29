"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ProtectedPage, useSessionExpiryRedirect } from "../../../identity/presentation/components/auth-guard";
import { PageHeading, PresentationShell, StatusMessage, usePageI18n } from "../../../identity/presentation/components/presentation-shell";
import { CatalogProductDetailsContent } from "./catalog-components";
import { catalogQueryApiClient } from "./catalog-query-api.client";
import { safeCatalogReturnPath } from "./catalog-query-state";
import { catalogText } from "./catalog-presentation.i18n";
import type { CatalogApiResult, CatalogProductDetailsView } from "./catalog-presentation.types";

type DetailsState = { readonly requestKey: string; readonly type: "Loading" } | { readonly requestKey: string; readonly type: "Ready"; readonly value: CatalogProductDetailsView } | { readonly requestKey: string; readonly type: "Failed"; readonly result: Extract<CatalogApiResult<never>, { ok: false }> };

export function CatalogProductDetailsPage({ productId, branchId, returnTo }: { readonly productId: string; readonly branchId?: string; readonly returnTo?: string }) {
  const i18n = usePageI18n(), sessionExpired = useSessionExpiryRedirect(), [revision, setRevision] = useState(0);
  const requestKey = `${productId}\u0000${branchId ?? ""}\u0000${revision}`;
  const [loadedState, setState] = useState<DetailsState>({ requestKey, type: "Loading" });
  const state: DetailsState = loadedState.requestKey === requestKey ? loadedState : { requestKey, type: "Loading" };
  const safeReturnTo = safeCatalogReturnPath(returnTo);
  useEffect(() => {
    let active = true;
    void catalogQueryApiClient.productDetails(productId, branchId).then((result) => { if (!active) return; if (!result.ok && result.kind === "Unauthorized") { sessionExpired(); return; } setState(result.ok ? { requestKey, type: "Ready", value: result.value } : { requestKey, type: "Failed", result }); });
    return () => { active = false; };
  }, [branchId, productId, requestKey, sessionExpired]);
  return <ProtectedPage>{(actor) => <PresentationShell actor={actor} i18n={i18n}>
    {state.type === "Loading" ? <><PageHeading eyebrow={catalogText(i18n.locale, "eyebrow")} title={catalogText(i18n.locale, "details")} /><StatusMessage kind="info">{catalogText(i18n.locale, "loadingDetails")}</StatusMessage></> : null}
    {state.type === "Failed" ? <><PageHeading eyebrow={catalogText(i18n.locale, "eyebrow")} title={catalogText(i18n.locale, "details")} actions={<Link className="button button--secondary" href={safeReturnTo}>{catalogText(i18n.locale, "backToCatalog")}</Link>} /><StatusMessage kind={state.result.kind === "Forbidden" || state.result.kind === "NotFound" ? "warning" : "error"}>{state.result.kind === "Forbidden" ? catalogText(i18n.locale, "forbidden") : state.result.kind === "NotFound" ? catalogText(i18n.locale, "notFound") : catalogText(i18n.locale, "unavailable")} <button className="text-button" type="button" onClick={() => setRevision((value) => value + 1)}>{catalogText(i18n.locale, "retry")}</button></StatusMessage></> : null}
    {state.type === "Ready" ? <CatalogProductDetailsContent product={state.value} locale={i18n.locale} returnTo={safeReturnTo} /> : null}
  </PresentationShell>}</ProtectedPage>;
}
