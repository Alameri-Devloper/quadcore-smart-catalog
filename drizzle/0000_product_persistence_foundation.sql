CREATE TABLE "catalog_product_images" (
	"workspace_id" text NOT NULL,
	"product_id" text NOT NULL,
	"product_image_id" text NOT NULL,
	"storage_key" text NOT NULL,
	"position" integer NOT NULL,
	"is_main" boolean NOT NULL,
	"alt_text" text,
	CONSTRAINT "catalog_product_images_pk" PRIMARY KEY("workspace_id","product_id","product_image_id"),
	CONSTRAINT "catalog_product_images_position_non_negative" CHECK ("catalog_product_images"."position" >= 0)
);
--> statement-breakpoint
CREATE TABLE "catalog_product_specification_values" (
	"workspace_id" text NOT NULL,
	"product_id" text NOT NULL,
	"specification_field_id" text NOT NULL,
	"position" integer NOT NULL,
	"value_type" text NOT NULL,
	"text_value" text,
	"number_value" text,
	"boolean_value" boolean,
	CONSTRAINT "catalog_product_specification_values_pk" PRIMARY KEY("workspace_id","product_id","specification_field_id"),
	CONSTRAINT "catalog_product_specification_values_position_non_negative" CHECK ("catalog_product_specification_values"."position" >= 0),
	CONSTRAINT "catalog_product_specification_values_typed_value" CHECK (
      ("catalog_product_specification_values"."value_type" = 'string' AND "catalog_product_specification_values"."text_value" IS NOT NULL AND "catalog_product_specification_values"."number_value" IS NULL AND "catalog_product_specification_values"."boolean_value" IS NULL) OR
      ("catalog_product_specification_values"."value_type" = 'number' AND "catalog_product_specification_values"."text_value" IS NULL AND "catalog_product_specification_values"."number_value" IS NOT NULL AND "catalog_product_specification_values"."boolean_value" IS NULL) OR
      ("catalog_product_specification_values"."value_type" = 'boolean' AND "catalog_product_specification_values"."text_value" IS NULL AND "catalog_product_specification_values"."number_value" IS NULL AND "catalog_product_specification_values"."boolean_value" IS NOT NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "catalog_products" (
	"workspace_id" text NOT NULL,
	"product_id" text NOT NULL,
	"catalog_id" text NOT NULL,
	"lifecycle_state" text NOT NULL,
	"revision" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"has_classification" boolean NOT NULL,
	"category_id" text,
	"product_type_id" text,
	"device_class_id" text,
	"condition_id" text,
	"availability_status_id" text,
	"has_commercial_details" boolean NOT NULL,
	"product_name" text,
	"product_code" text,
	"product_model_id" text,
	"brand_id" text,
	"is_highlighted" boolean DEFAULT false NOT NULL,
	"wholesale_price_minor" bigint,
	"wholesale_price_currency" text,
	"retail_price_minor" bigint,
	"retail_price_currency" text,
	CONSTRAINT "catalog_products_pk" PRIMARY KEY("workspace_id","product_id"),
	CONSTRAINT "catalog_products_lifecycle_state_valid" CHECK ("catalog_products"."lifecycle_state" IN ('Draft', 'Published', 'Archived')),
	CONSTRAINT "catalog_products_revision_safe_range" CHECK ("catalog_products"."revision" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_products_timestamps_ordered" CHECK ("catalog_products"."created_at" <= "catalog_products"."updated_at"),
	CONSTRAINT "catalog_products_wholesale_pair" CHECK (("catalog_products"."wholesale_price_minor" IS NULL) = ("catalog_products"."wholesale_price_currency" IS NULL)),
	CONSTRAINT "catalog_products_retail_pair" CHECK (("catalog_products"."retail_price_minor" IS NULL) = ("catalog_products"."retail_price_currency" IS NULL)),
	CONSTRAINT "catalog_products_wholesale_safe_range" CHECK ("catalog_products"."wholesale_price_minor" IS NULL OR "catalog_products"."wholesale_price_minor" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_products_retail_safe_range" CHECK ("catalog_products"."retail_price_minor" IS NULL OR "catalog_products"."retail_price_minor" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_products_product_code_canonical" CHECK ("catalog_products"."product_code" IS NULL OR (btrim("catalog_products"."product_code") <> '' AND "catalog_products"."product_code" = upper(btrim("catalog_products"."product_code")))),
	CONSTRAINT "catalog_products_classification_presence" CHECK ("catalog_products"."has_classification" OR ("catalog_products"."category_id" IS NULL AND "catalog_products"."product_type_id" IS NULL AND "catalog_products"."device_class_id" IS NULL AND "catalog_products"."condition_id" IS NULL AND "catalog_products"."availability_status_id" IS NULL)),
	CONSTRAINT "catalog_products_commercial_presence" CHECK ("catalog_products"."has_commercial_details" OR ("catalog_products"."product_name" IS NULL AND "catalog_products"."product_code" IS NULL AND "catalog_products"."product_model_id" IS NULL AND "catalog_products"."brand_id" IS NULL AND "catalog_products"."is_highlighted" = false AND "catalog_products"."wholesale_price_minor" IS NULL AND "catalog_products"."wholesale_price_currency" IS NULL AND "catalog_products"."retail_price_minor" IS NULL AND "catalog_products"."retail_price_currency" IS NULL))
);
--> statement-breakpoint
ALTER TABLE "catalog_product_images" ADD CONSTRAINT "catalog_product_images_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_specification_values" ADD CONSTRAINT "catalog_product_specification_values_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_images_workspace_product_position_uq" ON "catalog_product_images" USING btree ("workspace_id","product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_images_one_main_uq" ON "catalog_product_images" USING btree ("workspace_id","product_id") WHERE "catalog_product_images"."is_main" = true;--> statement-breakpoint
CREATE INDEX "catalog_product_specification_values_workspace_field_idx" ON "catalog_product_specification_values" USING btree ("workspace_id","specification_field_id");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_specification_values_workspace_product_position_uq" ON "catalog_product_specification_values" USING btree ("workspace_id","product_id","position");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_products_workspace_product_code_uq" ON "catalog_products" USING btree ("workspace_id","product_code") WHERE "catalog_products"."product_code" IS NOT NULL;--> statement-breakpoint
CREATE INDEX "catalog_products_workspace_catalog_idx" ON "catalog_products" USING btree ("workspace_id","catalog_id");--> statement-breakpoint
CREATE INDEX "catalog_products_workspace_category_idx" ON "catalog_products" USING btree ("workspace_id","category_id");--> statement-breakpoint
CREATE INDEX "catalog_products_workspace_product_type_idx" ON "catalog_products" USING btree ("workspace_id","product_type_id");--> statement-breakpoint
CREATE INDEX "catalog_products_workspace_brand_idx" ON "catalog_products" USING btree ("workspace_id","brand_id");--> statement-breakpoint
CREATE INDEX "catalog_products_workspace_lifecycle_idx" ON "catalog_products" USING btree ("workspace_id","lifecycle_state");--> statement-breakpoint
CREATE INDEX "catalog_products_workspace_availability_idx" ON "catalog_products" USING btree ("workspace_id","availability_status_id");