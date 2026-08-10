DO $$
BEGIN
	IF EXISTS (SELECT 1 FROM "identity_memberships" WHERE "branch_scope" = 'SelectedBranches') THEN
		RAISE EXCEPTION 'Task C migration requires explicit branch assignments for existing SelectedBranches memberships.';
	END IF;
END $$;
--> statement-breakpoint
CREATE TABLE "workspace_branch_references" (
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"status" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "workspace_branch_references_pk" PRIMARY KEY("workspace_id","branch_id"),
	CONSTRAINT "workspace_branch_references_branch_id" CHECK (btrim("workspace_branch_references"."branch_id") <> ''),
	CONSTRAINT "workspace_branch_references_status" CHECK ("workspace_branch_references"."status" IN ('Active','Inactive')),
	CONSTRAINT "workspace_branch_references_timestamps" CHECK ("workspace_branch_references"."created_at" <= "workspace_branch_references"."updated_at")
);
--> statement-breakpoint
CREATE TABLE "identity_membership_branches" (
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"branch_id" text NOT NULL,
	CONSTRAINT "identity_membership_branches_pk" PRIMARY KEY("workspace_id","actor_id","branch_id")
);
--> statement-breakpoint
CREATE TABLE "identity_membership_permissions" (
	"workspace_id" text NOT NULL,
	"actor_id" text NOT NULL,
	"permission_code" text NOT NULL,
	CONSTRAINT "identity_membership_permissions_pk" PRIMARY KEY("workspace_id","actor_id","permission_code"),
	CONSTRAINT "identity_membership_permissions_known_code" CHECK ("identity_membership_permissions"."permission_code" IN (
      'catalog.product.create','catalog.product.edit','catalog.product-entry-submission.read',
      'catalog.product-entry-media.upload','catalog.product.reference-cost.read','catalog.products.view',
      'catalog.products.create','catalog.products.edit','catalog.products.archive','catalog.productEntry.submit',
      'catalog.productMedia.upload','catalog.productMedia.retry','catalog.productMedia.reconciliation.manage',
      'catalog.productMedia.source.replace','catalog.sharing.create','catalog.sharing.aiRecommendation.generate',
      'pricing.view','pricing.manage','pricing.wholesale.view','pricing.branchOverride.manage',
      'referenceCost.view','referenceCost.manage','referenceCost.branchOverride.manage',
      'inventory.availability.view','inventory.quantity.view','inventory.receive','inventory.issue',
      'inventory.reserve','inventory.transfer','inventory.damage','inventory.adjust',
      'workspace.settings.view','workspace.settings.manage','workspace.audit.view'
    ))
);
--> statement-breakpoint
ALTER TABLE "identity_member_profiles" ADD COLUMN "locale" text DEFAULT 'ar' NOT NULL;--> statement-breakpoint
ALTER TABLE "identity_member_profiles" ALTER COLUMN "locale" DROP DEFAULT;--> statement-breakpoint
ALTER TABLE "workspace_branch_references" ADD CONSTRAINT "workspace_branch_references_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_membership_branches" ADD CONSTRAINT "identity_membership_branches_membership_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_memberships"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_membership_branches" ADD CONSTRAINT "identity_membership_branches_reference_fk" FOREIGN KEY ("workspace_id","branch_id") REFERENCES "public"."workspace_branch_references"("workspace_id","branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "identity_membership_permissions" ADD CONSTRAINT "identity_membership_permissions_membership_fk" FOREIGN KEY ("workspace_id","actor_id") REFERENCES "public"."identity_memberships"("workspace_id","actor_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_branch_references_lookup_idx" ON "workspace_branch_references" USING btree ("branch_id","workspace_id","status");--> statement-breakpoint
CREATE UNIQUE INDEX "identity_member_profiles_workspace_phone_uq" ON "identity_member_profiles" USING btree ("workspace_id","recovery_phone");--> statement-breakpoint
ALTER TABLE "identity_member_profiles" ADD CONSTRAINT "identity_member_profiles_locale" CHECK ("identity_member_profiles"."locale" IN ('ar','en'));
