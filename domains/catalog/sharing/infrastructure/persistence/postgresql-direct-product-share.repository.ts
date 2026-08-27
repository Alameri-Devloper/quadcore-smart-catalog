import { sql } from "drizzle-orm";
import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import type { DirectProductShareProjection, DirectShareMediaProjection, DirectShareSpecificationProjection } from "../../domain/direct-product-share";
import type { DirectProductShareRepository } from "../../ports/direct-product-share-repository.port";

type Row = Record<string, unknown>;
const nullableText = (row: Row, key: string): string | null => row[key] === null || row[key] === undefined ? null : String(row[key]);

const mediaFrom = (row: Row): DirectShareMediaProjection | null => {
  const mediaId = nullableText(row, "media_id");
  const root = nullableText(row, "storage_root_key");
  const key = nullableText(row, "storage_key");
  const checksum = nullableText(row, "checksum_sha256");
  if (!mediaId || !root || !key || !checksum || nullableText(row, "mime_type") !== "image/webp") return null;
  return Object.freeze({ mediaId, storageRootKey: root, storageKey: key, checksumSha256: checksum, mimeType: "image/webp" });
};

export class PostgreSqlDirectProductShareRepository implements DirectProductShareRepository {
  constructor(private readonly database: PlatformDatabase) {}

  async branchExists(workspaceId: string, branchId: string): Promise<boolean> {
    const result = await this.database.execute<{ found: boolean }>(sql`
      SELECT EXISTS(
        SELECT 1 FROM workspace_branch_references
        WHERE workspace_id=${workspaceId} AND branch_id=${branchId} AND status='Active'
      ) AS found
    `);
    return result.rows[0]?.found === true;
  }

  async getShareProduct(query: Parameters<DirectProductShareRepository["getShareProduct"]>[0]): Promise<DirectProductShareProjection | null> {
    const result = await this.database.execute<Row>(sql`
      SELECT p.product_id,p.product_code,p.product_name,p.lifecycle_state,
        br.display_name AS branch_display_name,
        COALESCE(bl.listing_status,'NotConfigured') AS listing_status,
        (COALESCE(ib.on_hand_quantity,0)-COALESCE(ib.reserved_quantity,0)-COALESCE(ib.damaged_quantity,0))::text AS available_quantity,
        CASE WHEN ${query.priceMode}='Retail' THEN COALESCE(po.amount_minor,p.retail_price_minor)::text
             ELSE COALESCE(po.amount_minor,p.wholesale_price_minor)::text END AS price_minor,
        CASE WHEN ${query.priceMode}='Retail' THEN COALESCE(po.currency,p.retail_price_currency)
             ELSE COALESCE(po.currency,p.wholesale_price_currency) END AS price_currency,
        mi.product_image_id AS media_id,mi.storage_key,mi.checksum_sha256,mi.mime_type,mr.storage_root_key
      FROM catalog_products p
      LEFT JOIN workspace_branch_references br
        ON br.workspace_id=p.workspace_id AND br.branch_id=${query.branchId} AND br.status='Active'
      LEFT JOIN catalog_branch_product_listings bl
        ON bl.workspace_id=p.workspace_id AND bl.product_id=p.product_id AND bl.branch_id=${query.branchId}
      LEFT JOIN inventory_balances ib
        ON ib.workspace_id=p.workspace_id AND ib.product_id=p.product_id AND ib.branch_id=${query.branchId}
      LEFT JOIN catalog_product_branch_price_overrides po
        ON po.workspace_id=p.workspace_id AND po.product_id=p.product_id AND po.branch_id=${query.branchId} AND po.price_type=${query.priceMode}
      LEFT JOIN LATERAL (
        SELECT i.product_image_id,i.storage_key,i.checksum_sha256,i.mime_type
        FROM catalog_product_images i
        WHERE i.workspace_id=p.workspace_id AND i.product_id=p.product_id AND i.is_main=true
          AND i.mime_type='image/webp' AND i.checksum_sha256 IS NOT NULL
        LIMIT 1
      ) mi ON true
      LEFT JOIN catalog_product_media_roots mr
        ON mr.workspace_id=p.workspace_id AND mr.product_id=p.product_id
      WHERE p.workspace_id=${query.workspaceId} AND p.product_id=${query.productId}
    `);
    const row = result.rows[0];
    if (!row) return null;
    const specificationResult = await this.database.execute<Row>(sql`
      SELECT COALESCE(d.display_name,v.specification_field_id) AS display_name,
        COALESCE(v.text_value,v.number_value,v.boolean_value::text) AS value,
        v.boolean_value,v.value_type,d.unit,v.position
      FROM catalog_product_specification_values v
      LEFT JOIN catalog_specification_definitions d
        ON d.workspace_id=v.workspace_id AND d.specification_definition_id=v.specification_field_id
      WHERE v.workspace_id=${query.workspaceId} AND v.product_id=${query.productId}
      ORDER BY v.position,v.specification_field_id
    `);
    const specifications = Object.freeze(specificationResult.rows.map((specification): DirectShareSpecificationProjection => Object.freeze({
      displayName: String(specification.display_name),
      value: String(specification.value_type) === "boolean" ? specification.boolean_value === true : String(specification.value),
      unit: nullableText(specification, "unit"),
      position: Number(specification.position),
    })));
    const priceMinor = nullableText(row, "price_minor");
    const priceCurrency = nullableText(row, "price_currency");
    const branchDisplayName = nullableText(row, "branch_display_name");
    return Object.freeze({
      productId: String(row.product_id),
      productCode: nullableText(row, "product_code"),
      productName: nullableText(row, "product_name"),
      lifecycle: String(row.lifecycle_state) as DirectProductShareProjection["lifecycle"],
      branch: query.branchId && branchDisplayName ? Object.freeze({
        displayName: branchDisplayName,
        listingStatus: (nullableText(row, "listing_status") ?? "NotConfigured") as "Listed" | "Unlisted" | "NotConfigured",
        availableQuantity: BigInt(nullableText(row, "available_quantity") ?? "0"),
      }) : null,
      price: priceMinor !== null && priceCurrency ? Object.freeze({ amountMinor: BigInt(priceMinor), currency: priceCurrency }) : null,
      specifications,
      mainMedia: mediaFrom(row),
    });
  }

  async getShareMedia(workspaceId: string, productId: string): Promise<Awaited<ReturnType<DirectProductShareRepository["getShareMedia"]>>> {
    const result = await this.database.execute<Row>(sql`
      SELECT p.product_id,p.product_code,p.lifecycle_state,
        i.product_image_id AS media_id,i.storage_key,i.checksum_sha256,i.mime_type,mr.storage_root_key
      FROM catalog_products p
      LEFT JOIN catalog_product_images i
        ON i.workspace_id=p.workspace_id AND i.product_id=p.product_id AND i.is_main=true
          AND i.mime_type='image/webp' AND i.checksum_sha256 IS NOT NULL
      LEFT JOIN catalog_product_media_roots mr
        ON mr.workspace_id=p.workspace_id AND mr.product_id=p.product_id
      WHERE p.workspace_id=${workspaceId} AND p.product_id=${productId}
      LIMIT 1
    `);
    const row = result.rows[0];
    return row ? Object.freeze({
      productId: String(row.product_id),
      productCode: nullableText(row, "product_code"),
      lifecycle: String(row.lifecycle_state) as "Draft" | "Published" | "Archived",
      media: mediaFrom(row),
    }) : null;
  }
}
