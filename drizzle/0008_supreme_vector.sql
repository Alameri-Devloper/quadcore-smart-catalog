CREATE TABLE "identity_sessions" (
	"workspace_id" text NOT NULL,
	"session_id" text NOT NULL,
	"token_hash" text NOT NULL,
	"token_key_version" integer NOT NULL,
	"actor_id" text NOT NULL,
	"session_class" text NOT NULL,
	"authorization_version" bigint NOT NULL,
	"password_version" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"last_seen_at" timestamp with time zone NOT NULL,
	"idle_expires_at" timestamp with time zone NOT NULL,
	"absolute_expires_at" timestamp with time zone NOT NULL,
	"revoked_at" timestamp with time zone,
	"revocation_reason" text,
	CONSTRAINT "identity_sessions_pk" PRIMARY KEY("workspace_id","session_id"),
	CONSTRAINT "identity_sessions_digest" CHECK (length("identity_sessions"."token_hash") = 64 AND "identity_sessions"."token_hash" ~ '^[a-f0-9]{64}$' AND "identity_sessions"."token_key_version" >= 1),
	CONSTRAINT "identity_sessions_class" CHECK ("identity_sessions"."session_class" IN ('Restricted','Full')),
	CONSTRAINT "identity_sessions_versions" CHECK ("identity_sessions"."authorization_version" BETWEEN 1 AND 9007199254740991 AND "identity_sessions"."password_version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "identity_sessions_expiry" CHECK ("identity_sessions"."created_at" <= "identity_sessions"."last_seen_at" AND "identity_sessions"."last_seen_at" < "identity_sessions"."idle_expires_at" AND "identity_sessions"."idle_expires_at" <= "identity_sessions"."absolute_expires_at"),
	CONSTRAINT "identity_sessions_revocation_pair" CHECK (("identity_sessions"."revoked_at" IS NULL AND "identity_sessions"."revocation_reason" IS NULL) OR ("identity_sessions"."revoked_at" IS NOT NULL AND "identity_sessions"."revocation_reason" IS NOT NULL)),
	CONSTRAINT "identity_sessions_revocation_reason" CHECK ("identity_sessions"."revocation_reason" IS NULL OR "identity_sessions"."revocation_reason" IN ('Logout','PasswordChanged','OwnerPasswordReset','RecoveryCompleted','AccountSuspended','AuthorizationChanged','ReplacedByNewSession','Expired','AdministrativeRevocation'))
);
--> statement-breakpoint
ALTER TABLE "identity_memberships" ADD COLUMN "authorization_version" bigint DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_sessions" ADD CONSTRAINT "identity_sessions_account_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_accounts"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_sessions" ADD CONSTRAINT "identity_sessions_credential_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_password_credentials"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_sessions" ADD CONSTRAINT "identity_sessions_membership_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_memberships"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "identity_sessions_token_hash_uq" ON "identity_sessions" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "identity_sessions_token_lookup_idx" ON "identity_sessions" USING btree ("token_key_version","token_hash");--> statement-breakpoint
CREATE INDEX "identity_sessions_actor_revocation_idx" ON "identity_sessions" USING btree ("workspace_id","actor_id","revoked_at");--> statement-breakpoint
CREATE INDEX "identity_sessions_idle_cleanup_idx" ON "identity_sessions" USING btree ("idle_expires_at");--> statement-breakpoint
CREATE INDEX "identity_sessions_absolute_cleanup_idx" ON "identity_sessions" USING btree ("absolute_expires_at");--> statement-breakpoint
CREATE INDEX "identity_sessions_revoked_cleanup_idx" ON "identity_sessions" USING btree ("revoked_at");--> statement-breakpoint
ALTER TABLE "identity_memberships" ADD CONSTRAINT "identity_memberships_authorization_version" CHECK ("identity_memberships"."authorization_version" BETWEEN 1 AND 9007199254740991);
--> statement-breakpoint
ALTER TABLE "identity_memberships" ALTER COLUMN "authorization_version" DROP DEFAULT;
