CREATE TABLE "workspace_communication_settings" (
	"workspace_id" text NOT NULL,
	"default_whatsapp_phone" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_communication_settings_pk" PRIMARY KEY("workspace_id"),
	CONSTRAINT "workspace_communication_settings_phone" CHECK ("workspace_communication_settings"."default_whatsapp_phone" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "workspace_communication_settings_timestamps" CHECK ("workspace_communication_settings"."created_at" <= "workspace_communication_settings"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"workspace_id" text NOT NULL,
	"company_id" text NOT NULL,
	"workspace_code" text NOT NULL,
	"display_name" text NOT NULL,
	"password_recovery_policy" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspaces_pk" PRIMARY KEY("workspace_id"),
	CONSTRAINT "workspaces_code_canonical" CHECK ("workspaces"."workspace_code" ~ '^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$' AND "workspaces"."workspace_code" NOT LIKE '%--%'),
	CONSTRAINT "workspaces_non_empty" CHECK (btrim("workspaces"."company_id") <> '' AND btrim("workspaces"."display_name") <> ''),
	CONSTRAINT "workspaces_recovery_policy" CHECK ("workspaces"."password_recovery_policy" IN ('OwnerManagedOnly','WhatsAppOtpWithOwnerFallback')),
	CONSTRAINT "workspaces_timestamps_ordered" CHECK ("workspaces"."created_at" <= "workspaces"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "identity_accounts" (
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"username" text NOT NULL,
	"normalized_username" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "identity_accounts_pk" PRIMARY KEY("workspace_id","actor_id"),
	CONSTRAINT "identity_accounts_username" CHECK ("identity_accounts"."username" ~ '^[A-Za-z0-9._-]{3,64}$'),
	CONSTRAINT "identity_accounts_normalized_username" CHECK ("identity_accounts"."normalized_username" ~ '^[a-z0-9._-]{3,64}$' AND "identity_accounts"."normalized_username" = lower("identity_accounts"."username")),
	CONSTRAINT "identity_accounts_status" CHECK ("identity_accounts"."status" IN ('PendingActivation','Active','Suspended')),
	CONSTRAINT "identity_accounts_timestamps" CHECK ("identity_accounts"."created_at" <= "identity_accounts"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "identity_login_protection" (
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"failed_attempt_count" integer NOT NULL,
	"failure_window_started_at" timestamp with time zone,
	"locked_until" timestamp with time zone,
	"lock_level" integer NOT NULL,
	"last_failed_at" timestamp with time zone,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "identity_login_protection_pk" PRIMARY KEY("workspace_id","actor_id"),
	CONSTRAINT "identity_login_protection_attempts" CHECK ("identity_login_protection"."failed_attempt_count" BETWEEN 0 AND 4),
	CONSTRAINT "identity_login_protection_level" CHECK ("identity_login_protection"."lock_level" >= 0),
	CONSTRAINT "identity_login_protection_window_pair" CHECK (("identity_login_protection"."failed_attempt_count" = 0 AND "identity_login_protection"."failure_window_started_at" IS NULL) OR ("identity_login_protection"."failed_attempt_count" > 0 AND "identity_login_protection"."failure_window_started_at" IS NOT NULL))
);
--> statement-breakpoint
CREATE TABLE "identity_member_profiles" (
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"display_name" text NOT NULL,
	"recovery_phone" text NOT NULL,
	"recovery_contact_version" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "identity_member_profiles_pk" PRIMARY KEY("workspace_id","actor_id"),
	CONSTRAINT "identity_member_profiles_display_name" CHECK (btrim("identity_member_profiles"."display_name") <> ''),
	CONSTRAINT "identity_member_profiles_phone" CHECK ("identity_member_profiles"."recovery_phone" ~ '^\+[1-9][0-9]{7,14}$'),
	CONSTRAINT "identity_member_profiles_version" CHECK ("identity_member_profiles"."recovery_contact_version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "identity_member_profiles_timestamps" CHECK ("identity_member_profiles"."created_at" <= "identity_member_profiles"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "identity_memberships" (
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"role" text NOT NULL,
	"branch_scope" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "identity_memberships_pk" PRIMARY KEY("workspace_id","actor_id"),
	CONSTRAINT "identity_memberships_role" CHECK ("identity_memberships"."role" IN ('Owner','Staff')),
	CONSTRAINT "identity_memberships_branch_scope" CHECK ("identity_memberships"."branch_scope" IN ('AllBranches','SelectedBranches')),
	CONSTRAINT "identity_memberships_owner_scope" CHECK ("identity_memberships"."role" <> 'Owner' OR "identity_memberships"."branch_scope" = 'AllBranches'),
	CONSTRAINT "identity_memberships_timestamps" CHECK ("identity_memberships"."created_at" <= "identity_memberships"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "identity_password_credentials" (
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"password_hash" text NOT NULL,
	"password_lifecycle" text NOT NULL,
	"password_version" bigint NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "identity_password_credentials_pk" PRIMARY KEY("workspace_id","actor_id"),
	CONSTRAINT "identity_password_credentials_hash" CHECK (length("identity_password_credentials"."password_hash") BETWEEN 1 AND 1024),
	CONSTRAINT "identity_password_credentials_lifecycle" CHECK ("identity_password_credentials"."password_lifecycle" IN ('Temporary','Permanent')),
	CONSTRAINT "identity_password_credentials_version" CHECK ("identity_password_credentials"."password_version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "identity_password_credentials_timestamps" CHECK ("identity_password_credentials"."created_at" <= "identity_password_credentials"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "identity_password_recovery_challenges" (
	"workspace_id" text NOT NULL,
	"challenge_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"channel" text NOT NULL,
	"destination_version" bigint NOT NULL,
	"digest" text NOT NULL,
	"digest_key_version" integer NOT NULL,
	"status" text NOT NULL,
	"attempt_count" integer NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"verified_at" timestamp with time zone,
	"consumed_at" timestamp with time zone,
	"invalidated_at" timestamp with time zone,
	CONSTRAINT "identity_password_recovery_challenges_pk" PRIMARY KEY("workspace_id","challenge_id"),
	CONSTRAINT "identity_password_recovery_challenges_channel" CHECK ("identity_password_recovery_challenges"."channel" = 'PrimaryRecoveryContact'),
	CONSTRAINT "identity_password_recovery_challenges_destination_version" CHECK ("identity_password_recovery_challenges"."destination_version" BETWEEN 1 AND 9007199254740991),
	CONSTRAINT "identity_password_recovery_challenges_digest" CHECK (length("identity_password_recovery_challenges"."digest") = 64 AND "identity_password_recovery_challenges"."digest" ~ '^[a-f0-9]{64}$' AND "identity_password_recovery_challenges"."digest_key_version" >= 1),
	CONSTRAINT "identity_password_recovery_challenges_status" CHECK ("identity_password_recovery_challenges"."status" IN ('Active','Verified','Consumed','Invalidated','Expired')),
	CONSTRAINT "identity_password_recovery_challenges_attempts" CHECK ("identity_password_recovery_challenges"."attempt_count" BETWEEN 0 AND 5),
	CONSTRAINT "identity_password_recovery_challenges_expiry" CHECK ("identity_password_recovery_challenges"."expires_at" > "identity_password_recovery_challenges"."created_at"),
	CONSTRAINT "identity_password_recovery_challenges_status_timestamps" CHECK (
      ("identity_password_recovery_challenges"."status" = 'Active' AND "identity_password_recovery_challenges"."verified_at" IS NULL AND "identity_password_recovery_challenges"."consumed_at" IS NULL AND "identity_password_recovery_challenges"."invalidated_at" IS NULL) OR
      ("identity_password_recovery_challenges"."status" = 'Verified' AND "identity_password_recovery_challenges"."verified_at" IS NOT NULL AND "identity_password_recovery_challenges"."consumed_at" IS NULL AND "identity_password_recovery_challenges"."invalidated_at" IS NULL) OR
      ("identity_password_recovery_challenges"."status" = 'Consumed' AND "identity_password_recovery_challenges"."verified_at" IS NOT NULL AND "identity_password_recovery_challenges"."consumed_at" IS NOT NULL AND "identity_password_recovery_challenges"."invalidated_at" IS NULL) OR
      ("identity_password_recovery_challenges"."status" = 'Invalidated' AND "identity_password_recovery_challenges"."consumed_at" IS NULL AND "identity_password_recovery_challenges"."invalidated_at" IS NOT NULL) OR
      ("identity_password_recovery_challenges"."status" = 'Expired' AND "identity_password_recovery_challenges"."consumed_at" IS NULL)
    )
);
--> statement-breakpoint
CREATE TABLE "security_audit_events" (
	"workspace_id" text NOT NULL,
	"audit_id" text NOT NULL,
	"event_type" text NOT NULL,
	"actor_id" text,
	"subject_actor_id" text,
	"result_code" text NOT NULL,
	"metadata" jsonb NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	CONSTRAINT "security_audit_events_pk" PRIMARY KEY("workspace_id","audit_id"),
	CONSTRAINT "security_audit_events_non_empty" CHECK (btrim("security_audit_events"."audit_id") <> '' AND btrim("security_audit_events"."event_type") <> '' AND btrim("security_audit_events"."result_code") <> '')
);
--> statement-breakpoint
ALTER TABLE "workspace_communication_settings" ADD CONSTRAINT "workspace_communication_settings_workspace_id_workspaces_workspace_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_accounts" ADD CONSTRAINT "identity_accounts_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_login_protection" ADD CONSTRAINT "identity_login_protection_account_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_accounts"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_member_profiles" ADD CONSTRAINT "identity_member_profiles_account_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_accounts"("workspace_id","actor_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_memberships" ADD CONSTRAINT "identity_memberships_profile_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_member_profiles"("workspace_id","actor_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_password_credentials" ADD CONSTRAINT "identity_password_credentials_account_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_accounts"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_password_recovery_challenges" ADD CONSTRAINT "identity_password_recovery_challenges_account_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_accounts"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "security_audit_events" ADD CONSTRAINT "security_audit_events_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "workspaces_code_uq" ON "workspaces" USING btree ("workspace_code");--> statement-breakpoint
CREATE INDEX "workspaces_company_idx" ON "workspaces" USING btree ("company_id");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_accounts_workspace_username_uq" ON "identity_accounts" USING btree ("workspace_id","normalized_username");--> statement-breakpoint
CREATE INDEX "identity_accounts_login_lookup_idx" ON "identity_accounts" USING btree ("workspace_id","normalized_username","status");--> statement-breakpoint
CREATE INDEX "identity_login_protection_locked_idx" ON "identity_login_protection" USING btree ("workspace_id","locked_until");--> statement-breakpoint
CREATE INDEX "identity_memberships_role_idx" ON "identity_memberships" USING btree ("workspace_id","role");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_password_recovery_challenges_one_open_uq" ON "identity_password_recovery_challenges" USING btree ("workspace_id","actor_id") WHERE "identity_password_recovery_challenges"."status" IN ('Active','Verified');--> statement-breakpoint
CREATE INDEX "identity_password_recovery_challenges_actor_idx" ON "identity_password_recovery_challenges" USING btree ("workspace_id","actor_id","created_at");--> statement-breakpoint
CREATE INDEX "identity_password_recovery_challenges_expiry_idx" ON "identity_password_recovery_challenges" USING btree ("workspace_id","status","expires_at");--> statement-breakpoint
CREATE INDEX "security_audit_events_actor_idx" ON "security_audit_events" USING btree ("workspace_id","actor_id","occurred_at");--> statement-breakpoint
CREATE INDEX "security_audit_events_subject_idx" ON "security_audit_events" USING btree ("workspace_id","subject_actor_id","occurred_at");
