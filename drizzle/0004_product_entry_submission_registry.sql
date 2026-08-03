CREATE TABLE "catalog_product_entry_audit_records" (
	"workspace_id" text NOT NULL,
	"audit_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"product_id" text NOT NULL,
	"result_code" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_entry_audit_records_pk" PRIMARY KEY("workspace_id","audit_id"),
	CONSTRAINT "catalog_product_entry_audit_records_event_type" CHECK ("catalog_product_entry_audit_records"."event_type" IN ('SubmissionClaimed','ProductCreateRequested','ProductEditRequested','ProductSaved','LifecycleOutcome')),
	CONSTRAINT "catalog_product_entry_audit_records_non_empty" CHECK (btrim("catalog_product_entry_audit_records"."audit_id") <> '' AND btrim("catalog_product_entry_audit_records"."actor_id") <> '' AND btrim("catalog_product_entry_audit_records"."result_code") <> '')
);
--> statement-breakpoint
CREATE TABLE "catalog_product_entry_submission_media_operations" (
	"workspace_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"operation_type" text NOT NULL,
	"sequence" integer NOT NULL,
	"media_id" text,
	"requested_display_order" integer,
	"selected_as_cover" boolean DEFAULT false NOT NULL,
	"expected_source_sha256" text,
	"expected_source_byte_length" bigint,
	"final_order" integer,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_entry_submission_media_operations_pk" PRIMARY KEY("workspace_id","submission_id","operation_id"),
	CONSTRAINT "catalog_product_entry_submission_media_operations_type" CHECK ("catalog_product_entry_submission_media_operations"."operation_type" IN ('Add','Replace','Remove')),
	CONSTRAINT "catalog_product_entry_submission_media_operations_sequence" CHECK ("catalog_product_entry_submission_media_operations"."sequence" >= 0),
	CONSTRAINT "catalog_product_entry_submission_media_operations_orders" CHECK (
      ("catalog_product_entry_submission_media_operations"."requested_display_order" IS NULL OR "catalog_product_entry_submission_media_operations"."requested_display_order" >= 0) AND
      ("catalog_product_entry_submission_media_operations"."final_order" IS NULL OR "catalog_product_entry_submission_media_operations"."final_order" >= 0)
    ),
	CONSTRAINT "catalog_product_entry_submission_media_operations_source_length" CHECK ("catalog_product_entry_submission_media_operations"."expected_source_byte_length" IS NULL OR "catalog_product_entry_submission_media_operations"."expected_source_byte_length" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_product_entry_submission_media_operations_shape" CHECK (
      ("catalog_product_entry_submission_media_operations"."operation_type" = 'Add' AND "catalog_product_entry_submission_media_operations"."media_id" IS NULL AND "catalog_product_entry_submission_media_operations"."expected_source_sha256" ~ '^[a-f0-9]{64}$' AND "catalog_product_entry_submission_media_operations"."expected_source_byte_length" IS NOT NULL) OR
      ("catalog_product_entry_submission_media_operations"."operation_type" = 'Replace' AND btrim("catalog_product_entry_submission_media_operations"."media_id") <> '' AND "catalog_product_entry_submission_media_operations"."expected_source_sha256" ~ '^[a-f0-9]{64}$' AND "catalog_product_entry_submission_media_operations"."expected_source_byte_length" IS NOT NULL) OR
      ("catalog_product_entry_submission_media_operations"."operation_type" = 'Remove' AND btrim("catalog_product_entry_submission_media_operations"."media_id") <> '' AND "catalog_product_entry_submission_media_operations"."expected_source_sha256" IS NULL AND "catalog_product_entry_submission_media_operations"."expected_source_byte_length" IS NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "catalog_product_entry_submissions" (
	"workspace_id" text NOT NULL,
	"submission_id" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"product_id" text,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"product_revision" bigint,
	"media_workflow_id" text,
	"product_save_receipt" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_entry_submissions_pk" PRIMARY KEY("workspace_id","submission_id"),
	CONSTRAINT "catalog_product_entry_submissions_fingerprint" CHECK ("catalog_product_entry_submissions"."request_fingerprint" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "catalog_product_entry_submissions_mode" CHECK ("catalog_product_entry_submissions"."mode" IN ('Create','Edit')),
	CONSTRAINT "catalog_product_entry_submissions_status" CHECK ("catalog_product_entry_submissions"."status" IN ('Claimed','ProductSaved','Completed','PartiallyCompleted')),
	CONSTRAINT "catalog_product_entry_submissions_revision_safe" CHECK ("catalog_product_entry_submissions"."product_revision" IS NULL OR "catalog_product_entry_submissions"."product_revision" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_product_entry_submissions_timestamps_ordered" CHECK ("catalog_product_entry_submissions"."created_at" <= "catalog_product_entry_submissions"."updated_at"),
	CONSTRAINT "catalog_product_entry_submissions_mode_identity" CHECK ("catalog_product_entry_submissions"."mode" = 'Edit' OR "catalog_product_entry_submissions"."status" <> 'Claimed' OR "catalog_product_entry_submissions"."product_id" IS NULL),
	CONSTRAINT "catalog_product_entry_submissions_saved_state" CHECK (
      ("catalog_product_entry_submissions"."status" = 'Claimed' AND "catalog_product_entry_submissions"."product_revision" IS NULL AND "catalog_product_entry_submissions"."media_workflow_id" IS NULL AND "catalog_product_entry_submissions"."product_save_receipt" IS NULL) OR
      ("catalog_product_entry_submissions"."status" IN ('ProductSaved','Completed','PartiallyCompleted') AND "catalog_product_entry_submissions"."product_id" IS NOT NULL AND "catalog_product_entry_submissions"."product_revision" IS NOT NULL AND "catalog_product_entry_submissions"."product_save_receipt" IS NOT NULL)
    )
);
--> statement-breakpoint
ALTER TABLE "catalog_product_entry_audit_records" ADD CONSTRAINT "catalog_product_entry_audit_records_submission_fk" FOREIGN KEY ("workspace_id","submission_id") REFERENCES "public"."catalog_product_entry_submissions"("workspace_id","submission_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_entry_audit_records" ADD CONSTRAINT "catalog_product_entry_audit_records_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submission_media_operations" ADD CONSTRAINT "catalog_product_entry_submission_media_operations_submission_fk" FOREIGN KEY ("workspace_id","submission_id") REFERENCES "public"."catalog_product_entry_submissions"("workspace_id","submission_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submissions" ADD CONSTRAINT "catalog_product_entry_submissions_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_entry_submissions" ADD CONSTRAINT "catalog_product_entry_submissions_media_workflow_fk" FOREIGN KEY ("workspace_id","media_workflow_id") REFERENCES "public"."catalog_product_media_workflows"("workspace_id","workflow_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_product_entry_audit_records_submission_idx" ON "catalog_product_entry_audit_records" USING btree ("workspace_id","submission_id","occurred_at");--> statement-breakpoint
CREATE INDEX "catalog_product_entry_audit_records_product_idx" ON "catalog_product_entry_audit_records" USING btree ("workspace_id","product_id","occurred_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_entry_submission_media_operations_sequence_uq" ON "catalog_product_entry_submission_media_operations" USING btree ("workspace_id","submission_id","sequence");--> statement-breakpoint
CREATE INDEX "catalog_product_entry_submissions_product_idx" ON "catalog_product_entry_submissions" USING btree ("workspace_id","product_id");--> statement-breakpoint
CREATE INDEX "catalog_product_entry_submissions_status_idx" ON "catalog_product_entry_submissions" USING btree ("workspace_id","status","updated_at");