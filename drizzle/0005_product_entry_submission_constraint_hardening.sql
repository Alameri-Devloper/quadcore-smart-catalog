ALTER TABLE "catalog_product_entry_submissions" DROP CONSTRAINT "catalog_product_entry_submissions_mode_identity";--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submissions" DROP CONSTRAINT "catalog_product_entry_submissions_saved_state";--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submission_media_operations" ADD CONSTRAINT "catalog_product_entry_submission_media_operations_identity_non_empty" CHECK (btrim("catalog_product_entry_submission_media_operations"."operation_id") <> '');--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submissions" ADD CONSTRAINT "catalog_product_entry_submissions_identity_non_empty" CHECK (btrim("catalog_product_entry_submissions"."submission_id") <> '');--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submissions" ADD CONSTRAINT "catalog_product_entry_submissions_mode_identity" CHECK (
      ("catalog_product_entry_submissions"."mode" = 'Edit' AND "catalog_product_entry_submissions"."product_id" IS NOT NULL) OR
      ("catalog_product_entry_submissions"."mode" = 'Create' AND ("catalog_product_entry_submissions"."status" <> 'Claimed' OR "catalog_product_entry_submissions"."product_id" IS NULL))
    );--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submissions" ADD CONSTRAINT "catalog_product_entry_submissions_saved_state" CHECK (
      ("catalog_product_entry_submissions"."status" = 'Claimed' AND "catalog_product_entry_submissions"."product_revision" IS NULL AND "catalog_product_entry_submissions"."media_workflow_id" IS NULL AND "catalog_product_entry_submissions"."product_save_receipt" IS NULL) OR
      ("catalog_product_entry_submissions"."status" IN ('ProductSaved','Completed','PartiallyCompleted') AND "catalog_product_entry_submissions"."product_id" IS NOT NULL AND "catalog_product_entry_submissions"."product_revision" IS NOT NULL AND "catalog_product_entry_submissions"."product_save_receipt" IS NOT NULL AND jsonb_typeof("catalog_product_entry_submissions"."product_save_receipt") = 'object')
    );