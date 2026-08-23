CREATE TABLE "catalog_branch_product_listings" (
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"product_id" text NOT NULL,
	"listing_status" text NOT NULL,
	"revision" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_branch_product_listings_pk" PRIMARY KEY("workspace_id","branch_id","product_id"),
	CONSTRAINT "catalog_branch_product_listings_status" CHECK ("catalog_branch_product_listings"."listing_status" IN ('Listed','Unlisted')),
	CONSTRAINT "catalog_branch_product_listings_revision" CHECK ("catalog_branch_product_listings"."revision" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_branch_product_listings_timestamps" CHECK ("catalog_branch_product_listings"."created_at" <= "catalog_branch_product_listings"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_product_branch_price_overrides" (
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"product_id" text NOT NULL,
	"price_type" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"revision" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_branch_price_overrides_pk" PRIMARY KEY("workspace_id","branch_id","product_id","price_type"),
	CONSTRAINT "catalog_product_branch_price_overrides_type" CHECK ("catalog_product_branch_price_overrides"."price_type" IN ('Retail','Wholesale','ReferenceCost')),
	CONSTRAINT "catalog_product_branch_price_overrides_amount" CHECK ("catalog_product_branch_price_overrides"."amount_minor" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_product_branch_price_overrides_currency" CHECK ("catalog_product_branch_price_overrides"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "catalog_product_branch_price_overrides_revision" CHECK ("catalog_product_branch_price_overrides"."revision" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_product_branch_price_overrides_timestamps" CHECK ("catalog_product_branch_price_overrides"."created_at" <= "catalog_product_branch_price_overrides"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "catalog_product_reference_costs" (
	"workspace_id" text NOT NULL,
	"product_id" text NOT NULL,
	"amount_minor" bigint NOT NULL,
	"currency" text NOT NULL,
	"revision" bigint DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_reference_costs_pk" PRIMARY KEY("workspace_id","product_id"),
	CONSTRAINT "catalog_product_reference_costs_amount" CHECK ("catalog_product_reference_costs"."amount_minor" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_product_reference_costs_currency" CHECK ("catalog_product_reference_costs"."currency" ~ '^[A-Z]{3}$'),
	CONSTRAINT "catalog_product_reference_costs_revision" CHECK ("catalog_product_reference_costs"."revision" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_product_reference_costs_timestamps" CHECK ("catalog_product_reference_costs"."created_at" <= "catalog_product_reference_costs"."updated_at")
);
--> statement-breakpoint
ALTER TABLE "identity_membership_permissions" DROP CONSTRAINT "identity_membership_permissions_known_code";--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD COLUMN "code" text DEFAULT 'branch-' || substr(md5(random()::text), 1, 12) NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD COLUMN "display_name" text DEFAULT 'Branch' NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD COLUMN "sort_order" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD COLUMN "revision" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "catalog_branch_product_listings" ADD CONSTRAINT "catalog_branch_product_listings_branch_fk" FOREIGN KEY ("workspace_id","branch_id") REFERENCES "public"."workspace_branch_references"("workspace_id","branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_branch_product_listings" ADD CONSTRAINT "catalog_branch_product_listings_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_branch_price_overrides" ADD CONSTRAINT "catalog_product_branch_price_overrides_branch_fk" FOREIGN KEY ("workspace_id","branch_id") REFERENCES "public"."workspace_branch_references"("workspace_id","branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_branch_price_overrides" ADD CONSTRAINT "catalog_product_branch_price_overrides_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_reference_costs" ADD CONSTRAINT "catalog_product_reference_costs_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_branch_product_listings_product_idx" ON "catalog_branch_product_listings" USING btree ("workspace_id","product_id","listing_status");--> statement-breakpoint
CREATE INDEX "catalog_product_branch_price_overrides_product_idx" ON "catalog_product_branch_price_overrides" USING btree ("workspace_id","product_id","branch_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_branch_references_workspace_code_uq" ON "workspace_branch_references" USING btree ("workspace_id","code");--> statement-breakpoint
CREATE INDEX "workspace_branch_references_workspace_status_sort_idx" ON "workspace_branch_references" USING btree ("workspace_id","status","sort_order");--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD CONSTRAINT "workspace_branch_references_code" CHECK ("workspace_branch_references"."code" ~ '^[a-z0-9]+(-[a-z0-9]+)*$' AND length("workspace_branch_references"."code") <= 64);--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD CONSTRAINT "workspace_branch_references_display_name" CHECK (btrim("workspace_branch_references"."display_name") <> '' AND length("workspace_branch_references"."display_name") <= 160);--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD CONSTRAINT "workspace_branch_references_sort_order" CHECK ("workspace_branch_references"."sort_order" BETWEEN 0 AND 1000000);--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD CONSTRAINT "workspace_branch_references_revision" CHECK ("workspace_branch_references"."revision" BETWEEN 1 AND 9007199254740991);--> statement-breakpoint
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
      'workspace.settings.view','workspace.settings.manage','workspace.audit.view','workspace.branches.view'
    ));