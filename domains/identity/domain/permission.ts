export const PERMISSION_REGISTRY = [
  { code: "catalog.referenceData.view", module: "Catalog", displayKey: "permissions.catalog.referenceData.view", descriptionKey: "permissions.catalog.referenceData.view.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.referenceData.manage", module: "Catalog", displayKey: "permissions.catalog.referenceData.manage", descriptionKey: "permissions.catalog.referenceData.manage.description", assignableToStaff: true, sensitive: true },
  { code: "catalog.product.create", module: "Catalog", displayKey: "permissions.catalog.product.create", descriptionKey: "permissions.catalog.product.create.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.product.edit", module: "Catalog", displayKey: "permissions.catalog.product.edit", descriptionKey: "permissions.catalog.product.edit.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.product-entry-submission.read", module: "Catalog", displayKey: "permissions.catalog.productEntrySubmission.read", descriptionKey: "permissions.catalog.productEntrySubmission.read.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.product-entry-media.upload", module: "Catalog", displayKey: "permissions.catalog.productEntryMedia.upload", descriptionKey: "permissions.catalog.productEntryMedia.upload.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.product.reference-cost.read", module: "ReferenceCost", displayKey: "permissions.catalog.product.referenceCost.read", descriptionKey: "permissions.catalog.product.referenceCost.read.description", assignableToStaff: true, sensitive: true },
  { code: "catalog.products.view", module: "Catalog", displayKey: "permissions.catalog.products.view", descriptionKey: "permissions.catalog.products.view.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.products.create", module: "Catalog", displayKey: "permissions.catalog.products.create", descriptionKey: "permissions.catalog.products.create.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.products.edit", module: "Catalog", displayKey: "permissions.catalog.products.edit", descriptionKey: "permissions.catalog.products.edit.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.products.archive", module: "Catalog", displayKey: "permissions.catalog.products.archive", descriptionKey: "permissions.catalog.products.archive.description", assignableToStaff: true, sensitive: true },
  { code: "catalog.productEntry.submit", module: "Catalog", displayKey: "permissions.catalog.productEntry.submit", descriptionKey: "permissions.catalog.productEntry.submit.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.productMedia.upload", module: "Catalog", displayKey: "permissions.catalog.productMedia.upload", descriptionKey: "permissions.catalog.productMedia.upload.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.productMedia.retry", module: "Catalog", displayKey: "permissions.catalog.productMedia.retry", descriptionKey: "permissions.catalog.productMedia.retry.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.productMedia.reconciliation.manage", module: "Catalog", displayKey: "permissions.catalog.productMedia.reconciliation.manage", descriptionKey: "permissions.catalog.productMedia.reconciliation.manage.description", assignableToStaff: true, sensitive: true },
  { code: "catalog.productMedia.source.replace", module: "Catalog", displayKey: "permissions.catalog.productMedia.source.replace", descriptionKey: "permissions.catalog.productMedia.source.replace.description", assignableToStaff: true, sensitive: true },
  { code: "catalog.sharing.create", module: "Catalog", displayKey: "permissions.catalog.sharing.create", descriptionKey: "permissions.catalog.sharing.create.description", assignableToStaff: true, sensitive: false },
  { code: "catalog.sharing.aiRecommendation.generate", module: "Catalog", displayKey: "permissions.catalog.sharing.aiRecommendation.generate", descriptionKey: "permissions.catalog.sharing.aiRecommendation.generate.description", assignableToStaff: true, sensitive: false },
  { code: "pricing.view", module: "Pricing", displayKey: "permissions.pricing.view", descriptionKey: "permissions.pricing.view.description", assignableToStaff: true, sensitive: false },
  { code: "pricing.manage", module: "Pricing", displayKey: "permissions.pricing.manage", descriptionKey: "permissions.pricing.manage.description", assignableToStaff: true, sensitive: true },
  { code: "pricing.wholesale.view", module: "Pricing", displayKey: "permissions.pricing.wholesale.view", descriptionKey: "permissions.pricing.wholesale.view.description", assignableToStaff: true, sensitive: true },
  { code: "pricing.branchOverride.manage", module: "Pricing", displayKey: "permissions.pricing.branchOverride.manage", descriptionKey: "permissions.pricing.branchOverride.manage.description", assignableToStaff: true, sensitive: true },
  { code: "referenceCost.view", module: "ReferenceCost", displayKey: "permissions.referenceCost.view", descriptionKey: "permissions.referenceCost.view.description", assignableToStaff: true, sensitive: true },
  { code: "referenceCost.manage", module: "ReferenceCost", displayKey: "permissions.referenceCost.manage", descriptionKey: "permissions.referenceCost.manage.description", assignableToStaff: true, sensitive: true },
  { code: "referenceCost.branchOverride.manage", module: "ReferenceCost", displayKey: "permissions.referenceCost.branchOverride.manage", descriptionKey: "permissions.referenceCost.branchOverride.manage.description", assignableToStaff: true, sensitive: true },
  { code: "inventory.availability.view", module: "Inventory", displayKey: "permissions.inventory.availability.view", descriptionKey: "permissions.inventory.availability.view.description", assignableToStaff: true, sensitive: false },
  { code: "inventory.quantity.view", module: "Inventory", displayKey: "permissions.inventory.quantity.view", descriptionKey: "permissions.inventory.quantity.view.description", assignableToStaff: true, sensitive: false },
  { code: "inventory.receive", module: "Inventory", displayKey: "permissions.inventory.receive", descriptionKey: "permissions.inventory.receive.description", assignableToStaff: true, sensitive: false },
  { code: "inventory.issue", module: "Inventory", displayKey: "permissions.inventory.issue", descriptionKey: "permissions.inventory.issue.description", assignableToStaff: true, sensitive: false },
  { code: "inventory.reserve", module: "Inventory", displayKey: "permissions.inventory.reserve", descriptionKey: "permissions.inventory.reserve.description", assignableToStaff: true, sensitive: false },
  { code: "inventory.transfer", module: "Inventory", displayKey: "permissions.inventory.transfer", descriptionKey: "permissions.inventory.transfer.description", assignableToStaff: true, sensitive: false },
  { code: "inventory.damage", module: "Inventory", displayKey: "permissions.inventory.damage", descriptionKey: "permissions.inventory.damage.description", assignableToStaff: true, sensitive: true },
  { code: "inventory.adjust", module: "Inventory", displayKey: "permissions.inventory.adjust", descriptionKey: "permissions.inventory.adjust.description", assignableToStaff: true, sensitive: true },
  { code: "workspace.settings.view", module: "Workspace", displayKey: "permissions.workspace.settings.view", descriptionKey: "permissions.workspace.settings.view.description", assignableToStaff: true, sensitive: true },
  { code: "workspace.settings.manage", module: "Workspace", displayKey: "permissions.workspace.settings.manage", descriptionKey: "permissions.workspace.settings.manage.description", assignableToStaff: true, sensitive: true },
  { code: "workspace.audit.view", module: "Workspace", displayKey: "permissions.workspace.audit.view", descriptionKey: "permissions.workspace.audit.view.description", assignableToStaff: true, sensitive: true },
  { code: "workspace.branches.view", module: "Workspace", displayKey: "permissions.workspace.branches.view", descriptionKey: "permissions.workspace.branches.view.description", assignableToStaff: true, sensitive: false },
  { code: "workspace.branches.manage", module: "Workspace", displayKey: "permissions.workspace.branches.manage", descriptionKey: "permissions.workspace.branches.manage.description", assignableToStaff: false, sensitive: true },
  { code: "workspace.members.manage", module: "Workspace", displayKey: "permissions.workspace.members.manage", descriptionKey: "permissions.workspace.members.manage.description", assignableToStaff: false, sensitive: true },
] as const;

