import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  type ExtraConfigColumn,
} from "drizzle-orm/pg-core";
import type { ProductEntrySaveReceipt } from "../../product-entry/repositories/product-entry-submission.repository";
import { workspaces } from "../../../workspace/infrastructure/persistence/schema";

const workspaceReferenceColumns = () => ({
  workspaceId: text("workspace_id").notNull(),
  code: text("code").notNull(),
  displayName: text("display_name").notNull(),
  status: text("status").notNull(),
  sortOrder: integer("sort_order").notNull(),
  version: bigint("version", { mode: "number" }).notNull().default(1),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
});

const referenceChecks = (table: Readonly<Record<"code" | "displayName" | "status" | "sortOrder" | "version" | "createdAt" | "updatedAt", ExtraConfigColumn>>) => [
  check("catalog_reference_code_shape", sql`${table.code} ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length(${table.code}) <= 64`),
  check("catalog_reference_display_name", sql`btrim(${table.displayName}) <> '' AND length(${table.displayName}) <= 160`),
  check("catalog_reference_status", sql`${table.status} IN ('Active','Inactive')`),
  check("catalog_reference_sort_order", sql`${table.sortOrder} BETWEEN 0 AND 1000000`),
  check("catalog_reference_version", sql`${table.version} BETWEEN 1 AND 9007199254740991`),
  check("catalog_reference_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
];

export const catalogDepartments = pgTable("catalog_departments", {
  ...workspaceReferenceColumns(), departmentId: text("department_id").notNull(),
}, (table) => [
  primaryKey({ name: "catalog_departments_pk", columns: [table.workspaceId, table.departmentId] }),
  foreignKey({ name: "catalog_departments_workspace_fk", columns: [table.workspaceId], foreignColumns: [workspaces.workspaceId] }).onDelete("restrict"),
  uniqueIndex("catalog_departments_workspace_code_uq").on(table.workspaceId, table.code),
  index("catalog_departments_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
  ...referenceChecks(table),
]);

export const catalogCategories = pgTable("catalog_categories", {
  ...workspaceReferenceColumns(), categoryId: text("category_id").notNull(), departmentId: text("department_id").notNull(),
}, (table) => [
  primaryKey({ name: "catalog_categories_pk", columns: [table.workspaceId, table.categoryId] }),
  foreignKey({ name: "catalog_categories_department_fk", columns: [table.workspaceId, table.departmentId], foreignColumns: [catalogDepartments.workspaceId, catalogDepartments.departmentId] }).onDelete("restrict"),
  uniqueIndex("catalog_categories_workspace_code_uq").on(table.workspaceId, table.code),
  index("catalog_categories_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
  index("catalog_categories_department_idx").on(table.workspaceId, table.departmentId, table.sortOrder),
  ...referenceChecks(table),
]);

export const catalogProductTypes = pgTable("catalog_product_types", {
  ...workspaceReferenceColumns(), productTypeId: text("product_type_id").notNull(), categoryId: text("category_id").notNull(),
}, (table) => [
  primaryKey({ name: "catalog_product_types_pk", columns: [table.workspaceId, table.productTypeId] }),
  foreignKey({ name: "catalog_product_types_category_fk", columns: [table.workspaceId, table.categoryId], foreignColumns: [catalogCategories.workspaceId, catalogCategories.categoryId] }).onDelete("restrict"),
  uniqueIndex("catalog_product_types_workspace_code_uq").on(table.workspaceId, table.code),
  index("catalog_product_types_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
  index("catalog_product_types_category_idx").on(table.workspaceId, table.categoryId, table.sortOrder),
  ...referenceChecks(table),
]);

export const catalogBrands = pgTable("catalog_brands", {
  ...workspaceReferenceColumns(), brandId: text("brand_id").notNull(),
}, (table) => [
  primaryKey({ name: "catalog_brands_pk", columns: [table.workspaceId, table.brandId] }),
  foreignKey({ name: "catalog_brands_workspace_fk", columns: [table.workspaceId], foreignColumns: [workspaces.workspaceId] }).onDelete("restrict"),
  uniqueIndex("catalog_brands_workspace_code_uq").on(table.workspaceId, table.code),
  index("catalog_brands_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
  ...referenceChecks(table),
]);

export const catalogSupplyStatuses = pgTable("catalog_supply_statuses", {
  ...workspaceReferenceColumns(), supplyStatusId: text("supply_status_id").notNull(),
}, (table) => [
  primaryKey({ name: "catalog_supply_statuses_pk", columns: [table.workspaceId, table.supplyStatusId] }),
  foreignKey({ name: "catalog_supply_statuses_workspace_fk", columns: [table.workspaceId], foreignColumns: [workspaces.workspaceId] }).onDelete("restrict"),
  uniqueIndex("catalog_supply_statuses_workspace_code_uq").on(table.workspaceId, table.code),
  index("catalog_supply_statuses_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
  ...referenceChecks(table),
]);

export const workspaceConditionAvailability = pgTable("workspace_condition_availability", {
  workspaceId: text("workspace_id").notNull(), conditionCode: text("condition_code").notNull(), enabled: boolean("enabled").notNull(), sortOrder: integer("sort_order").notNull(),
}, (table) => [
  primaryKey({ name: "workspace_condition_availability_pk", columns: [table.workspaceId, table.conditionCode] }),
  foreignKey({ name: "workspace_condition_availability_workspace_fk", columns: [table.workspaceId], foreignColumns: [workspaces.workspaceId] }).onDelete("restrict"),
  index("workspace_condition_availability_selection_idx").on(table.workspaceId, table.enabled, table.sortOrder),
  check("workspace_condition_availability_code", sql`${table.conditionCode} IN ('new','used','refurbished')`),
  check("workspace_condition_availability_sort", sql`${table.sortOrder} BETWEEN 0 AND 1000000`),
]);

export const workspaceCurrencyAvailability = pgTable("workspace_currency_availability", {
  workspaceId: text("workspace_id").notNull(), currencyCode: text("currency_code").notNull(), enabled: boolean("enabled").notNull(), sortOrder: integer("sort_order").notNull(),
}, (table) => [
  primaryKey({ name: "workspace_currency_availability_pk", columns: [table.workspaceId, table.currencyCode] }),
  foreignKey({ name: "workspace_currency_availability_workspace_fk", columns: [table.workspaceId], foreignColumns: [workspaces.workspaceId] }).onDelete("restrict"),
  index("workspace_currency_availability_selection_idx").on(table.workspaceId, table.enabled, table.sortOrder),
  check("workspace_currency_availability_code", sql`${table.currencyCode} ~ '^[A-Z]{3}$'`),
  check("workspace_currency_availability_sort", sql`${table.sortOrder} BETWEEN 0 AND 1000000`),
]);

export const catalogSpecificationDefinitions = pgTable("catalog_specification_definitions", {
  ...workspaceReferenceColumns(), specificationDefinitionId: text("specification_definition_id").notNull(), valueType: text("value_type").notNull(), unit: text("unit"),
}, (table) => [
  primaryKey({ name: "catalog_specification_definitions_pk", columns: [table.workspaceId, table.specificationDefinitionId] }),
  foreignKey({ name: "catalog_specification_definitions_workspace_fk", columns: [table.workspaceId], foreignColumns: [workspaces.workspaceId] }).onDelete("restrict"),
  uniqueIndex("catalog_specification_definitions_workspace_code_uq").on(table.workspaceId, table.code),
  index("catalog_specification_definitions_workspace_status_sort_idx").on(table.workspaceId, table.status, table.sortOrder),
  check("catalog_specification_definitions_value_type", sql`${table.valueType} IN ('Text','Number','Boolean')`),
  check("catalog_specification_definitions_unit", sql`${table.unit} IS NULL OR (btrim(${table.unit}) <> '' AND length(${table.unit}) <= 32)`),
  ...referenceChecks(table),
]);

export const catalogSpecificationTemplates = pgTable("catalog_specification_templates", {
  workspaceId: text("workspace_id").notNull(), specificationTemplateId: text("specification_template_id").notNull(), productTypeId: text("product_type_id").notNull(), version: bigint("version", { mode: "number" }).notNull().default(1), createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(), updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
}, (table) => [
  primaryKey({ name: "catalog_specification_templates_pk", columns: [table.workspaceId, table.specificationTemplateId] }),
  foreignKey({ name: "catalog_specification_templates_product_type_fk", columns: [table.workspaceId, table.productTypeId], foreignColumns: [catalogProductTypes.workspaceId, catalogProductTypes.productTypeId] }).onDelete("restrict"),
  uniqueIndex("catalog_specification_templates_product_type_uq").on(table.workspaceId, table.productTypeId),
  check("catalog_specification_templates_version", sql`${table.version} BETWEEN 1 AND 9007199254740991`),
  check("catalog_specification_templates_timestamps", sql`${table.createdAt} <= ${table.updatedAt}`),
]);

export const catalogSpecificationTemplateEntries = pgTable("catalog_specification_template_entries", {
  workspaceId: text("workspace_id").notNull(), specificationTemplateId: text("specification_template_id").notNull(), specificationDefinitionId: text("specification_definition_id").notNull(), sortOrder: integer("sort_order").notNull(), required: boolean("required").notNull().default(false),
}, (table) => [
  primaryKey({ name: "catalog_specification_template_entries_pk", columns: [table.workspaceId, table.specificationTemplateId, table.specificationDefinitionId] }),
  foreignKey({ name: "catalog_specification_template_entries_template_fk", columns: [table.workspaceId, table.specificationTemplateId], foreignColumns: [catalogSpecificationTemplates.workspaceId, catalogSpecificationTemplates.specificationTemplateId] }).onDelete("cascade"),
  foreignKey({ name: "catalog_specification_template_entries_definition_fk", columns: [table.workspaceId, table.specificationDefinitionId], foreignColumns: [catalogSpecificationDefinitions.workspaceId, catalogSpecificationDefinitions.specificationDefinitionId] }).onDelete("restrict"),
  uniqueIndex("catalog_specification_template_entries_order_uq").on(table.workspaceId, table.specificationTemplateId, table.sortOrder),
  check("catalog_specification_template_entries_sort", sql`${table.sortOrder} BETWEEN 0 AND 1000000`),
]);

export const catalogProducts = pgTable(
  "catalog_products",
  {
    workspaceId: text("workspace_id").notNull(),
    productId: text("product_id").notNull(),
    catalogId: text("catalog_id").notNull(),
    lifecycleState: text("lifecycle_state").notNull(),
    archiveReason: text("archive_reason"),
    revision: bigint("revision", { mode: "number" }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
    hasClassification: boolean("has_classification").notNull(),
    categoryId: text("category_id"),
    productTypeId: text("product_type_id"),
    deviceClassId: text("device_class_id"),
    conditionId: text("condition_id"),
    availabilityStatusId: text("availability_status_id"),
    hasCommercialDetails: boolean("has_commercial_details").notNull(),
    productName: text("product_name"),
    productCode: text("product_code"),
    productModelId: text("product_model_id"),
    brandId: text("brand_id"),
    isHighlighted: boolean("is_highlighted").notNull().default(false),
    wholesalePriceMinor: bigint("wholesale_price_minor", { mode: "number" }),
    wholesalePriceCurrency: text("wholesale_price_currency"),
    retailPriceMinor: bigint("retail_price_minor", { mode: "number" }),
    retailPriceCurrency: text("retail_price_currency"),
  },
  (table) => [
    primaryKey({ name: "catalog_products_pk", columns: [table.workspaceId, table.productId] }),
    uniqueIndex("catalog_products_workspace_product_code_uq")
      .on(table.workspaceId, table.productCode)
      .where(sql`${table.productCode} IS NOT NULL`),
    index("catalog_products_workspace_catalog_idx").on(table.workspaceId, table.catalogId),
    index("catalog_products_workspace_category_idx").on(table.workspaceId, table.categoryId),
    index("catalog_products_workspace_product_type_idx").on(table.workspaceId, table.productTypeId),
    index("catalog_products_workspace_brand_idx").on(table.workspaceId, table.brandId),
    index("catalog_products_workspace_lifecycle_idx").on(table.workspaceId, table.lifecycleState),
    index("catalog_products_workspace_availability_idx").on(table.workspaceId, table.availabilityStatusId),
    check("catalog_products_lifecycle_state_valid", sql`${table.lifecycleState} IN ('Draft', 'Published', 'Archived')`),
    check("catalog_products_archive_reason_valid", sql`${table.archiveReason} IS NULL OR ${table.archiveReason} IN ('Manual', 'PublicationRequirementsNotMet')`),
    check("catalog_products_archive_reason_lifecycle", sql`(${table.lifecycleState} = 'Archived' AND ${table.archiveReason} IS NOT NULL) OR (${table.lifecycleState} IN ('Draft', 'Published') AND ${table.archiveReason} IS NULL)`),
    check("catalog_products_revision_safe_range", sql`${table.revision} BETWEEN 0 AND 9007199254740991`),
    check("catalog_products_timestamps_ordered", sql`${table.createdAt} <= ${table.updatedAt}`),
    check("catalog_products_wholesale_pair", sql`(${table.wholesalePriceMinor} IS NULL) = (${table.wholesalePriceCurrency} IS NULL)`),
    check("catalog_products_retail_pair", sql`(${table.retailPriceMinor} IS NULL) = (${table.retailPriceCurrency} IS NULL)`),
    check("catalog_products_wholesale_safe_range", sql`${table.wholesalePriceMinor} IS NULL OR ${table.wholesalePriceMinor} BETWEEN 0 AND 9007199254740991`),
    check("catalog_products_retail_safe_range", sql`${table.retailPriceMinor} IS NULL OR ${table.retailPriceMinor} BETWEEN 0 AND 9007199254740991`),
    check("catalog_products_product_code_canonical", sql`${table.productCode} IS NULL OR (btrim(${table.productCode}) <> '' AND ${table.productCode} = upper(btrim(${table.productCode})))`),
    check("catalog_products_classification_presence", sql`${table.hasClassification} OR (${table.categoryId} IS NULL AND ${table.productTypeId} IS NULL AND ${table.deviceClassId} IS NULL AND ${table.conditionId} IS NULL AND ${table.availabilityStatusId} IS NULL)`),
    check("catalog_products_commercial_presence", sql`${table.hasCommercialDetails} OR (${table.productName} IS NULL AND ${table.productCode} IS NULL AND ${table.productModelId} IS NULL AND ${table.brandId} IS NULL AND ${table.isHighlighted} = false AND ${table.wholesalePriceMinor} IS NULL AND ${table.wholesalePriceCurrency} IS NULL AND ${table.retailPriceMinor} IS NULL AND ${table.retailPriceCurrency} IS NULL)`),
  ],
);

export const catalogProductSpecificationValues = pgTable(
  "catalog_product_specification_values",
  {
    workspaceId: text("workspace_id").notNull(),
    productId: text("product_id").notNull(),
    specificationFieldId: text("specification_field_id").notNull(),
    position: integer("position").notNull(),
    valueType: text("value_type").notNull(),
    textValue: text("text_value"),
    numberValue: text("number_value"),
    booleanValue: boolean("boolean_value"),
  },
  (table) => [
    primaryKey({ name: "catalog_product_specification_values_pk", columns: [table.workspaceId, table.productId, table.specificationFieldId] }),
    foreignKey({
      name: "catalog_product_specification_values_product_fk",
      columns: [table.workspaceId, table.productId],
      foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId],
    }).onDelete("cascade"),
    index("catalog_product_specification_values_workspace_field_idx").on(table.workspaceId, table.specificationFieldId),
    uniqueIndex("catalog_product_specification_values_workspace_product_position_uq").on(table.workspaceId, table.productId, table.position),
    check("catalog_product_specification_values_position_non_negative", sql`${table.position} >= 0`),
    check("catalog_product_specification_values_typed_value", sql`
      (${table.valueType} = 'string' AND ${table.textValue} IS NOT NULL AND ${table.numberValue} IS NULL AND ${table.booleanValue} IS NULL) OR
      (${table.valueType} = 'number' AND ${table.textValue} IS NULL AND ${table.numberValue} IS NOT NULL AND ${table.booleanValue} IS NULL) OR
      (${table.valueType} = 'boolean' AND ${table.textValue} IS NULL AND ${table.numberValue} IS NULL AND ${table.booleanValue} IS NOT NULL)
    `),
  ],
);

export const catalogProductImages = pgTable(
  "catalog_product_images",
  {
    workspaceId: text("workspace_id").notNull(),
    productId: text("product_id").notNull(),
    productImageId: text("product_image_id").notNull(),
    storageKey: text("storage_key").notNull(),
    position: integer("position").notNull(),
    isMain: boolean("is_main").notNull(),
    altText: text("alt_text"),
    checksumSha256: text("checksum_sha256"),
    mimeType: text("mime_type"),
    mediaCreatedAt: timestamp("media_created_at", { withTimezone: true, mode: "date" }),
    mediaCreatedBy: text("media_created_by"),
  },
  (table) => [
    primaryKey({ name: "catalog_product_images_pk", columns: [table.workspaceId, table.productId, table.productImageId] }),
    foreignKey({
      name: "catalog_product_images_product_fk",
      columns: [table.workspaceId, table.productId],
      foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId],
    }).onDelete("cascade"),
    uniqueIndex("catalog_product_images_workspace_product_position_uq").on(table.workspaceId, table.productId, table.position),
    uniqueIndex("catalog_product_images_one_main_uq").on(table.workspaceId, table.productId).where(sql`${table.isMain} = true`),
    uniqueIndex("catalog_product_images_storage_key_uq").on(table.storageKey),
    check("catalog_product_images_position_non_negative", sql`${table.position} >= 0`),
    check("catalog_product_images_workflow_integrity", sql`(${table.checksumSha256} IS NULL AND ${table.mimeType} IS NULL AND ${table.mediaCreatedAt} IS NULL AND ${table.mediaCreatedBy} IS NULL) OR (${table.checksumSha256} ~ '^[a-f0-9]{64}$' AND ${table.mimeType} = 'image/webp' AND ${table.mediaCreatedAt} IS NOT NULL AND btrim(${table.mediaCreatedBy}) <> '')`),
  ],
);

export const catalogProductMediaRoots = pgTable(
  "catalog_product_media_roots",
  {
    workspaceId: text("workspace_id").notNull(),
    productId: text("product_id").notNull(),
    storageRootKey: text("storage_root_key").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "catalog_product_media_roots_pk", columns: [table.workspaceId, table.productId] }),
    uniqueIndex("catalog_product_media_roots_storage_root_uq").on(table.storageRootKey),
    foreignKey({
      name: "catalog_product_media_roots_product_fk",
      columns: [table.workspaceId, table.productId],
      foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId],
    }).onDelete("restrict"),
    check("catalog_product_media_roots_storage_key_length", sql`length(${table.storageRootKey}) BETWEEN 1 AND 512`),
    check("catalog_product_media_roots_storage_key_lowercase", sql`${table.storageRootKey} = lower(${table.storageRootKey})`),
    check("catalog_product_media_roots_storage_key_canonical", sql`${table.storageRootKey} ~ '^[a-z0-9][a-z0-9._/-]*$'`),
    check("catalog_product_media_roots_storage_key_boundaries", sql`${table.storageRootKey} NOT LIKE '/%' AND ${table.storageRootKey} NOT LIKE '%/'`),
    check("catalog_product_media_roots_storage_key_separators", sql`${table.storageRootKey} NOT LIKE '%//%' AND position(chr(92) in ${table.storageRootKey}) = 0`),
    check("catalog_product_media_roots_storage_key_segments", sql`${table.storageRootKey} !~ '(^|/)\\.{1,2}(/|$)'`),
    check("catalog_product_media_roots_storage_key_not_drive", sql`${table.storageRootKey} !~ '^[a-z]:'`),
    check("catalog_product_media_roots_storage_key_shape", sql`${table.storageRootKey} ~ '^workspaces/[a-z0-9][a-z0-9._-]{0,63}/[a-z0-9][a-z0-9._-]{0,63}/[a-z0-9][a-z0-9-]{0,77}--[a-f0-9]{16}$'`),
    check("catalog_product_media_roots_storage_key_reserved", sql`${table.storageRootKey} !~ '(^|/)(_staging|_trash|_variants)(/|$)'`),
  ],
);

export const catalogProductMediaStates = pgTable(
  "catalog_product_media_states",
  {
    workspaceId: text("workspace_id").notNull(),
    productId: text("product_id").notNull(),
    revision: bigint("revision", { mode: "number" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedBy: text("updated_by").notNull(),
  },
  (table) => [
    primaryKey({ name: "catalog_product_media_states_pk", columns: [table.workspaceId, table.productId] }),
    foreignKey({ name: "catalog_product_media_states_product_fk", columns: [table.workspaceId, table.productId], foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId] }).onDelete("restrict"),
    check("catalog_product_media_states_revision_safe", sql`${table.revision} BETWEEN 0 AND 9007199254740991`),
  ],
);

export const catalogProductMediaWorkflows = pgTable(
  "catalog_product_media_workflows",
  {
    workspaceId: text("workspace_id").notNull(),
    workflowId: text("workflow_id").notNull(),
    productId: text("product_id").notNull(),
    status: text("status").notNull(),
    expectedMediaRevision: bigint("expected_media_revision", { mode: "number" }).notNull(),
    idempotencyKey: text("idempotency_key").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    createdBy: text("created_by").notNull(),
    startedAt: timestamp("started_at", { withTimezone: true, mode: "date" }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
    version: bigint("version", { mode: "number" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "catalog_product_media_workflows_pk", columns: [table.workspaceId, table.workflowId] }),
    foreignKey({ name: "catalog_product_media_workflows_product_fk", columns: [table.workspaceId, table.productId], foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId] }).onDelete("restrict"),
    uniqueIndex("catalog_product_media_workflows_idempotency_uq").on(table.workspaceId, table.idempotencyKey),
    index("catalog_product_media_workflows_product_idx").on(table.workspaceId, table.productId, table.startedAt),
    check("catalog_product_media_workflows_status", sql`${table.status} IN ('Pending','InProgress','Completed','PartiallyCompleted','Failed','ReconciliationRequired','Cancelled')`),
    check("catalog_product_media_workflows_revisions_safe", sql`${table.expectedMediaRevision} BETWEEN 0 AND 9007199254740991 AND ${table.version} BETWEEN 0 AND 9007199254740991`),
    check("catalog_product_media_workflows_fingerprint", sql`${table.requestFingerprint} ~ '^[a-f0-9]{64}$'`),
  ],
);

export const catalogProductMediaOperations = pgTable(
  "catalog_product_media_operations",
  {
    workspaceId: text("workspace_id").notNull(),
    operationId: text("operation_id").notNull(),
    workflowId: text("workflow_id").notNull(),
    type: text("type").notNull(),
    status: text("status").notNull(),
    targetMediaId: text("target_media_id"),
    requestedDisplayOrder: integer("requested_display_order"),
    selectAsCover: boolean("select_as_cover").notNull().default(false),
    orderedMediaIds: jsonb("ordered_media_ids").$type<string[]>(),
    stagedArtifactKey: text("staged_artifact_key"),
    finalArtifactKey: text("final_artifact_key"),
    stagedSha256: text("staged_sha256"),
    stagedByteLength: bigint("staged_byte_length", { mode: "number" }),
    stagedWidth: integer("staged_width"),
    stagedHeight: integer("staged_height"),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }),
    attemptCount: bigint("attempt_count", { mode: "number" }).notNull(),
    lastAttemptAt: timestamp("last_attempt_at", { withTimezone: true, mode: "date" }),
    retryAllowed: boolean("retry_allowed").notNull(),
    requiresNewSource: boolean("requires_new_source").notNull(),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "date" }),
  },
  (table) => [
    primaryKey({ name: "catalog_product_media_operations_pk", columns: [table.workspaceId, table.operationId] }),
    foreignKey({ name: "catalog_product_media_operations_workflow_fk", columns: [table.workspaceId, table.workflowId], foreignColumns: [catalogProductMediaWorkflows.workspaceId, catalogProductMediaWorkflows.workflowId] }).onDelete("cascade"),
    index("catalog_product_media_operations_workflow_idx").on(table.workspaceId, table.workflowId, table.createdAt),
    index("catalog_product_media_operations_expiry_idx").on(table.workspaceId, table.expiresAt),
    check("catalog_product_media_operations_type", sql`${table.type} IN ('Add','Replace','Remove','SetCover','Reorder')`),
    check("catalog_product_media_operations_status", sql`${table.status} IN ('Pending','Staged','InProgress','Completed','Failed','SourceUnavailable','ReconciliationRequired','Cancelled')`),
    check("catalog_product_media_operations_attempt_safe", sql`${table.attemptCount} BETWEEN 0 AND 9007199254740991`),
    check("catalog_product_media_operations_staging_relative", sql`${table.stagedArtifactKey} IS NULL OR (${table.stagedArtifactKey} !~ '^[a-zA-Z]:' AND ${table.stagedArtifactKey} NOT LIKE '/%' AND position(chr(92) in ${table.stagedArtifactKey}) = 0)`),
    check("catalog_product_media_operations_staged_integrity", sql`(${table.stagedArtifactKey} IS NULL AND ${table.stagedSha256} IS NULL AND ${table.stagedByteLength} IS NULL AND ${table.stagedWidth} IS NULL AND ${table.stagedHeight} IS NULL) OR (${table.stagedArtifactKey} IS NOT NULL AND ${table.stagedSha256} ~ '^[a-f0-9]{64}$' AND ${table.stagedByteLength} > 0 AND ${table.stagedWidth} > 0 AND ${table.stagedHeight} > 0)`),
  ],
);

