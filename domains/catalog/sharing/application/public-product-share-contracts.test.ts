import assert from "node:assert/strict";
import { it } from "node:test";
import type { SpecificationTemplateEntry } from "../../reference-data/domain/catalog-reference-data";
import type { ConfigureSpecificationTemplateEntryInput } from "../../reference-data/application/catalog-reference-data-template.types";
import type { PublicProductShareResult, PublicProductShareSpecificationHandoff } from "./public-product-share.types";
import type {
  PublicShareTokenGeneratorPort, PublicShareLookupDigestPort, PublicShareBearerProtectionPort,
} from "../ports/public-share-crypto.port";
import type {
  PublicProductShareTransactionDecision, PublicProductShareUnitOfWork, PublicProductShareAuditRecord,
} from "../ports/public-product-share-unit-of-work.port";
import type {
  PublicProductShareTuple, PublicProductShareGrantRepository,
  PublicProductShareInsertResult, PublicProductShareSaveResult,
} from "../ports/public-product-share-grant-repository.port";

it("distinguishes insert collisions from expected-revision save conflicts at the repository boundary", () => {
  type InsertOutcome = Awaited<ReturnType<PublicProductShareGrantRepository["insert"]>>;
  type SaveOutcome = Awaited<ReturnType<PublicProductShareGrantRepository["save"]>>;
  const inserts = {
    Saved: "Saved", ActiveTupleConflict: "ActiveTupleConflict",
    GrantIdConflict: "GrantIdConflict", LookupDigestConflict: "LookupDigestConflict",
  } satisfies Record<InsertOutcome, PublicProductShareInsertResult>;
  const saves = {
    Saved: "Saved", ExpectedRevisionConflict: "ExpectedRevisionConflict",
  } satisfies Record<SaveOutcome, PublicProductShareSaveResult>;
  assert.deepEqual(Object.values(inserts), ["Saved", "ActiveTupleConflict", "GrantIdConflict", "LookupDigestConflict"]);
  assert.deepEqual(Object.values(saves), ["Saved", "ExpectedRevisionConflict"]);
  // @ts-expect-error Insert cannot report an expected-revision save conflict.
  const invalidInsert: InsertOutcome = "ExpectedRevisionConflict";
  // @ts-expect-error Save cannot report an insert collision.
  const invalidSave: SaveOutcome = "LookupDigestConflict";
  // @ts-expect-error An arbitrary unique violation is not a semantic retryable insert result.
  const arbitraryUniqueViolation: InsertOutcome = "Conflict";
  void invalidInsert;
  void invalidSave;
  void arbitraryUniqueViolation;
});

it("requires canonical visibility after P2 while configure omission stays compatible", () => {
  const existing = { specificationDefinitionId: "definition-a", sortOrder: 0, required: false, publicVisibility: "internal" } satisfies SpecificationTemplateEntry;
  // @ts-expect-error P2 canonical entries cannot omit visibility.
  const invalidCanonical: SpecificationTemplateEntry = { specificationDefinitionId: "definition-a", sortOrder: 0, required: false };
  void invalidCanonical;
  const omitted = { specificationDefinitionId: "definition-a", sortOrder: 0 } satisfies ConfigureSpecificationTemplateEntryInput;
  const explicit = { ...omitted, publicVisibility: "public" } satisfies ConfigureSpecificationTemplateEntryInput;
  assert.equal(existing.publicVisibility, "internal");
  assert.equal("publicVisibility" in omitted, false);
  assert.equal(explicit.publicVisibility, "public");
});

it("preserves typed zero and false until rendering and rejects mismatched semantic handoffs", () => {
  const values: readonly PublicProductShareSpecificationHandoff[] = [
    { label: "Count", valueType: "Number", value: 0 },
    { label: "Supported", valueType: "Boolean", value: false },
    { label: "Name", valueType: "Text", value: "نص" },
  ];
  assert.equal(values[0].value, 0);
  assert.equal(values[1].value, false);
  // @ts-expect-error Number definitions cannot carry Boolean values.
  const mismatch: PublicProductShareSpecificationHandoff = { label: "Bad", valueType: "Number", value: false };
  void mismatch;
});

it("lets consumers distinguish crypto failure from verification mismatch without exception data", () => {
  const generator: PublicShareTokenGeneratorPort = { generate: () => ({ ok: false, error: "CryptoUnavailable" }) };
  const lookup: PublicShareLookupDigestPort = {
    create: () => ({ ok: false, error: "KeyUnavailable" }),
    candidates: () => ({ ok: true, value: [] }),
    verify: () => ({ ok: true, value: false }),
  };
  const protection: PublicShareBearerProtectionPort = {
    encrypt: () => ({ ok: false, error: "KeyUnavailable" }),
    decrypt: () => ({ ok: false, error: "IntegrityFailure" }),
  };
  assert.deepEqual(generator.generate(), { ok: false, error: "CryptoUnavailable" });
  assert.deepEqual(lookup.create("synthetic"), { ok: false, error: "KeyUnavailable" });
  assert.deepEqual(lookup.verify("synthetic", { keyVersion: 1, value: "a".repeat(64) }), { ok: true, value: false });
  assert.deepEqual(protection.encrypt("synthetic", { workspaceId: "w", grantId: "g", productId: "p", branchId: "b" }),
    { ok: false, error: "KeyUnavailable" });
});

it("expresses rollback separately from successful commit and keeps failures typed", () => {
  const failure: PublicProductShareResult<never> = { ok: false, error: "IntegrityFailure" };
  const abort: PublicProductShareTransactionDecision<typeof failure> = { type: "Rollback", value: failure };
  assert.equal(abort.type, "Rollback");
  assert.equal(abort.value.error, "IntegrityFailure");
  // Compile-time callback contract; this does not claim a real database rollback test.
  type Work = Parameters<PublicProductShareUnitOfWork["execute"]>[0];
  const work: Work = async () => abort;
  void work;
  // @ts-expect-error A callback cannot return an unmarked business result and implicitly commit.
  const unsafeWork: Work = async () => failure;
  void unsafeWork;
});

it("requires internal scope and fixed safe lifecycle audit fields", () => {
  const tuple: PublicProductShareTuple = { workspaceId: "w", productId: "p", branchId: "b" };
  assert.deepEqual(Object.keys(tuple).sort(), ["branchId", "productId", "workspaceId"]);
  const audit: PublicProductShareAuditRecord = { ...tuple, actorId: "actor", grantId: "grant",
    eventType: "PublicProductShareRevoked", occurredAt: new Date("2026-10-05") };
  const forbidden: PublicProductShareAuditRecord = {
    ...audit,
    // @ts-expect-error Audit has no arbitrary metadata or bearer field.
    bearer: "never-audit",
  };
  void forbidden;
  assert.equal("bearer" in audit, false);
});
