ALTER TABLE "catalog_products" ADD COLUMN "archive_reason" text;--> statement-breakpoint
UPDATE "catalog_products" SET "archive_reason" = 'Manual' WHERE "lifecycle_state" = 'Archived';--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_archive_reason_valid" CHECK ("catalog_products"."archive_reason" IS NULL OR "catalog_products"."archive_reason" IN ('Manual', 'PublicationRequirementsNotMet'));--> statement-breakpoint
ALTER TABLE "catalog_products" ADD CONSTRAINT "catalog_products_archive_reason_lifecycle" CHECK (("catalog_products"."lifecycle_state" = 'Archived' AND "catalog_products"."archive_reason" IS NOT NULL) OR ("catalog_products"."lifecycle_state" IN ('Draft', 'Published') AND "catalog_products"."archive_reason" IS NULL));
