import { sql } from "drizzle-orm";
import type { PublicProductShareTuple } from "../../ports/public-product-share-grant-repository.port";
import type { PublicShareCurrentMainPort, PublicShareMainMedia } from "../../ports/public-share-resolution.port";
import { PublicSharePersistenceFailure } from "../../ports/public-share-persistence-failure";
import type { PublicShareTransaction } from "./public-share-persistence";

export class PostgreSqlPublicShareCurrentMain implements PublicShareCurrentMainPort {
  constructor(private readonly transaction: PublicShareTransaction) {}
  async findCurrent(tuple: PublicProductShareTuple): Promise<PublicShareMainMedia | null> {
    const rows = (await this.transaction.execute<Record<string, unknown>>(sql`
      SELECT i.workspace_id,i.product_id,i.storage_key,i.checksum_sha256,i.mime_type,
        i.media_created_at::text,i.media_created_by,r.storage_root_key
      FROM catalog_product_images i
      JOIN catalog_product_media_roots r ON r.workspace_id=i.workspace_id AND r.product_id=i.product_id
      WHERE i.workspace_id=${tuple.workspaceId} AND i.product_id=${tuple.productId} AND i.is_main=true`)).rows;
    if (rows.length > 1) throw new PublicSharePersistenceFailure("IntegrityFailure");
    const row = rows[0];
    if (!row || row.mime_type !== "image/webp" || typeof row.checksum_sha256 !== "string" || !/^[a-f0-9]{64}$/.test(row.checksum_sha256)
      || typeof row.media_created_at !== "string" || !Number.isFinite(new Date(row.media_created_at).getTime())
      || typeof row.media_created_by !== "string" || !row.media_created_by.trim()
      || typeof row.storage_root_key !== "string" || typeof row.storage_key !== "string") return null;
    return { workspaceId: tuple.workspaceId, productId: tuple.productId,
      storageRootKey: row.storage_root_key, storageKey: row.storage_key, expectedSha256: row.checksum_sha256 };
  }
}