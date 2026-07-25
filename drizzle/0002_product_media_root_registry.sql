CREATE TABLE "catalog_product_media_roots" (
	"workspace_id" text NOT NULL,
	"product_id" text NOT NULL,
	"storage_root_key" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_media_roots_pk" PRIMARY KEY("workspace_id","product_id"),
	CONSTRAINT "catalog_product_media_roots_storage_key_length" CHECK (length("catalog_product_media_roots"."storage_root_key") BETWEEN 1 AND 512),
	CONSTRAINT "catalog_product_media_roots_storage_key_lowercase" CHECK ("catalog_product_media_roots"."storage_root_key" = lower("catalog_product_media_roots"."storage_root_key")),
	CONSTRAINT "catalog_product_media_roots_storage_key_canonical" CHECK ("catalog_product_media_roots"."storage_root_key" ~ '^[a-z0-9][a-z0-9._/-]*$'),
	CONSTRAINT "catalog_product_media_roots_storage_key_boundaries" CHECK ("catalog_product_media_roots"."storage_root_key" NOT LIKE '/%' AND "catalog_product_media_roots"."storage_root_key" NOT LIKE '%/'),
	CONSTRAINT "catalog_product_media_roots_storage_key_separators" CHECK ("catalog_product_media_roots"."storage_root_key" NOT LIKE '%//%' AND position(chr(92) in "catalog_product_media_roots"."storage_root_key") = 0),
	CONSTRAINT "catalog_product_media_roots_storage_key_segments" CHECK ("catalog_product_media_roots"."storage_root_key" !~ '(^|/)\.{1,2}(/|$)'),
	CONSTRAINT "catalog_product_media_roots_storage_key_not_drive" CHECK ("catalog_product_media_roots"."storage_root_key" !~ '^[a-z]:'),
	CONSTRAINT "catalog_product_media_roots_storage_key_shape" CHECK ("catalog_product_media_roots"."storage_root_key" ~ '^workspaces/[a-z0-9][a-z0-9._-]{0,63}/[a-z0-9][a-z0-9._-]{0,63}/[a-z0-9][a-z0-9-]{0,77}--[a-f0-9]{16}$'),
	CONSTRAINT "catalog_product_media_roots_storage_key_reserved" CHECK ("catalog_product_media_roots"."storage_root_key" !~ '(^|/)(_staging|_trash|_variants)(/|$)')
);
--> statement-breakpoint
ALTER TABLE "catalog_product_media_roots" ADD CONSTRAINT "catalog_product_media_roots_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_media_roots_storage_root_uq" ON "catalog_product_media_roots" USING btree ("storage_root_key");