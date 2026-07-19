import type { SpecificationTemplateFieldEntity } from "@/domains/catalog/types/specification-template-field.entity";

const timestamp = new Date().toISOString();
const scope = { companyId: "COMP-001", workspaceId: "WS-001", isActive: true, createdAt: timestamp, updatedAt: timestamp } as const;
const templateFields: Record<string, readonly (readonly [string, boolean])[]> = {
  "st-001": [["sf-001", true], ["sf-002", true], ["sf-013", true], ["sf-014", true], ["sf-004", true], ["sf-003", true], ["sf-005", true], ["sf-015", true], ["sf-006", true], ["sf-016", false]],
  "st-002": [["sf-001", true], ["sf-002", true], ["sf-013", true], ["sf-014", true], ["sf-004", true], ["sf-005", true], ["sf-006", true], ["sf-016", false], ["sf-003", false], ["sf-007", false], ["sf-008", false]],
  "st-003": [["sf-001", true], ["sf-002", true], ["sf-013", true], ["sf-014", true], ["sf-004", true], ["sf-005", true], ["sf-006", true], ["sf-016", false], ["sf-007", false]],
  "st-004": [["sf-001", true], ["sf-002", true], ["sf-013", true], ["sf-014", true], ["sf-004", true], ["sf-003", true], ["sf-005", true], ["sf-006", true], ["sf-016", false]],
  "st-005": [["sf-017", true], ["sf-018", true], ["sf-019", true], ["sf-009", true], ["sf-010", true], ["sf-020", true], ["sf-026", false], ["sf-021", false], ["sf-022", false], ["sf-012", false], ["sf-023", false], ["sf-024", false], ["sf-025", false]],
};

export const specificationTemplateFields: SpecificationTemplateFieldEntity[] = Object.entries(templateFields).flatMap(([templateId, fields], templateIndex) => fields.map(([fieldId, required], index) => ({
  ...scope,
  id: `stf-${templateIndex + 1}-${index + 1}`,
  code: `STF-${templateIndex + 1}-${index + 1}`,
  specificationTemplateId: templateId,
  specificationFieldId: fieldId,
  isRequired: required,
  isFilterable: true,
  sortOrder: index + 1,
})));
