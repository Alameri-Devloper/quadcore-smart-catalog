import { operationalManagementSections } from "../../../identity/presentation/operational-management-capabilities.coordinator";
import type { OperationalManagementCapabilitiesView, OperationalManagementSection } from "../../../identity/presentation/operational-management-capabilities.types";

const sectionKeys = { Branches: "branches", Inventory: "inventory", Pricing: "pricing" } as const;

export const operationsSectionHref = (section: OperationalManagementSection): string =>
  `/operations?section=${sectionKeys[section]}`;

/** Only section values enter this parser. No resource or authority URL input is consumed. */
export const parseOperationsSection = (values: readonly string[]): OperationalManagementSection | null => {
  if (values.length !== 1) return null;
  switch (values[0]) {
    case "branches": return "Branches";
    case "inventory": return "Inventory";
    case "pricing": return "Pricing";
    default: return null;
  }
};

export const resolveOperationsSection = (values: readonly string[], capabilities: OperationalManagementCapabilitiesView) => {
  const sections = operationalManagementSections(capabilities);
  const requested = parseOperationsSection(values);
  return { sections, selected: requested && sections.includes(requested) ? requested : sections[0] ?? null };
};
