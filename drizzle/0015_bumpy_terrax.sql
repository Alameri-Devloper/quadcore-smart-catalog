CREATE EXTENSION IF NOT EXISTS pg_trgm;--> statement-breakpoint
CREATE INDEX "catalog_branch_product_listings_query_idx" ON "catalog_branch_product_listings" USING btree ("workspace_id","branch_id","listing_status","product_id");--> statement-breakpoint
CREATE INDEX "catalog_products_query_newest_idx" ON "catalog_products" USING btree ("workspace_id","lifecycle_state","created_at","product_id");--> statement-breakpoint
CREATE INDEX "catalog_products_query_name_idx" ON "catalog_products" USING btree ("workspace_id","lifecycle_state",lower(coalesce("product_name", '')),"product_id");--> statement-breakpoint
CREATE INDEX "catalog_products_query_retail_idx" ON "catalog_products" USING btree ("workspace_id","lifecycle_state","retail_price_currency","retail_price_minor","product_id");--> statement-breakpoint
CREATE INDEX "catalog_products_name_trgm_idx" ON "catalog_products" USING gin (lower(coalesce("product_name", '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "catalog_products_code_trgm_idx" ON "catalog_products" USING gin (lower(coalesce("product_code", '')) gin_trgm_ops);--> statement-breakpoint
CREATE INDEX "catalog_products_search_vector_idx" ON "catalog_products" USING gin (to_tsvector('simple', coalesce("product_name", '') || ' ' || coalesce("product_code", '')));--> statement-breakpoint
CREATE INDEX "inventory_balances_available_query_idx" ON "inventory_balances" USING btree ("workspace_id","branch_id",("on_hand_quantity" - "reserved_quantity" - "damaged_quantity"),"product_id");