export const catalogProductMediaSourceAttempts = pgTable(
  "catalog_product_media_source_attempts",
  {
    workspaceId: text("workspace_id").notNull(),
    operationId: text("operation_id").notNull(),
    sourceAttemptId: text("source_attempt_id").notNull(),
    sourceFingerprint: text("source_fingerprint").notNull(),
    status: text("status").notNull(),
    createdByActorId: text("created_by_actor_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    expiresAt: timestamp("expires_at", { withTimezone: true, mode: "date" }).notNull(),
    verifiedSha256: text("verified_sha256"),
    verifiedSizeBytes: bigint("verified_size_bytes", { mode: "number" }),
    verifiedMimeType: text("verified_mime_type"),
    verifiedWidth: integer("verified_width"),
    verifiedHeight: integer("verified_height"),
    stagingArtifactKey: text("staging_artifact_key"),
    appliedAt: timestamp("applied_at", { withTimezone: true, mode: "date" }),
    failedAt: timestamp("failed_at", { withTimezone: true, mode: "date" }),
    failureCode: text("failure_code"),
  },
  (table) => [
    primaryKey({ name: "catalog_product_media_source_attempts_pk", columns: [table.workspaceId, table.sourceAttemptId] }),
    foreignKey({
      name: "catalog_product_media_source_attempts_operation_fk",
      columns: [table.workspaceId, table.operationId],
      foreignColumns: [catalogProductMediaOperations.workspaceId, catalogProductMediaOperations.operationId],
    }).onDelete("cascade"),
    uniqueIndex("catalog_product_media_source_attempts_active_uq")
      .on(table.workspaceId, table.operationId)
      .where(sql`${table.status} IN ('AwaitingUpload','Uploaded')`),
    index("catalog_product_media_source_attempts_expiry_idx").on(table.workspaceId, table.expiresAt),
    check("catalog_product_media_source_attempts_id", sql`${table.sourceAttemptId} ~ '^[a-f0-9]{32}$'`),
    check("catalog_product_media_source_attempts_fingerprint", sql`${table.sourceFingerprint} ~ '^[a-f0-9]{64}$'`),
    check("catalog_product_media_source_attempts_status", sql`${table.status} IN ('AwaitingUpload','Uploaded','Applied','Failed','Expired')`),
    check("catalog_product_media_source_attempts_lifetime", sql`${table.expiresAt} = ${table.createdAt} + interval '14 days'`),
    check("catalog_product_media_source_attempts_verified", sql`(
      ${table.verifiedSha256} IS NULL AND ${table.verifiedSizeBytes} IS NULL AND ${table.verifiedMimeType} IS NULL
      AND ${table.verifiedWidth} IS NULL AND ${table.verifiedHeight} IS NULL AND ${table.stagingArtifactKey} IS NULL
    ) OR (
      ${table.verifiedSha256} ~ '^[a-f0-9]{64}$' AND ${table.verifiedSizeBytes} > 0
      AND ${table.verifiedMimeType} IN ('image/jpeg','image/png','image/webp')
      AND ${table.verifiedWidth} > 0 AND ${table.verifiedHeight} > 0 AND btrim(${table.stagingArtifactKey}) <> ''
    )`),
  ],
);

export const catalogProductMediaSourceAttemptAudits = pgTable(
  "catalog_product_media_source_attempt_audits",
  {
    workspaceId: text("workspace_id").notNull(),
    auditId: text("audit_id").notNull(),
    operationId: text("operation_id").notNull(),
    sourceAttemptId: text("source_attempt_id").notNull(),
    eventType: text("event_type").notNull(),
    actorId: text("actor_id").notNull(),
    resultCode: text("result_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "catalog_product_media_source_attempt_audits_pk", columns: [table.workspaceId, table.auditId] }),
    foreignKey({
      name: "catalog_product_media_source_attempt_audits_attempt_fk",
      columns: [table.workspaceId, table.sourceAttemptId],
      foreignColumns: [catalogProductMediaSourceAttempts.workspaceId, catalogProductMediaSourceAttempts.sourceAttemptId],
    }).onDelete("restrict"),
    index("catalog_product_media_source_attempt_audits_operation_idx").on(table.workspaceId, table.operationId, table.occurredAt),
    check("catalog_product_media_source_attempt_audits_event", sql`${table.eventType} IN ('SourceAttemptCreated','SourceAttemptFailed','SourceAttemptApplied','SourceAttemptExpired')`),
    check("catalog_product_media_source_attempt_audits_non_empty", sql`btrim(${table.actorId}) <> '' AND btrim(${table.resultCode}) <> ''`),
  ],
);

export const catalogProductEntrySubmissions = pgTable(
  "catalog_product_entry_submissions",
  {
    workspaceId: text("workspace_id").notNull(),
    submissionId: text("submission_id").notNull(),
    requestFingerprint: text("request_fingerprint").notNull(),
    productId: text("product_id"),
    mode: text("mode").notNull(),
    status: text("status").notNull(),
    productRevision: bigint("product_revision", { mode: "number" }),
    mediaWorkflowId: text("media_workflow_id"),
    productSaveReceipt: jsonb("product_save_receipt").$type<ProductEntrySaveReceipt>(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "catalog_product_entry_submissions_pk", columns: [table.workspaceId, table.submissionId] }),
    foreignKey({
      name: "catalog_product_entry_submissions_product_fk",
      columns: [table.workspaceId, table.productId],
      foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId],
    }).onDelete("restrict"),
    foreignKey({
      name: "catalog_product_entry_submissions_media_workflow_fk",
      columns: [table.workspaceId, table.mediaWorkflowId],
      foreignColumns: [catalogProductMediaWorkflows.workspaceId, catalogProductMediaWorkflows.workflowId],
    }).onDelete("restrict"),
    index("catalog_product_entry_submissions_product_idx").on(table.workspaceId, table.productId),
    index("catalog_product_entry_submissions_status_idx").on(table.workspaceId, table.status, table.updatedAt),
    check("catalog_product_entry_submissions_fingerprint", sql`${table.requestFingerprint} ~ '^[a-f0-9]{64}$'`),
    check("catalog_product_entry_submissions_mode", sql`${table.mode} IN ('Create','Edit')`),
    check("catalog_product_entry_submissions_status", sql`${table.status} IN ('Claimed','ProductSaved','Completed','PartiallyCompleted')`),
    check("catalog_product_entry_submissions_revision_safe", sql`${table.productRevision} IS NULL OR ${table.productRevision} BETWEEN 0 AND 9007199254740991`),
    check("catalog_product_entry_submissions_timestamps_ordered", sql`${table.createdAt} <= ${table.updatedAt}`),
    check("catalog_product_entry_submissions_identity_non_empty", sql`btrim(${table.submissionId}) <> ''`),
    check("catalog_product_entry_submissions_mode_identity", sql`
      (${table.mode} = 'Edit' AND ${table.productId} IS NOT NULL) OR
      (${table.mode} = 'Create' AND (${table.status} <> 'Claimed' OR ${table.productId} IS NULL))
    `),
    check("catalog_product_entry_submissions_saved_state", sql`
      (${table.status} = 'Claimed' AND ${table.productRevision} IS NULL AND ${table.mediaWorkflowId} IS NULL AND ${table.productSaveReceipt} IS NULL) OR
      (${table.status} IN ('ProductSaved','Completed','PartiallyCompleted') AND ${table.productId} IS NOT NULL AND ${table.productRevision} IS NOT NULL AND ${table.productSaveReceipt} IS NOT NULL AND jsonb_typeof(${table.productSaveReceipt}) = 'object')
    `),
  ],
);

