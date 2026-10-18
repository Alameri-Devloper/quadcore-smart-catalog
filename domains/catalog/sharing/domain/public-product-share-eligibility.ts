import { formatIsoCurrencyAmountMinor } from "../../reference-data/domain/catalog-reference-data";
import type { SpecificationDefinition, SpecificationTemplate } from "../../reference-data/domain/catalog-reference-data";
import type { ProductSpecificationValue } from "../../types/product-specification-value.value-object";

export interface PublicShareEligibilityResource {
  readonly productName: string | null;
  readonly productLifecycle: 'Draft' | 'Published' | 'Archived';
  readonly branchStatus: 'Active' | 'Inactive';
  readonly listed: boolean;
  readonly workspaceRetail: { readonly amountMinor: bigint; readonly currency: string } | null;
  readonly branchRetail: { readonly amountMinor: bigint; readonly currency: string } | null;
  readonly template: SpecificationTemplate | null;
  readonly definitions: readonly SpecificationDefinition[];
  readonly specificationValues: readonly ProductSpecificationValue[];
}

const encoder = new TextEncoder();
const safeText = (value: string, multiline: boolean): boolean =>
  !/[\uD800-\uDFFF]/u.test(value) && !(multiline ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F-\u009F]/u : /\p{Cc}/u).test(value);

// Current eligibility only; no snapshot or anonymous projection is persisted.
export const evaluatePublicShareEligibility = (workspaceId: string, resource: PublicShareEligibilityResource): 'Eligible' | 'Ineligible' | 'IntegrityFailure' => {
  const name = resource.productName;
  const retail = resource.branchRetail ?? resource.workspaceRetail;
  if (resource.productLifecycle !== 'Published' || resource.branchStatus !== 'Active' || !resource.listed
    || typeof name !== 'string' || !name.trim() || !safeText(name, true) || [...name].length > 512 || encoder.encode(name).length > 2048
    || !retail || typeof retail.amountMinor !== 'bigint' || retail.amountMinor < BigInt(0) || retail.amountMinor > BigInt(Number.MAX_SAFE_INTEGER)
    || formatIsoCurrencyAmountMinor(retail.amountMinor, retail.currency) === null || !resource.template) return 'Ineligible';
  if (resource.template.workspaceId !== workspaceId) return 'IntegrityFailure';
  const definitionIds = new Set<string>(), orders = new Set<number>(), valueIds = new Set<string>();
  for (const entry of resource.template.entries) {
    if (definitionIds.has(entry.specificationDefinitionId) || orders.has(entry.sortOrder) || !Number.isSafeInteger(entry.sortOrder) || entry.sortOrder < 0) return 'IntegrityFailure';
    definitionIds.add(entry.specificationDefinitionId); orders.add(entry.sortOrder);
  }
  for (const value of resource.specificationValues) {
    if (valueIds.has(value.specificationFieldId)) return 'IntegrityFailure';
    valueIds.add(value.specificationFieldId);
  }
  if (new Set(resource.definitions.map((definition) => definition.id)).size !== resource.definitions.length) return 'IntegrityFailure';
  const items: { label: string; value: string | number | boolean; unit?: string }[] = [];
  for (const entry of [...resource.template.entries].sort((a,b) => a.sortOrder-b.sortOrder)) {
    if (entry.publicVisibility !== 'public') continue;
    const definition = resource.definitions.find((item) => item.id === entry.specificationDefinitionId && item.workspaceId === workspaceId && item.status === 'Active');
    const value = resource.specificationValues.find((item) => item.specificationFieldId === entry.specificationDefinitionId)?.value;
    if (!definition || value === undefined || typeof definition.displayName !== 'string' || !definition.displayName.trim()
      || definition.displayName.trim().length > 160 || [...definition.displayName].length > 160 || !safeText(definition.displayName, false)) continue;
    if (definition.unit !== null && (typeof definition.unit !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9 ./%-]{0,31}$/.test(definition.unit))) continue;
    if (definition.valueType === 'Text' ? typeof value !== 'string' || !value.trim() || !safeText(value, true)
      : definition.valueType === 'Number' ? typeof value !== 'number' || !Number.isFinite(value)
      : definition.valueType === 'Boolean' ? typeof value !== 'boolean' : true) continue;
    const rendered = String(value);
    if ([...rendered].length > 2048 || encoder.encode(rendered).length > 8192) continue;
    items.push({ label: definition.displayName, value, ...(definition.unit === null ? {} : { unit: definition.unit }) });
  }
  if (!items.length || items.length > 64 || encoder.encode(JSON.stringify(items)).length > 65536) return 'Ineligible';
  return 'Eligible';
};
