CREATE TABLE "catalog_brands" (
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"brand_id" text NOT NULL,
	CONSTRAINT "catalog_brands_pk" PRIMARY KEY("workspace_id","brand_id"),
	CONSTRAINT "catalog_reference_code_shape" CHECK ("catalog_brands"."code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("catalog_brands"."code") <= 64),
	CONSTRAINT "catalog_reference_display_name" CHECK (btrim("catalog_brands"."display_name") <> '' AND length("catalog_brands"."display_name") <= 160),
	CONSTRAINT "catalog_reference_status" CHECK ("catalog_brands"."status" IN ('Active','Inactive')),
	CONSTRAINT "catalog_reference_sort_order" CHECK ("catalog_brands"."sort_order" BETWEEN 0 AND 1000000),
	CONSTRAINT "catalog_reference_version" CHECK ("catalog_brands"."version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_reference_timestamps" CHECK ("catalog_brands"."created_at" <= "catalog_brands"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_categories" (
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"category_id" text NOT NULL,
	"department_id" text NOT NULL,
	CONSTRAINT "catalog_categories_pk" PRIMARY KEY("workspace_id","category_id"),
	CONSTRAINT "catalog_reference_code_shape" CHECK ("catalog_categories"."code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("catalog_categories"."code") <= 64),
	CONSTRAINT "catalog_reference_display_name" CHECK (btrim("catalog_categories"."display_name") <> '' AND length("catalog_categories"."display_name") <= 160),
	CONSTRAINT "catalog_reference_status" CHECK ("catalog_categories"."status" IN ('Active','Inactive')),
	CONSTRAINT "catalog_reference_sort_order" CHECK ("catalog_categories"."sort_order" BETWEEN 0 AND 1000000),
	CONSTRAINT "catalog_reference_version" CHECK ("catalog_categories"."version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_reference_timestamps" CHECK ("catalog_categories"."created_at" <= "catalog_categories"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_departments" (
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"department_id" text NOT NULL,
	CONSTRAINT "catalog_departments_pk" PRIMARY KEY("workspace_id","department_id"),
	CONSTRAINT "catalog_reference_code_shape" CHECK ("catalog_departments"."code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("catalog_departments"."code") <= 64),
	CONSTRAINT "catalog_reference_display_name" CHECK (btrim("catalog_departments"."display_name") <> '' AND length("catalog_departments"."display_name") <= 160),
	CONSTRAINT "catalog_reference_status" CHECK ("catalog_departments"."status" IN ('Active','Inactive')),
	CONSTRAINT "catalog_reference_sort_order" CHECK ("catalog_departments"."sort_order" BETWEEN 0 AND 1000000),
	CONSTRAINT "catalog_reference_version" CHECK ("catalog_departments"."version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_reference_timestamps" CHECK ("catalog_departments"."created_at" <= "catalog_departments"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_product_types" (
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"product_type_id" text NOT NULL,
	"category_id" text NOT NULL,
	CONSTRAINT "catalog_product_types_pk" PRIMARY KEY("workspace_id","product_type_id"),
	CONSTRAINT "catalog_reference_code_shape" CHECK ("catalog_product_types"."code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("catalog_product_types"."code") <= 64),
	CONSTRAINT "catalog_reference_display_name" CHECK (btrim("catalog_product_types"."display_name") <> '' AND length("catalog_product_types"."display_name") <= 160),
	CONSTRAINT "catalog_reference_status" CHECK ("catalog_product_types"."status" IN ('Active','Inactive')),
	CONSTRAINT "catalog_reference_sort_order" CHECK ("catalog_product_types"."sort_order" BETWEEN 0 AND 1000000),
	CONSTRAINT "catalog_reference_version" CHECK ("catalog_product_types"."version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_reference_timestamps" CHECK ("catalog_product_types"."created_at" <= "catalog_product_types"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_specification_definitions" (
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"specification_definition_id" text NOT NULL,
	"value_type" text NOT NULL,
	"unit" text,
	CONSTRAINT "catalog_specification_definitions_pk" PRIMARY KEY("workspace_id","specification_definition_id"),
	CONSTRAINT "catalog_specification_definitions_value_type" CHECK ("catalog_specification_definitions"."value_type" IN ('Text','Number','Boolean')),
	CONSTRAINT "catalog_specification_definitions_unit" CHECK ("catalog_specification_definitions"."unit" IS NULL OR (btrim("catalog_specification_definitions"."unit") <> '' AND length("catalog_specification_definitions"."unit") <= 32)),
	CONSTRAINT "catalog_reference_code_shape" CHECK ("catalog_specification_definitions"."code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("catalog_specification_definitions"."code") <= 64),
	CONSTRAINT "catalog_reference_display_name" CHECK (btrim("catalog_specification_definitions"."display_name") <> '' AND length("catalog_specification_definitions"."display_name") <= 160),
	CONSTRAINT "catalog_reference_status" CHECK ("catalog_specification_definitions"."status" IN ('Active','Inactive')),
	CONSTRAINT "catalog_reference_sort_order" CHECK ("catalog_specification_definitions"."sort_order" BETWEEN 0 AND 1000000),
	CONSTRAINT "catalog_reference_version" CHECK ("catalog_specification_definitions"."version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_reference_timestamps" CHECK ("catalog_specification_definitions"."created_at" <= "catalog_specification_definitions"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_specification_template_entries" (
	"workspace_id" text NOT NULL,
	"specification_template_id" text NOT NULL,
	"specification_definition_id" text NOT NULL,
	"sort_order" integer NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	CONSTRAINT "catalog_specification_template_entries_pk" PRIMARY KEY("workspace_id","specification_template_id","specification_definition_id"),
	CONSTRAINT "catalog_specification_template_entries_sort" CHECK ("catalog_specification_template_entries"."sort_order" BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "catalog_specification_templates" (
	"workspace_id" text NOT NULL,
	"specification_template_id" text NOT NULL,
	"product_type_id" text NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_specification_templates_pk" PRIMARY KEY("workspace_id","specification_template_id"),
	CONSTRAINT "catalog_specification_templates_version" CHECK ("catalog_specification_templates"."version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_specification_templates_timestamps" CHECK ("catalog_specification_templates"."created_at" <= "catalog_specification_templates"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_supply_statuses" (
	"workspace_id" text NOT NULL,
	"code" text NOT NULL,
	"display_name" text NOT NULL,
	"status" text NOT NULL,
	"sort_order" integer NOT NULL,
	"version" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"supply_status_id" text NOT NULL,
	CONSTRAINT "catalog_supply_statuses_pk" PRIMARY KEY("workspace_id","supply_status_id"),
	CONSTRAINT "catalog_reference_code_shape" CHECK ("catalog_supply_statuses"."code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("catalog_supply_statuses"."code") <= 64),
	CONSTRAINT "catalog_reference_display_name" CHECK (btrim("catalog_supply_statuses"."display_name") <> '' AND length("catalog_supply_statuses"."display_name") <= 160),
	CONSTRAINT "catalog_reference_status" CHECK ("catalog_supply_statuses"."status" IN ('Active','Inactive')),
	CONSTRAINT "catalog_reference_sort_order" CHECK ("catalog_supply_statuses"."sort_order" BETWEEN 0 AND 1000000),
	CONSTRAINT "catalog_reference_version" CHECK ("catalog_supply_statuses"."version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_reference_timestamps" CHECK ("catalog_supply_statuses"."created_at" <= "catalog_supply_statuses"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "workspace_condition_availability" (
	"workspace_id" text NOT NULL,
	"condition_code" text NOT NULL,
	"enabled" boolean NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "workspace_condition_availability_pk" PRIMARY KEY("workspace_id","condition_code"),
	CONSTRAINT "workspace_condition_availability_code" CHECK ("workspace_condition_availability"."condition_code" IN ('new','used','refurbished')),
	CONSTRAINT "workspace_condition_availability_sort" CHECK ("workspace_condition_availability"."sort_order" BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
CREATE TABLE "workspace_currency_availability" (
	"workspace_id" text NOT NULL,
	"currency_code" text NOT NULL,
	"enabled" boolean NOT NULL,
	"sort_order" integer NOT NULL,
	CONSTRAINT "workspace_currency_availability_pk" PRIMARY KEY("workspace_id","currency_code"),
	CONSTRAINT "workspace_currency_availability_code" CHECK ("workspace_currency_availability"."currency_code" ~ '^[A-Z]{3}$'),
	CONSTRAINT "workspace_currency_availability_sort" CHECK ("workspace_currency_availability"."sort_order" BETWEEN 0 AND 1000000)
);
--> statement-breakpoint
ALTER TABLE "identity_membership_permissions" DROP CONSTRAINT "identity_membership_permissions_known_code";--> statement-breakpoint
ALTER TABLE "catalog_brands" ADD CONSTRAINT "catalog_brands_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_categories" ADD CONSTRAINT "catalog_categories_department_fk" FOREIGN KEY ("workspace_id","department_id") REFERENCES "public"."catalog_departments"("workspace_id","department_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_departments" ADD CONSTRAINT "catalog_departments_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_types" ADD CONSTRAINT "catalog_product_types_category_fk" FOREIGN KEY ("workspace_id","category_id") REFERENCES "public"."catalog_categories"("workspace_id","category_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification_definitions" ADD CONSTRAINT "catalog_specification_definitions_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification_template_entries" ADD CONSTRAINT "catalog_specification_template_entries_template_fk" FOREIGN KEY ("workspace_id","specification_template_id") REFERENCES "public"."catalog_specification_templates"("workspace_id","specification_template_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification_template_entries" ADD CONSTRAINT "catalog_specification_template_entries_definition_fk" FOREIGN KEY ("workspace_id","specification_definition_id") REFERENCES "public"."catalog_specification_definitions"("workspace_id","specification_definition_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_specification_templates" ADD CONSTRAINT "catalog_specification_templates_product_type_fk" FOREIGN KEY ("workspace_id","product_type_id") REFERENCES "public"."catalog_product_types"("workspace_id","product_type_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_supply_statuses" ADD CONSTRAINT "catalog_supply_statuses_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_condition_availability" ADD CONSTRAINT "workspace_condition_availability_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_currency_availability" ADD CONSTRAINT "workspace_currency_availability_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_brands_workspace_code_uq" ON "catalog_brands" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE INDEX "catalog_brands_workspace_status_sort_idx" ON "catalog_brands" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_categories_workspace_code_uq" ON "catalog_categories" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE INDEX "catalog_categories_workspace_status_sort_idx" ON "catalog_categories" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "catalog_categories_department_idx" ON "catalog_categories" USING btree ("workspace_id","department_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_departments_workspace_code_uq" ON "catalog_departments" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE INDEX "catalog_departments_workspace_status_sort_idx" ON "catalog_departments" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_types_workspace_code_uq" ON "catalog_product_types" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE INDEX "catalog_product_types_workspace_status_sort_idx" ON "catalog_product_types" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "catalog_product_types_category_idx" ON "catalog_product_types" USING btree ("workspace_id","category_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_specification_definitions_workspace_code_uq" ON "catalog_specification_definitions" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE INDEX "catalog_specification_definitions_workspace_status_sort_idx" ON "catalog_specification_definitions" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_specification_template_entries_order_uq" ON "catalog_specification_template_entries" USING btree ("workspace_id","specification_template_id","sort_order");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_specification_templates_product_type_uq" ON "catalog_specification_templates" USING btree ("workspace_id","product_type_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_supply_statuses_workspace_code_uq" ON "catalog_supply_statuses" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE INDEX "catalog_supply_statuses_workspace_status_sort_idx" ON "catalog_supply_statuses" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
CREATE INDEX "workspace_condition_availability_selection_idx" ON "workspace_condition_availability" USING btree ("workspace_id","enabled","sort_order");--> statement-breakpoint
CREATE INDEX "workspace_currency_availability_selection_idx" ON "workspace_currency_availability" USING btree ("workspace_id","enabled","sort_order");--> statement-breakpoint
ALTER TABLE "identity_membership_permissions" ADD CONSTRAINT "identity_membership_permissions_known_code" CHECK ("identity_membership_permissions"."permission_code" IN (
      'catalog.referenceData.view','catalog.referenceData.manage',
      'catalog.product.create','catalog.product.edit','catalog.product-entry-submission.read',
      'catalog.product-entry-media.upload','catalog.product.reference-cost.read','catalog.products.view',
      'catalog.products.create','catalog.products.edit','catalog.products.archive','catalog.productEntry.submit',
      'catalog.productMedia.upload','catalog.productMedia.retry','catalog.productMedia.reconciliation.manage',
      'catalog.productMedia.source.replace','catalog.sharing.create','catalog.sharing.aiRecommendation.generate',
      'pricing.view','pricing.manage','pricing.wholesale.view','pricing.branchOverride.manage',
      'referenceCost.view','referenceCost.manage','referenceCost.branchOverride.manage',
      'inventory.availability.view','inventory.quantity.view','inventory.receive','inventory.issue',
      'inventory.reserve','inventory.transfer','inventory.damage','inventory.adjust',
      'workspace.settings.view','workspace.settings.manage','workspace.audit.view'
    ));
