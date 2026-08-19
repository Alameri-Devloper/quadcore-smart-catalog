CREATE TABLE "catalog_product_media_source_attempts" (
	"workspace_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"source_attempt_id" text NOT NULL,
	"source_fingerprint" text NOT NULL,
	"status" text NOT NULL,
	"created_by_actor_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_sha256" text,
	"verified_size_bytes" bigint,
	"verified_mime_type" text,
	"verified_width" integer,
	"verified_height" integer,
	"staging_artifact_key" text,
	"applied_at" timestamp with time zone,
	"failed_at" timestamp with time zone,
	"failure_code" text,
	CONSTRAINT "catalog_product_media_source_attempts_pk" PRIMARY KEY("workspace_id","source_attempt_id"),
	CONSTRAINT "catalog_product_media_source_attempts_id" CHECK ("source_attempt_id" ~ '^[a-f0-9]{32}$'),
	CONSTRAINT "catalog_product_media_source_attempts_fingerprint" CHECK ("source_fingerprint" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "catalog_product_media_source_attempts_status" CHECK ("status" IN ('AwaitingUpload','Uploaded','Applied','Failed','Expired')),
	CONSTRAINT "catalog_product_media_source_attempts_lifetime" CHECK ("expires_at" = "created_at" + interval '14 days'),
	CONSTRAINT "catalog_product_media_source_attempts_verified" CHECK (("verified_sha256" IS NULL AND "verified_size_bytes" IS NULL AND "verified_mime_type" IS NULL AND "verified_width" IS NULL AND "verified_height" IS NULL AND "staging_artifact_key" IS NULL) OR ("verified_sha256" ~ '^[a-f0-9]{64}$' AND "verified_size_bytes" > 0 AND "verified_mime_type" IN ('image/jpeg','image/png','image/webp') AND "verified_width" > 0 AND "verified_height" > 0 AND btrim("staging_artifact_key") <> ''))
);
--> statement-breakpoint
CREATE TABLE "catalog_product_media_source_attempt_audits" (
	"workspace_id" text NOT NULL,
	"audit_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"source_attempt_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" text NOT NULL,
	"result_code" text NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_product_media_source_attempt_audits_pk" PRIMARY KEY("workspace_id","audit_id"),
	CONSTRAINT "catalog_product_media_source_attempt_audits_event" CHECK ("event_type" IN ('SourceAttemptCreated','SourceAttemptFailed','SourceAttemptApplied','SourceAttemptExpired')),
	CONSTRAINT "catalog_product_media_source_attempt_audits_non_empty" CHECK (btrim("actor_id") <> '' AND btrim("result_code") <> '')
);
--> statement-breakpoint
ALTER TABLE "catalog_product_media_source_attempts" ADD CONSTRAINT "catalog_product_media_source_attempts_operation_fk" FOREIGN KEY ("workspace_id","operation_id") REFERENCES "public"."catalog_product_media_operations"("workspace_id","operation_id") ON DELETE cascade ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "catalog_product_media_source_attempt_audits" ADD CONSTRAINT "catalog_product_media_source_attempt_audits_attempt_fk" FOREIGN KEY ("workspace_id","source_attempt_id") REFERENCES "public"."catalog_product_media_source_attempts"("workspace_id","source_attempt_id") ON DELETE restrict ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_product_media_source_attempts_active_uq" ON "catalog_product_media_source_attempts" USING btree ("workspace_id","operation_id") WHERE "status" IN ('AwaitingUpload','Uploaded');
--> statement-breakpoint
CREATE INDEX "catalog_product_media_source_attempts_expiry_idx" ON "catalog_product_media_source_attempts" USING btree ("workspace_id","expires_at");
--> statement-breakpoint
CREATE INDEX "catalog_product_media_source_attempt_audits_operation_idx" ON "catalog_product_media_source_attempt_audits" USING btree ("workspace_id","operation_id","occurred_at");