export const catalogProductEntrySubmissionMediaOperations = pgTable(
  "catalog_product_entry_submission_media_operations",
  {
    workspaceId: text("workspace_id").notNull(),
    submissionId: text("submission_id").notNull(),
    operationId: text("operation_id").notNull(),
    operationType: text("operation_type").notNull(),
    sequence: integer("sequence").notNull(),
    mediaId: text("media_id"),
    requestedDisplayOrder: integer("requested_display_order"),
    selectedAsCover: boolean("selected_as_cover").notNull().default(false),
    expectedSourceSha256: text("expected_source_sha256"),
    expectedSourceByteLength: bigint("expected_source_byte_length", { mode: "number" }),
    finalOrder: integer("final_order"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({
      name: "catalog_product_entry_submission_media_operations_pk",
      columns: [table.workspaceId, table.submissionId, table.operationId],
    }),
    foreignKey({
      name: "catalog_product_entry_submission_media_operations_submission_fk",
      columns: [table.workspaceId, table.submissionId],
      foreignColumns: [catalogProductEntrySubmissions.workspaceId, catalogProductEntrySubmissions.submissionId],
    }).onDelete("restrict"),
    uniqueIndex("catalog_product_entry_submission_media_operations_sequence_uq")
      .on(table.workspaceId, table.submissionId, table.sequence),
    uniqueIndex("catalog_product_entry_submission_media_operations_cover_uq")
      .on(table.workspaceId, table.submissionId)
      .where(sql`${table.selectedAsCover} = true`),
    check("catalog_product_entry_submission_media_operations_type", sql`${table.operationType} IN ('Add','Replace','Remove','Reorder','SetCover')`),
    check("catalog_product_entry_submission_media_operations_identity_non_empty", sql`btrim(${table.operationId}) <> ''`),
    check("catalog_product_entry_submission_media_operations_sequence", sql`${table.sequence} >= 0`),
    check("catalog_product_entry_submission_media_operations_orders", sql`
      (${table.requestedDisplayOrder} IS NULL OR ${table.requestedDisplayOrder} >= 0) AND
      (${table.finalOrder} IS NULL OR ${table.finalOrder} >= 0)
    `),
    check("catalog_product_entry_submission_media_operations_source_length", sql`${table.expectedSourceByteLength} IS NULL OR ${table.expectedSourceByteLength} BETWEEN 1 AND 9007199254740991`),
    check("catalog_product_entry_submission_media_operations_shape", sql`
      (${table.operationType} = 'Add' AND ${table.mediaId} IS NULL AND ${table.expectedSourceSha256} ~ '^[a-f0-9]{64}$' AND ${table.expectedSourceByteLength} IS NOT NULL) OR
      (${table.operationType} = 'Replace' AND btrim(${table.mediaId}) <> '' AND ${table.expectedSourceSha256} ~ '^[a-f0-9]{64}$' AND ${table.expectedSourceByteLength} IS NOT NULL) OR
      (${table.operationType} = 'Remove' AND btrim(${table.mediaId}) <> '' AND ${table.expectedSourceSha256} IS NULL AND ${table.expectedSourceByteLength} IS NULL AND ${table.requestedDisplayOrder} IS NULL AND ${table.finalOrder} IS NULL AND ${table.selectedAsCover} = false) OR
      (${table.operationType} = 'Reorder' AND btrim(${table.mediaId}) <> '' AND ${table.expectedSourceSha256} IS NULL AND ${table.expectedSourceByteLength} IS NULL AND ${table.requestedDisplayOrder} IS NOT NULL AND ${table.finalOrder} = ${table.requestedDisplayOrder} AND ${table.selectedAsCover} = false) OR
      (${table.operationType} = 'SetCover' AND btrim(${table.mediaId}) <> '' AND ${table.expectedSourceSha256} IS NULL AND ${table.expectedSourceByteLength} IS NULL AND ${table.requestedDisplayOrder} IS NULL AND ${table.finalOrder} IS NULL AND ${table.selectedAsCover} = true)
    `),
  ],
);

export const catalogProductEntryAuditRecords = pgTable(
  "catalog_product_entry_audit_records",
  {
    workspaceId: text("workspace_id").notNull(),
    auditId: text("audit_id").notNull(),
    eventType: text("event_type").notNull(),
    actorId: text("actor_id").notNull(),
    submissionId: text("submission_id").notNull(),
    productId: text("product_id").notNull(),
    resultCode: text("result_code").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "date" }).notNull(),
  },
  (table) => [
    primaryKey({ name: "catalog_product_entry_audit_records_pk", columns: [table.workspaceId, table.auditId] }),
    foreignKey({
      name: "catalog_product_entry_audit_records_submission_fk",
      columns: [table.workspaceId, table.submissionId],
      foreignColumns: [catalogProductEntrySubmissions.workspaceId, catalogProductEntrySubmissions.submissionId],
    }).onDelete("restrict"),
    foreignKey({
      name: "catalog_product_entry_audit_records_product_fk",
      columns: [table.workspaceId, table.productId],
      foreignColumns: [catalogProducts.workspaceId, catalogProducts.productId],
    }).onDelete("restrict"),
    index("catalog_product_entry_audit_records_submission_idx").on(table.workspaceId, table.submissionId, table.occurredAt),
    index("catalog_product_entry_audit_records_product_idx").on(table.workspaceId, table.productId, table.occurredAt),
    check("catalog_product_entry_audit_records_event_type", sql`${table.eventType} IN ('SubmissionClaimed','ProductCreateRequested','ProductEditRequested','ProductSaved','LifecycleOutcome')`),
    check("catalog_product_entry_audit_records_non_empty", sql`btrim(${table.auditId}) <> '' AND btrim(${table.actorId}) <> '' AND btrim(${table.resultCode}) <> ''`),
  ],
);
