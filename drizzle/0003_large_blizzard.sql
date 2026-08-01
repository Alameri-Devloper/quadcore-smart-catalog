CREATE TABLE "catalog_product_media_operations" (
	"workspace_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"type" text NOT NULL,
	"status" text NOT NULL,
	"target_media_id" text,
	"requested_display_order" integer,
	"select_as_cover" boolean DEFAULT false NOT NULL,
	"ordered_media_ids" jsonb,
	"staged_artifact_key" text,
	"final_artifact_key" text,
	"staged_sha256" text,
	"staged_byte_length" bigint,
	"staged_width" integer,
	"staged_height" integer,
	"expires_at" timestamp with time zone,
	"attempt_count" bigint NOT NULL,
	"last_attempt_at" timestamp with time zone,
	"retry_allowed" boolean NOT NULL,
	"requires_new_source" boolean NOT NULL,
	"error_code" text,
	"created_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	CONSTRAINT "catalog_product_media_operations_pk" PRIMARY KEY("workspace_id","operation_id"),
	CONSTRAINT "catalog_product_media_operations_type" CHECK ("catalog_product_media_operations"."type" IN ('Add','Replace','Remove','SetCover','Reorder')),
	CONSTRAINT "catalog_product_media_operations_status" CHECK ("catalog_product_media_operations"."status" IN ('Pending','Staged','InProgress','Completed','Failed','SourceUnavailable','ReconciliationRequired','Cancelled')),
	CONSTRAINT "catalog_product_media_operations_attempt_safe" CHECK ("catalog_product_media_operations"."attempt_count" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_product_media_operations_staging_relative" CHECK ("catalog_product_media_operations"."staged_artifact_key" IS NULL OR ("catalog_product_media_operations"."staged_artifact_key" !~ '^[a-zA-Z]:' AND "catalog_product_media_operations"."staged_artifact_key" NOT LIKE '/%' AND position(chr(92) in "catalog_product_media_operations"."staged_artifact_key") = 0)),
	CONSTRAINT "catalog_product_media_operations_staged_integrity" CHECK (("catalog_product_media_operations"."staged_artifact_key" IS NULL AND "catalog_product_media_operations"."staged_sha256" IS NULL AND "catalog_product_media_operations"."staged_byte_length" IS NULL AND "catalog_product_media_operations"."staged_width" IS NULL AND "catalog_product_media_operations"."staged_height" IS NULL) OR ("catalog_product_media_operations"."staged_artifact_key" IS NOT NULL AND "catalog_product_media_operations"."staged_sha256" ~ '^[a-f0-9]{64}$' AND "catalog_product_media_operations"."staged_byte_length" > 0 AND "catalog_product_media_operations"."staged_width" > 0 AND "catalog_product_media_operations"."staged_height" > 0))
);
--> statement-breakpoint
CREATE TABLE "catalog_product_media_states" (
	"workspace_id" text NOT NULL,
	"product_id" text NOT NULL,
	"revision" bigint NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	"updated_by" text NOT NULL,
	CONSTRAINT "catalog_product_media_states_pk" PRIMARY KEY("workspace_id","product_id"),
	CONSTRAINT "catalog_product_media_states_revision_safe" CHECK ("catalog_product_media_states"."revision" BETWEEN 0 AND 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "catalog_product_media_workflows" (
	"workspace_id" text NOT NULL,
	"workflow_id" text NOT NULL,
	"product_id" text NOT NULL,
	"status" text NOT NULL,
	"expected_media_revision" bigint NOT NULL,
	"idempotency_key" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"created_by" text NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"completed_at" timestamp with time zone,
	"version" bigint NOT NULL,
	CONSTRAINT "catalog_product_media_workflows_pk" PRIMARY KEY("workspace_id","workflow_id"),
	CONSTRAINT "catalog_product_media_workflows_status" CHECK ("catalog_product_media_workflows"."status" IN ('Pending','InProgress','Completed','PartiallyCompleted','Failed','ReconciliationRequired','Cancelled')),
	CONSTRAINT "catalog_product_media_workflows_revisions_safe" CHECK ("catalog_product_media_workflows"."expected_media_revision" BETWEEN 0 AND 9007199254740991 AND "catalog_product_media_workflows"."version" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_product_media_workflows_fingerprint" CHECK ("catalog_product_media_workflows"."request_fingerprint" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
ALTER TABLE "catalog_product_images" ADD COLUMN "checksum_sha256" text;--> statement-breakpoint
ALTER TABLE "catalog_product_images" ADD COLUMN "mime_type" text;--> statement-breakpoint
ALTER TABLE "catalog_product_images" ADD COLUMN "media_created_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "catalog_product_images" ADD COLUMN "media_created_by" text;--> statement-breakpoint
ALTER TABLE "catalog_product_media_operations" ADD CONSTRAINT "catalog_product_media_operations_workflow_fk" FOREIGN KEY ("workspace_id","workflow_id") REFERENCES "public"."catalog_product_media_workflows"("workspace_id","workflow_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_media_states" ADD CONSTRAINT "catalog_product_media_states_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_product_media_workflows" ADD CONSTRAINT "catalog_product_media_workflows_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_product_media_operations_workflow_idx" ON "catalog_product_media_operations" USING btree ("workspace_id","workflow_id","created_at");--> statement-breakpoint
CREATE INDEX "catalog_product_media_operations_expiry_idx" ON "catalog_product_media_operations" USING btree ("workspace_id","expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_media_workflows_idempotency_uq" ON "catalog_product_media_workflows" USING btree ("workspace_id","idempotency_key");--> statement-breakpoint
CREATE INDEX "catalog_product_media_workflows_product_idx" ON "catalog_product_media_workflows" USING btree ("workspace_id","product_id","started_at");--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_images_storage_key_uq" ON "catalog_product_images" USING btree ("storage_key");--> statement-breakpoint
ALTER TABLE "catalog_product_images" ADD CONSTRAINT "catalog_product_images_workflow_integrity" CHECK (("catalog_product_images"."checksum_sha256" IS NULL AND "catalog_product_images"."mime_type" IS NULL AND "catalog_product_images"."media_created_at" IS NULL AND "catalog_product_images"."media_created_by" IS NULL) OR ("catalog_product_images"."checksum_sha256" ~ '^[a-f0-9]{64}$' AND "catalog_product_images"."mime_type" = 'image/webp' AND "catalog_product_images"."media_created_at" IS NOT NULL AND btrim("catalog_product_images"."media_created_by") <> ''));