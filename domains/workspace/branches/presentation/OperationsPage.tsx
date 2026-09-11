"use client";

import { useSearchParams } from "next/navigation";
import { ProtectedPage } from "../../../identity/presentation/components/auth-guard";
import { PageHeading, PresentationShell, StatusMessage, usePageI18n } from "../../../identity/presentation/components/presentation-shell";
import { useOperationalManagementCapabilities } from "../../../identity/presentation/operational-management-capabilities.context";
import type { Locale, SafeActorView } from "../../../identity/presentation/identity-presentation.types";
import type { OperationalManagementCapabilityState } from "../../../identity/presentation/operational-management-capabilities.types";
import { OperationsNavigation } from "./OperationsNavigation";
import { operationsText } from "./operations-presentation.i18n";
import { resolveOperationsSection } from "./operations-section-state";

export const OperationsContent = ({ state, sectionValues, locale, onRetry }: {
  readonly state: OperationalManagementCapabilityState;
  readonly sectionValues: readonly string[];
  readonly locale: Locale;
  readonly onRetry: () => void;
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
  const { sections, selected } = resolveOperationsSection(sectionValues, state.value);
  return <>{heading}{selected ? <>
    <OperationsNavigation sections={sections} selected={selected} locale={locale} />
    <section className="surface-card" aria-labelledby="operations-area-heading">
      <h2 id="operations-area-heading">{operationsText(locale, selected)}</h2>
      <p>{operationsText(locale, `${selected}Foundation`)}</p>
    </section>
  </> : <StatusMessage kind="info">{operationsText(locale, "empty")}</StatusMessage>}</>;
};

const AuthenticatedOperations = ({ actor }: { readonly actor: SafeActorView }) => {
  const i18n = usePageI18n();
  const search = useSearchParams();
  const { state, refresh } = useOperationalManagementCapabilities();
  return <PresentationShell actor={actor} i18n={i18n}>
    <OperationsContent state={state} sectionValues={search.getAll("section")} locale={i18n.locale} onRetry={refresh} />
  </PresentationShell>;
};

export const OperationsPage = () => <ProtectedPage>{(actor) => <AuthenticatedOperations actor={actor} />}</ProtectedPage>;
