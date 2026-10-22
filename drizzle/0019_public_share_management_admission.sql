CREATE TABLE "catalog_public_share_management_admission" (
	"workspace_id" text NOT NULL,
	"operation" text NOT NULL,
	"scope_kind" text NOT NULL,
	"subject_id" text NOT NULL,
	"window_started_at" timestamp with time zone NOT NULL,
	"used_count" bigint NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	CONSTRAINT "catalog_share_management_admission_pk" PRIMARY KEY("workspace_id","operation","scope_kind","subject_id"),
	CONSTRAINT "catalog_share_management_admission_operation" CHECK ("catalog_public_share_management_admission"."operation" IN ('Issue','Copy','Replace','Revoke')),
	CONSTRAINT "catalog_share_management_admission_scope" CHECK ("catalog_public_share_management_admission"."scope_kind" IN ('Workspace','User') AND ("catalog_public_share_management_admission"."scope_kind" <> 'Workspace' OR "catalog_public_share_management_admission"."subject_id" = "catalog_public_share_management_admission"."workspace_id")),
	CONSTRAINT "catalog_share_management_admission_nonblank" CHECK (btrim("catalog_public_share_management_admission"."workspace_id") <> '' AND btrim("catalog_public_share_management_admission"."subject_id") <> ''),
	CONSTRAINT "catalog_share_management_admission_count" CHECK ("catalog_public_share_management_admission"."used_count" BETWEEN 0 AND 9007199254740991),
	CONSTRAINT "catalog_share_management_admission_time" CHECK (isfinite("catalog_public_share_management_admission"."window_started_at") AND isfinite("catalog_public_share_management_admission"."expires_at") AND "catalog_public_share_management_admission"."expires_at" >= "catalog_public_share_management_admission"."window_started_at" + interval '960 seconds')
);
--> statement-breakpoint
ALTER TABLE "catalog_public_share_management_admission" ADD CONSTRAINT "catalog_share_management_admission_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "catalog_share_management_admission_expiry_idx" ON "catalog_public_share_management_admission" USING btree ("expires_at");