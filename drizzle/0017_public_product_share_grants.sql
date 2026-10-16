CREATE TABLE "catalog_public_product_share_grants" (
	"workspace_id" text NOT NULL,
	"grant_id" text NOT NULL,
	"product_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"lookup_key_version" bigint NOT NULL,
	"lookup_digest" text NOT NULL,
	"envelope_format_version" integer,
	"encryption_key_version" bigint,
	"bearer_iv" text,
	"bearer_ciphertext" text,
	"bearer_auth_tag" text,
	"issued_by_actor_id" text NOT NULL,
	"issued_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revoked_by_actor_id" text,
	"revision" bigint DEFAULT 1 NOT NULL,
	CONSTRAINT "catalog_public_product_share_grants_pk" PRIMARY KEY("workspace_id","grant_id"),
	CONSTRAINT "catalog_public_product_share_grants_identities_nonblank" CHECK (btrim("catalog_public_product_share_grants"."workspace_id") <> '' AND btrim("catalog_public_product_share_grants"."product_id") <> '' AND btrim("catalog_public_product_share_grants"."branch_id") <> '' AND btrim("catalog_public_product_share_grants"."issued_by_actor_id") <> '' AND ("catalog_public_product_share_grants"."revoked_by_actor_id" IS NULL OR btrim("catalog_public_product_share_grants"."revoked_by_actor_id") <> '')),
	CONSTRAINT "catalog_public_product_share_grants_grant_id_uuid" CHECK ("catalog_public_product_share_grants"."grant_id" ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$'),
	CONSTRAINT "catalog_public_product_share_grants_lookup_key_version_safe" CHECK ("catalog_public_product_share_grants"."lookup_key_version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_public_product_share_grants_lookup_digest_shape" CHECK ("catalog_public_product_share_grants"."lookup_digest" ~ '^[a-f0-9]{64}$'),
	CONSTRAINT "catalog_public_product_share_grants_envelope_format_v1" CHECK ("catalog_public_product_share_grants"."envelope_format_version" IS NULL OR "catalog_public_product_share_grants"."envelope_format_version" = 1),
	CONSTRAINT "catalog_public_product_share_grants_encryption_key_version_safe" CHECK ("catalog_public_product_share_grants"."encryption_key_version" IS NULL OR "catalog_public_product_share_grants"."encryption_key_version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_public_product_share_grants_envelope_encoding_shape" CHECK (("catalog_public_product_share_grants"."bearer_iv" IS NULL OR "catalog_public_product_share_grants"."bearer_iv" ~ '^[A-Za-z0-9_-]{16}$') AND ("catalog_public_product_share_grants"."bearer_ciphertext" IS NULL OR "catalog_public_product_share_grants"."bearer_ciphertext" ~ '^[A-Za-z0-9_-]{58}$') AND ("catalog_public_product_share_grants"."bearer_auth_tag" IS NULL OR "catalog_public_product_share_grants"."bearer_auth_tag" ~ '^[A-Za-z0-9_-]{22}$')),
	CONSTRAINT "catalog_public_product_share_grants_revision_safe" CHECK ("catalog_public_product_share_grants"."revision" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "catalog_public_product_share_grants_revocation_timestamps" CHECK ("catalog_public_product_share_grants"."revoked_at" IS NULL OR "catalog_public_product_share_grants"."revoked_at" >= "catalog_public_product_share_grants"."issued_at"),
	CONSTRAINT "catalog_public_product_share_grants_timestamp_precision" CHECK (isfinite("catalog_public_product_share_grants"."issued_at") AND "catalog_public_product_share_grants"."issued_at" = date_trunc('milliseconds', "catalog_public_product_share_grants"."issued_at") AND ("catalog_public_product_share_grants"."revoked_at" IS NULL OR (isfinite("catalog_public_product_share_grants"."revoked_at") AND "catalog_public_product_share_grants"."revoked_at" = date_trunc('milliseconds', "catalog_public_product_share_grants"."revoked_at")))),
	CONSTRAINT "catalog_public_product_share_grants_envelope_lifecycle" CHECK ((
    "catalog_public_product_share_grants"."revoked_at" IS NULL AND "catalog_public_product_share_grants"."revoked_by_actor_id" IS NULL
    AND "catalog_public_product_share_grants"."envelope_format_version" IS NOT NULL AND "catalog_public_product_share_grants"."encryption_key_version" IS NOT NULL
    AND "catalog_public_product_share_grants"."bearer_iv" IS NOT NULL AND "catalog_public_product_share_grants"."bearer_ciphertext" IS NOT NULL AND "catalog_public_product_share_grants"."bearer_auth_tag" IS NOT NULL
  ) OR (
    "catalog_public_product_share_grants"."revoked_at" IS NOT NULL AND "catalog_public_product_share_grants"."revoked_by_actor_id" IS NOT NULL
    AND "catalog_public_product_share_grants"."envelope_format_version" IS NULL AND "catalog_public_product_share_grants"."encryption_key_version" IS NULL
    AND "catalog_public_product_share_grants"."bearer_iv" IS NULL AND "catalog_public_product_share_grants"."bearer_ciphertext" IS NULL AND "catalog_public_product_share_grants"."bearer_auth_tag" IS NULL
  ))
);
--> statement-breakpoint
ALTER TABLE "catalog_public_product_share_grants" ADD CONSTRAINT "catalog_public_product_share_grants_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_public_product_share_grants" ADD CONSTRAINT "catalog_public_product_share_grants_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "catalog_public_product_share_grants" ADD CONSTRAINT "catalog_public_product_share_grants_branch_fk" FOREIGN KEY ("workspace_id","branch_id") REFERENCES "public"."workspace_branch_references"("workspace_id","branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_public_product_share_grants_active_uq" ON "catalog_public_product_share_grants" USING btree ("workspace_id","product_id","branch_id") WHERE "catalog_public_product_share_grants"."revoked_at" IS NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "catalog_public_product_share_grants_digest_uq" ON "catalog_public_product_share_grants" USING btree ("lookup_digest");--> statement-breakpoint
CREATE INDEX "catalog_public_product_share_grants_lookup_idx" ON "catalog_public_product_share_grants" USING btree ("lookup_key_version","lookup_digest");--> statement-breakpoint
CREATE INDEX "catalog_public_product_share_grants_history_idx" ON "catalog_public_product_share_grants" USING btree ("workspace_id","product_id","branch_id","issued_at");
