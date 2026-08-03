import type { ProductRepository } from "../../repositories/product.repository.interface";
import type { ProductEntryAuditRepository } from "../repositories/product-entry-audit.repository";
import type { ProductEntrySubmissionMediaPlanRepository } from "../repositories/product-entry-media-plan.repository";
import type { ProductEntrySubmissionRepository } from "../repositories/product-entry-submission.repository";
import type { ProductEntryProductCodeAllocator, ProductEntryProductIdAllocator } from "./product-entry-identity-allocator.port";

export interface ProductEntryTransactionalContext {
  readonly productRepository: ProductRepository;
  readonly submissionRepository: ProductEntrySubmissionRepository;
  readonly mediaPlanRepository: ProductEntrySubmissionMediaPlanRepository;
  readonly auditRepository: ProductEntryAuditRepository;
  readonly productIdAllocator: ProductEntryProductIdAllocator;
  readonly productCodeAllocator: ProductEntryProductCodeAllocator;
}

export type ProductEntryTransactionDecision<T> =
  | { readonly type: "Commit"; readonly result: T }
  | { readonly type: "Rollback"; readonly result: T };

export const commitProductEntryTransaction = <T>(result: T): ProductEntryTransactionDecision<T> =>
  Object.freeze({ type: "Commit", result });

export const rollbackProductEntryTransaction = <T>(result: T): ProductEntryTransactionDecision<T> =>
  Object.freeze({ type: "Rollback", result });

export interface ProductEntryUnitOfWork {
  execute<T>(
    work: (context: ProductEntryTransactionalContext) => Promise<ProductEntryTransactionDecision<T>>,
  ): Promise<T>;
}
