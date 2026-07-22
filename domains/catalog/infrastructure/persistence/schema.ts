import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  foreignKey,
  index,
  integer,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from "drizzle-orm/pg-core";

export const catalogProducts = pgTable(
  "catalog_products",
  {
    workspaceId: text("workspace_id").notNull(),
    productId: text("product_id").notNull(),
    catalogId: text("catalog_id").notNull(),
    lifecycleState: text("lifecycle_state").notNull(),
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
    check("catalog_product_images_position_non_negative", sql`${table.position} >= 0`),
  ],
);
