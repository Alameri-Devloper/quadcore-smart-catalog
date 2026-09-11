import Link from "next/link";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import type { OperationalManagementSection } from "../../../identity/presentation/operational-management-capabilities.types";
import { operationsSectionHref } from "./operations-section-state";
import { operationsText } from "./operations-presentation.i18n";

export const OperationsNavigation = ({ sections, selected, locale }: {
  readonly sections: readonly OperationalManagementSection[];
  readonly selected: OperationalManagementSection | null;
  readonly locale: Locale;
}) => <nav className="operations-section-nav" aria-label={operationsText(locale, "navigation")}>
  <ul>{sections.map((section) => <li key={section}>
    <Link href={operationsSectionHref(section)} aria-current={section === selected ? "page" : undefined}>
      {operationsText(locale, section)}
    </Link>
  </li>)}</ul>
</nav>;
