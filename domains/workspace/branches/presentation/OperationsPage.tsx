"use client";

import { useRouter, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { ProtectedPage, useSessionExpiryRedirect } from "../../../identity/presentation/components/auth-guard";
import { PageHeading, PresentationShell, StatusMessage, usePageI18n } from "../../../identity/presentation/components/presentation-shell";
import { useOperationalManagementCapabilities } from "../../../identity/presentation/operational-management-capabilities.context";
import type { Locale, SafeActorView } from "../../../identity/presentation/identity-presentation.types";
import type { OperationalManagementCapabilityState } from "../../../identity/presentation/operational-management-capabilities.types";
import { OperationsContextNavigation, OperationsNavigation } from "./OperationsNavigation";
import { operationsText } from "./operations-presentation.i18n";
import { BranchManagementPanel } from "./BranchManagementPanel";
import { OperationalBranchSelector } from "./OperationalBranchSelector";
import { operationalBranchPurpose, operationsContextHref, resolveOperationsQuery, type OperationsQueryInput } from "./operations-query-state";
import type { OperationalBranchPurpose } from "./operational-branch-selector.types";

export const OperationsContent = ({ state, sectionValues, locale, onRetry, branchManagement, query, operationalSelector }: {
  readonly state: OperationalManagementCapabilityState;
  readonly sectionValues: readonly string[];
  readonly locale: Locale;
  readonly onRetry: () => void;
  readonly branchManagement?: ReactNode;
  readonly query?: OperationsQueryInput;
  readonly operationalSelector?: (purpose: OperationalBranchPurpose, branchId: string | null) => ReactNode;
}) => {
  const heading = <PageHeading title={operationsText(locale, "title")} description={operationsText(locale, "intro")} />;
  if (state.type === "Idle" || state.type === "Loading") return <>{heading}<StatusMessage kind="info">{operationsText(locale, "loading")}</StatusMessage></>;
  if (state.type === "Failed") {
    const key = state.kind === "AuthenticationRequired" ? "expired"
      : state.kind === "ForbiddenForRestrictedSession" ? "restricted"
      : state.kind === "Forbidden" ? "forbidden" : "unavailable";
    return <>{heading}<StatusMessage kind="error">
      <p>{operationsText(locale, key)}</p>
      {key === "unavailable" ? <button className="button button--quiet" type="button" onClick={onRetry}>{operationsText(locale, "retry")}</button> : null}
    </StatusMessage></>;
  }
  const { sections, context, branchId } = resolveOperationsQuery(query ?? { getAll: (key) => key === "section" ? sectionValues : [] }, state.value);
  const purpose = operationalBranchPurpose(context);
  return <>{heading}{context ? <>
    <OperationsNavigation sections={sections} selected={context.section} locale={locale} />
    <section className="surface-card" aria-labelledby="operations-area-heading">
      <h2 id="operations-area-heading">{operationsText(locale, context.section)}</h2>
      <OperationsContextNavigation context={context} locale={locale} />
      {purpose ? <>
        {operationalSelector?.(purpose, branchId)}
        <p>{operationsText(locale, "branchContextFoundation")}</p>
      </> : context.section === "Branches" ? branchManagement : <p>{operationsText(locale, "workspacePricingFoundation")}</p>}
    </section>
  </> : <StatusMessage kind="info">{operationsText(locale, "empty")}</StatusMessage>}</>;
};

const AuthenticatedOperations = ({ actor }: { readonly actor: SafeActorView }) => {
  const i18n = usePageI18n();
  const search = useSearchParams();
  const router = useRouter();
  const { state, refresh } = useOperationalManagementCapabilities();
  const redirectExpired = useSessionExpiryRedirect();
  return <PresentationShell actor={actor} i18n={i18n}>
    <OperationsContent state={state} sectionValues={search.getAll("section")} query={search} locale={i18n.locale} onRetry={refresh}
      branchManagement={<BranchManagementPanel locale={i18n.locale} lifecycle={actor} onAuthenticationRequired={redirectExpired} />}
      operationalSelector={(purpose, branchId) => <OperationalBranchSelector key={purpose} purpose={purpose} branchId={branchId} locale={i18n.locale}
        lifecycle={actor} onAuthenticationRequired={redirectExpired} onSelectBranch={(id) => {
          if (state.type !== "Ready") return;
          const { context } = resolveOperationsQuery(search, state.value);
          if (context) router.replace(operationsContextHref(context, id), { scroll: false });
        }} />} />
  </PresentationShell>;
};

export const OperationsPage = () => <ProtectedPage>{(actor) => <AuthenticatedOperations actor={actor} />}</ProtectedPage>;
