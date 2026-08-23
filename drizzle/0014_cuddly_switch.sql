CREATE TABLE "inventory_balances" (
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"product_id" text NOT NULL,
	"on_hand_quantity" bigint DEFAULT 0 NOT NULL,
	"reserved_quantity" bigint DEFAULT 0 NOT NULL,
	"damaged_quantity" bigint DEFAULT 0 NOT NULL,
	"revision" bigint DEFAULT 1 NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "inventory_balances_pk" PRIMARY KEY("workspace_id","branch_id","product_id"),
	CONSTRAINT "inventory_balances_non_negative" CHECK ("inventory_balances"."on_hand_quantity" >= 0 AND "inventory_balances"."reserved_quantity" >= 0 AND "inventory_balances"."damaged_quantity" >= 0 AND "inventory_balances"."on_hand_quantity" - "inventory_balances"."reserved_quantity" - "inventory_balances"."damaged_quantity" >= 0),
	CONSTRAINT "inventory_balances_revision" CHECK ("inventory_balances"."revision" BETWEEN 1 AND 9007199254740991)
);
--> statement-breakpoint
CREATE TABLE "inventory_movements" (
	"workspace_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"movement_id" text NOT NULL,
	"product_id" text NOT NULL,
	"movement_type" text NOT NULL,
	"quantity" bigint NOT NULL,
	"occurred_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"created_by_actor_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"reservation_id" text,
	"correlation_id" text,
	"reason_code" text,
	"note" text,
	CONSTRAINT "inventory_movements_pk" PRIMARY KEY("workspace_id","movement_id"),
	CONSTRAINT "inventory_movements_type" CHECK ("inventory_movements"."movement_type" IN ('Receive','Issue','Reserve','ReleaseReservation','FulfillReservation','MarkDamaged','RestoreDamaged','TransferOut','TransferIn','CorrectionIncrease','CorrectionDecrease')),
	CONSTRAINT "inventory_movements_quantity" CHECK ("inventory_movements"."quantity" > 0),
	CONSTRAINT "inventory_movements_reason" CHECK ("inventory_movements"."reason_code" IS NULL OR (btrim("inventory_movements"."reason_code") <> '' AND length("inventory_movements"."reason_code") <= 64)),
	CONSTRAINT "inventory_movements_note" CHECK ("inventory_movements"."note" IS NULL OR length("inventory_movements"."note") <= 500)
);
--> statement-breakpoint
CREATE TABLE "inventory_operations" (
	"workspace_id" text NOT NULL,
	"operation_id" text NOT NULL,
	"operation_type" text NOT NULL,
	"request_fingerprint" text NOT NULL,
	"result" jsonb,
	"created_at" timestamp with time zone NOT NULL,
	CONSTRAINT "inventory_operations_pk" PRIMARY KEY("workspace_id","operation_id"),
	CONSTRAINT "inventory_operations_non_empty" CHECK (btrim("inventory_operations"."operation_id") <> '' AND btrim("inventory_operations"."operation_type") <> ''),
	CONSTRAINT "inventory_operations_fingerprint" CHECK ("inventory_operations"."request_fingerprint" ~ '^[a-f0-9]{64}$')
);
--> statement-breakpoint
CREATE TABLE "inventory_reservations" (
	"workspace_id" text NOT NULL,
	"reservation_id" text NOT NULL,
	"branch_id" text NOT NULL,
	"product_id" text NOT NULL,
	"quantity" bigint NOT NULL,
	"remaining_quantity" bigint NOT NULL,
	"status" text NOT NULL,
	"created_by_actor_id" text NOT NULL,
	"created_at" timestamp with time zone NOT NULL,
	"updated_at" timestamp with time zone NOT NULL,
	CONSTRAINT "inventory_reservations_pk" PRIMARY KEY("workspace_id","reservation_id"),
	CONSTRAINT "inventory_reservations_quantity" CHECK ("inventory_reservations"."quantity" > 0 AND "inventory_reservations"."remaining_quantity" >= 0 AND "inventory_reservations"."remaining_quantity" <= "inventory_reservations"."quantity"),
	CONSTRAINT "inventory_reservations_status" CHECK ("inventory_reservations"."status" IN ('Active','PartiallyFulfilled','Fulfilled','Released')),
	CONSTRAINT "inventory_reservations_timestamps" CHECK ("inventory_reservations"."created_at" <= "inventory_reservations"."updated_at")
);
--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_branch_fk" FOREIGN KEY ("workspace_id","branch_id") REFERENCES "public"."workspace_branch_references"("workspace_id","branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_branch_fk" FOREIGN KEY ("workspace_id","branch_id") REFERENCES "public"."workspace_branch_references"("workspace_id","branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_movements" ADD CONSTRAINT "inventory_movements_operation_fk" FOREIGN KEY ("workspace_id","operation_id") REFERENCES "public"."inventory_operations"("workspace_id","operation_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_operations" ADD CONSTRAINT "inventory_operations_workspace_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("workspace_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_branch_fk" FOREIGN KEY ("workspace_id","branch_id") REFERENCES "public"."workspace_branch_references"("workspace_id","branch_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inventory_reservations" ADD CONSTRAINT "inventory_reservations_product_fk" FOREIGN KEY ("workspace_id","product_id") REFERENCES "public"."catalog_products"("workspace_id","product_id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "inventory_balances_product_idx" ON "inventory_balances" USING btree ("workspace_id","product_id","branch_id");--> statement-breakpoint
CREATE INDEX "inventory_movements_history_idx" ON "inventory_movements" USING btree ("workspace_id","branch_id","product_id","occurred_at");--> statement-breakpoint
CREATE INDEX "inventory_movements_correlation_idx" ON "inventory_movements" USING btree ("workspace_id","correlation_id");--> statement-breakpoint
CREATE UNIQUE INDEX "inventory_movements_operation_branch_type_uq" ON "inventory_movements" USING btree ("workspace_id","operation_id","branch_id","movement_type");--> statement-breakpoint
CREATE INDEX "inventory_reservations_product_idx" ON "inventory_reservations" USING btree ("workspace_id","branch_id","product_id","status");