export type PermissionDefinition = (typeof PERMISSION_REGISTRY)[number];
export type PermissionCode = PermissionDefinition["code"];
export type PermissionModule = PermissionDefinition["module"];

const permissionByCode = new Map<string, PermissionDefinition>(
  PERMISSION_REGISTRY.map((definition) => [definition.code, definition]),
);

export const isPermissionCode = (value: string): value is PermissionCode => permissionByCode.has(value);

export const validateStaffPermissionCodes = (values: readonly string[]): readonly PermissionCode[] => {
  const unique = new Set(values);
  if (unique.size !== values.length) throw new Error("DuplicatePermissionCode");
  for (const value of values) {
    const definition = permissionByCode.get(value);
    if (!definition || !definition.assignableToStaff) throw new Error("InvalidPermissionCode");
  }
  return Object.freeze([...unique].sort() as PermissionCode[]);
};

export const ownerEffectivePermissionCodes = (): readonly PermissionCode[] =>
  Object.freeze(PERMISSION_REGISTRY.map(({ code }) => code).sort());

export const staffEffectivePermissionCodes = (values: readonly string[]): readonly PermissionCode[] =>
  validateStaffPermissionCodes(values);

export const PERMISSION_TEMPLATES = Object.freeze([
  Object.freeze({
    id: "standard-catalog-staff",
    displayKey: "permissionTemplates.standardCatalogStaff",
    descriptionKey: "permissionTemplates.standardCatalogStaff.description",
    permissionCodes: validateStaffPermissionCodes([
      "catalog.referenceData.view",
      "catalog.product.create",
      "catalog.product.edit",
      "catalog.product-entry-submission.read",
      "catalog.product-entry-media.upload",
      "catalog.products.view",
      "catalog.productEntry.submit",
      "catalog.productMedia.retry",
      "pricing.view",
      "inventory.availability.view",
      "inventory.quantity.view",
      "catalog.sharing.create",
      "catalog.sharing.aiRecommendation.generate",
    ]),
  }),
] as const);

export type PermissionTemplateId = (typeof PERMISSION_TEMPLATES)[number]["id"];

export const resolvePermissionTemplate = (id: string): readonly PermissionCode[] => {
  const template = PERMISSION_TEMPLATES.find((candidate) => candidate.id === id);
  if (!template) throw new Error("InvalidPermissionTemplate");
  return Object.freeze([...template.permissionCodes]);
};
