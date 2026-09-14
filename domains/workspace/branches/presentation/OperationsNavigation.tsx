import Link from "next/link";
import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import type { OperationalManagementSection } from "../../../identity/presentation/operational-management-capabilities.types";
import { operationsSectionHref } from "./operations-section-state";
import { operationsText } from "./operations-presentation.i18n";
import { operationsContextHref, type OperationsContext } from "./operations-query-state";

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

export const OperationsContextNavigation = ({ context, locale }: { readonly context: OperationsContext; readonly locale: Locale }) => {
  const link = (next: OperationsContext, label: Parameters<typeof operationsText>[1], selected: boolean) =>
    <Link href={operationsContextHref(next)} aria-current={selected ? "true" : undefined}>{operationsText(locale, label)}</Link>;
  return <div className="operations-context-controls">
    {context.section === "Branches" ? <nav aria-label={operationsText(locale, "branchTools")}>
      {link({ section: "Branches", branchTool: "details" }, "management", context.branchTool === "details")}
      {link({ section: "Branches", branchTool: "listing" }, "Listing", context.branchTool === "listing")}
    </nav> : null}
    {context.section === "Inventory" ? <nav aria-label={operationsText(locale, "inventoryTools")}>
      {link({ section: "Inventory", inventoryTool: "stock" }, "Stock", context.inventoryTool === "stock")}
      {link({ section: "Inventory", inventoryTool: "reservations" }, "Reservations", context.inventoryTool === "reservations")}
      {link({ section: "Inventory", inventoryTool: "transfer" }, "Transfer", context.inventoryTool === "transfer")}
    </nav> : null}
    {context.section === "Pricing" ? <>
      <nav aria-label={operationsText(locale, "pricingScope")}>
        {link({ ...context, pricingScope: "workspace" }, "Workspace", context.pricingScope === "workspace")}
        {link({ ...context, pricingScope: "branch" }, "Branch", context.pricingScope === "branch")}
      </nav>
      <nav aria-label={operationsText(locale, "pricingField")}>
        {link({ ...context, pricingField: "prices" }, "Prices", context.pricingField === "prices")}
        {link({ ...context, pricingField: "reference-cost" }, "ReferenceCost", context.pricingField === "reference-cost")}
      </nav>
    </> : null}
  </div>;
};
