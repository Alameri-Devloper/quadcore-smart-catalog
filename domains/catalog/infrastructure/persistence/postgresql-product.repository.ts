import { and, asc, eq } from "drizzle-orm";
import type { ProductRepository } from "../../repositories/product.repository.interface";
import {
  ProductCreateResult,
  ProductUpdateResult,
  type ProductCreateResult as CreateResult,
  type ProductUpdateResult as UpdateResult,
} from "../../repositories/product-repository-results";
import { ProductCode } from "../../types/product-code.value-object";
import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { ProductRevision } from "../../types/product-revision.value-object";
import type { Product } from "../../types/product.aggregate";
import type { CatalogDatabase } from "./database";
import { ProductPersistenceMapper } from "./product-persistence.mapper";
import {
  catalogProductImages,
  catalogProducts,
  catalogProductSpecificationValues,
} from "./schema";

const UNIQUE_VIOLATION = "23505";
const PRODUCT_ID_CONSTRAINT = "catalog_products_pk";
const PRODUCT_CODE_CONSTRAINT = "catalog_products_workspace_product_code_uq";

export const PRODUCT_READ_TRANSACTION_CONFIG = Object.freeze({
  isolationLevel: "repeatable read" as const,
  accessMode: "read only" as const,
});

interface PostgreSqlErrorShape {
  readonly code?: unknown;
  readonly constraint?: unknown;
  readonly cause?: unknown;
}

const expectedConstraint = (error: unknown): string | undefined => {
  let current: unknown = error;
  while (typeof current === "object" && current !== null) {
    const candidate = current as PostgreSqlErrorShape;
    if (candidate.code === UNIQUE_VIOLATION && typeof candidate.constraint === "string") {
      return candidate.constraint;
    }
    current = candidate.cause;
  }
  return undefined;
};

export class PostgreSqlProductRepository implements ProductRepository {
  constructor(private readonly database: CatalogDatabase) {}

  async findById(workspaceId: WorkspaceId, productId: ProductId): Promise<Product | null> {
    return this.database.transaction(async (transaction) => {
      const scope = and(
        eq(catalogProducts.workspaceId, workspaceId.value),
        eq(catalogProducts.productId, productId.value),
      );
      const [product] = await transaction.select().from(catalogProducts).where(scope).limit(1);
      if (!product) return null;

      const specifications = await transaction
        .select()
        .from(catalogProductSpecificationValues)
        .where(and(
          eq(catalogProductSpecificationValues.workspaceId, workspaceId.value),
          eq(catalogProductSpecificationValues.productId, productId.value),
        ))
        .orderBy(asc(catalogProductSpecificationValues.position));
      const images = await transaction
        .select()
        .from(catalogProductImages)
        .where(and(
          eq(catalogProductImages.workspaceId, workspaceId.value),
          eq(catalogProductImages.productId, productId.value),
        ))
        .orderBy(asc(catalogProductImages.position));
      return ProductPersistenceMapper.toDomain(product, specifications, images);
    }, PRODUCT_READ_TRANSACTION_CONFIG);
  }

  async create(product: Product): Promise<CreateResult> {
    const rows = ProductPersistenceMapper.toRows(product);
    try {
      await this.database.transaction(async (transaction) => {
        await transaction.insert(catalogProducts).values(rows.product);
        if (rows.specificationValues.length > 0) {
          await transaction.insert(catalogProductSpecificationValues).values(rows.specificationValues);
        }
        if (rows.images.length > 0) {
          await transaction.insert(catalogProductImages).values(rows.images);
        }
      });
    } catch (error) {
      const constraint = expectedConstraint(error);
      if (constraint === PRODUCT_ID_CONSTRAINT) {
        return ProductCreateResult.productIdConflict(product.identity.workspaceId, product.identity.productId);
      }
      if (constraint === PRODUCT_CODE_CONSTRAINT && product.commercialDetails?.productCode) {
        return ProductCreateResult.productCodeConflict(
          product.identity.workspaceId,
          product.identity.productId,
          product.commercialDetails.productCode,
        );
      }
      throw error;
    }
    return ProductCreateResult.created(product.identity.workspaceId, product.identity.productId, product.revision);
  }

  async update(product: Product, expectedPersistedRevision: ProductRevision): Promise<UpdateResult> {
    const rows = ProductPersistenceMapper.toRows(product);
    try {
      return await this.database.transaction(async (transaction) => {
        const updated = await transaction
          .update(catalogProducts)
          .set(rows.product)
          .where(and(
            eq(catalogProducts.workspaceId, product.identity.workspaceId.value),
            eq(catalogProducts.productId, product.identity.productId.value),
            eq(catalogProducts.revision, expectedPersistedRevision.value),
          ))
          .returning({ revision: catalogProducts.revision });

        if (updated.length === 0) {
          const [actual] = await transaction
            .select({ revision: catalogProducts.revision })
            .from(catalogProducts)
            .where(and(
              eq(catalogProducts.workspaceId, product.identity.workspaceId.value),
              eq(catalogProducts.productId, product.identity.productId.value),
            ))
            .limit(1);
          return actual
            ? ProductUpdateResult.revisionConflict(
                product.identity.workspaceId,
                product.identity.productId,
                expectedPersistedRevision,
                ProductRevision.rehydrate(actual.revision),
              )
            : ProductUpdateResult.productNotFound(product.identity.workspaceId, product.identity.productId);
        }

        await transaction.delete(catalogProductSpecificationValues).where(and(
          eq(catalogProductSpecificationValues.workspaceId, product.identity.workspaceId.value),
          eq(catalogProductSpecificationValues.productId, product.identity.productId.value),
        ));
        await transaction.delete(catalogProductImages).where(and(
          eq(catalogProductImages.workspaceId, product.identity.workspaceId.value),
          eq(catalogProductImages.productId, product.identity.productId.value),
        ));
        if (rows.specificationValues.length > 0) {
          await transaction.insert(catalogProductSpecificationValues).values(rows.specificationValues);
        }
        if (rows.images.length > 0) {
          await transaction.insert(catalogProductImages).values(rows.images);
        }
        return ProductUpdateResult.updated(product.identity.workspaceId, product.identity.productId, product.revision);
      });
    } catch (error) {
      if (expectedConstraint(error) === PRODUCT_CODE_CONSTRAINT && product.commercialDetails?.productCode) {
        return ProductUpdateResult.productCodeConflict(
          product.identity.workspaceId,
          product.identity.productId,
          ProductCode.create(product.commercialDetails.productCode.value),
        );
      }
      throw error;
    }
  }
}
