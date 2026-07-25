import { and, eq } from "drizzle-orm";
import { ProductMediaStorageRootKey } from "../../media/domain/product-media-keys";
import { ProductMediaRoot } from "../../media/domain/product-media-root";
import type {
  ProductMediaRootCreateResult,
  ProductMediaRootRepository,
} from "../../media/repositories/product-media-root.repository";
import { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import type { CatalogDatabase } from "./database";
import { catalogProductMediaRoots } from "./schema";

const UNIQUE_VIOLATION = "23505";
const PRIMARY_CONSTRAINT = "catalog_product_media_roots_pk";
const STORAGE_ROOT_CONSTRAINT = "catalog_product_media_roots_storage_root_uq";

interface PostgreSqlErrorShape {
  readonly code?: unknown;
  readonly constraint?: unknown;
  readonly cause?: unknown;
}

const expectedConstraint = (error: unknown): string | undefined => {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    const candidate = current as PostgreSqlErrorShape;
    if (candidate.code === UNIQUE_VIOLATION && typeof candidate.constraint === "string") return candidate.constraint;
    current = candidate.cause;
  }
  return undefined;
};

const toDomain = (row: typeof catalogProductMediaRoots.$inferSelect): Promise<ProductMediaRoot> => ProductMediaRoot.rehydrate({
  workspaceId: WorkspaceId.create(row.workspaceId),
  productId: ProductId.create(row.productId),
  storageRootKey: ProductMediaStorageRootKey.create(row.storageRootKey),
  createdAt: row.createdAt,
});

export class PostgreSqlProductMediaRootRepository implements ProductMediaRootRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async findByProduct(workspaceId: WorkspaceId, productId: ProductId): Promise<ProductMediaRoot | null> {
    const [row] = await this.database.select().from(catalogProductMediaRoots).where(and(
      eq(catalogProductMediaRoots.workspaceId, workspaceId.value),
      eq(catalogProductMediaRoots.productId, productId.value),
    )).limit(1);
    return row ? await toDomain(row) : null;
  }

  async create(root: ProductMediaRoot): Promise<ProductMediaRootCreateResult> {
    try {
      await this.database.insert(catalogProductMediaRoots).values({
        workspaceId: root.workspaceId.value,
        productId: root.productId.value,
        storageRootKey: root.storageRootKey.value,
        createdAt: root.createdAt,
      });
      return { type: "Created", root };
    } catch (error) {
      const constraint = expectedConstraint(error);
      if (constraint === PRIMARY_CONSTRAINT) {
        const existingRoot = await this.findByProduct(root.workspaceId, root.productId);
        if (existingRoot) return { type: "AlreadyExists", existingRoot };
      }
      if (constraint === STORAGE_ROOT_CONSTRAINT) {
        const existingRoot = await this.findByProduct(root.workspaceId, root.productId);
        if (existingRoot) return { type: "AlreadyExists", existingRoot };
        return { type: "StorageRootConflict" };
      }
      throw error;
    }
  }
}
