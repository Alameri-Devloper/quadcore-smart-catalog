import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { TrustedActorContext } from "../../../../shared/auth/trusted-actor-context";
import type { SpecificationTemplate } from "../domain/catalog-reference-data";
import type { CatalogReferenceAuditRecord, CatalogReferenceDataRepository, CatalogReferenceDataUnitOfWork } from "../ports/catalog-reference-data-unit-of-work.port";
import { ConfigureProductTypeSpecificationTemplateUseCase } from "./catalog-reference-data.use-cases";
import { parseConfigureSpecificationTemplateEntries } from "./catalog-reference-data-template.types";

const now = new Date("2026-10-06T10:00:00Z");
const actor: TrustedActorContext = { workspaceId: "workspace-a", actorId: "actor-a", role: "Staff", permissions: ["catalog.referenceData.manage"], branchScope: { type: "AllBranches" }, authorizationVersion: 1 };
const entry = (id: string, publicVisibility: "internal" | "public" = "internal", sortOrder = 0) => ({ specificationDefinitionId: id, publicVisibility, sortOrder, required: false });
const record = (id: string) => ({ id, workspaceId: actor.workspaceId, code: id, displayName: id, status: "Active" as const, sortOrder: 0, version: 1, createdAt: now, updatedAt: now });
const fixture = (initial: SpecificationTemplate["entries"] | null = null) => {
  let current: SpecificationTemplate | null = initial === null ? null : { workspaceId: actor.workspaceId, id: "template-a", productTypeId: "type-a", version: 1, entries: initial, createdAt: now, updatedAt: now };
  const audits: CatalogReferenceAuditRecord[] = [];
  let writes = 0; let locks = 0; let failAudit = false; let failCas = false;
  const references: Partial<CatalogReferenceDataRepository> = {
    findProductType: async (workspace, id) => workspace === actor.workspaceId && id.startsWith("type-") ? { ...record(id), categoryId: "category-a" } : null,
    findSpecificationDefinition: async (workspace, id) => workspace === actor.workspaceId && !id.startsWith("foreign") ? { ...record(id), valueType: "Text", unit: null } : null,
    lockSpecificationTemplate: async (workspace, type) => { assert.equal(workspace, actor.workspaceId); locks++; return current?.productTypeId === type ? current : null; },
    configureTemplate: async (input) => {
      writes++;
      if (failCas) return null;
      assert.equal(locks > 0, true);
      current = { workspaceId: input.workspaceId, productTypeId: input.productTypeId, id: current?.id ?? input.id, version: (current?.version ?? 0) + 1, entries: input.entries, createdAt: current?.createdAt ?? now, updatedAt: now };
      return current;
    },
  };
  const unitOfWork: CatalogReferenceDataUnitOfWork = { execute: async (work) => {
    const previous = current;
    try { return await work({ references: references as CatalogReferenceDataRepository, audit: { append: async (audit) => { if (failAudit) throw new Error("SyntheticAuditFailure"); audits.push(audit); } } }); }
    catch (error) { current = previous; throw error; }
  } };
  const useCase = new ConfigureProductTypeSpecificationTemplateUseCase({ unitOfWork, identifiers: { next: () => "template-a" }, clock: { now: () => now } });
  return { save: (entries: Parameters<typeof useCase.execute>[0]["entries"], expectedVersion?: number, context = actor, productTypeId = "type-a") => useCase.execute({ context, productTypeId, entries, ...(expectedVersion === undefined ? {} : { expectedVersion }) }), current: () => current, audits, writes: () => writes, setAuditFailure: () => { failAudit = true; }, setCasFailure: () => { failCas = true; } };
};

describe("P2 template visibility Application compatibility", () => {
  it("defaults new omitted entries internal and preserves explicit public", async () => {
    const f = fixture();
    const result = await f.save([{ specificationDefinitionId: "a", sortOrder: 0 }, entry("b", "public", 1)]);
    assert.equal(result.ok, true);
    assert.deepEqual(f.current()?.entries.map((value) => value.publicVisibility), ["internal", "public"]);
  });
  it("preserves retained values by Definition ID across reorder and same-save re-add", async () => {
    const f = fixture([entry("a", "public"), entry("b", "internal", 1)]);
    await f.save([{ specificationDefinitionId: "b", sortOrder: 0, required: true }, { specificationDefinitionId: "a", sortOrder: 1 }], 1);
    assert.deepEqual(f.current()?.entries, [entry("b", "internal", 0), entry("a", "public", 1)].map((value, index) => ({ ...value, required: index === 0 })));
    assert.equal(f.audits[0].metadata?.visibilityTransitions, "[]");
  });
  it("defaults an entry internal after removal in an earlier saved version", async () => {
    const f = fixture([entry("a", "public")]);
    await f.save([], 1);
    await f.save([{ specificationDefinitionId: "a", sortOrder: 0 }], 2);
    assert.equal(f.current()?.entries[0].publicVisibility, "internal");
  });
  it("records every transition/count rule with sorted allowlisted evidence", async () => {
    const f = fixture([entry("a", "internal"), entry("b", "public", 1), entry("c", "public", 2), entry("d", "internal", 3), entry("g", "public", 4)]);
    await f.save([entry("g", "public", 0), entry("f", "internal", 1), entry("e", "public", 2), entry("b", "internal", 3), entry("a", "public", 4)], 1);
    assert.deepEqual(f.audits[0].metadata, { productTypeId: "type-a", entryCount: 5, version: 2, toPublicCount: 2, fromPublicCount: 2, visibilityTransitions: JSON.stringify([
      { specificationDefinitionId: "a", from: "internal", to: "public" },
      { specificationDefinitionId: "b", from: "public", to: "internal" },
      { specificationDefinitionId: "c", from: "public", to: null },
      { specificationDefinitionId: "d", from: "internal", to: null },
      { specificationDefinitionId: "e", from: null, to: "public" },
      { specificationDefinitionId: "f", from: null, to: "internal" },
    ]) });
    assert.equal(f.audits[0].eventType, "SpecificationTemplateConfigured");
  });
  it("rejects stale/missing versions before writes/audit and versions on creation", async () => {
    for (const version of [undefined, 2]) { const f = fixture([entry("a", "public")]); assert.deepEqual(await f.save([entry("a")], version), { ok: false, error: "Conflict" }); assert.equal(f.writes(), 0); assert.equal(f.audits.length, 0); }
    const f = fixture(); assert.deepEqual(await f.save([], 1), { ok: false, error: "Conflict" });
  });
  it("keeps authorization, Workspace and Definition boundaries", async () => {
    const f = fixture();
    assert.deepEqual(await f.save([], undefined, { ...actor, permissions: [] }), { ok: false, error: "Forbidden" });
    assert.deepEqual(await f.save([], undefined, { ...actor, workspaceId: "foreign" }), { ok: false, error: "NotFound" });
    assert.deepEqual(await f.save([entry("foreign-definition")]), { ok: false, error: "NotFound" });
    assert.equal(f.writes(), 0); assert.equal(f.audits.length, 0);
  });
  it("keeps visibility independent between Product Type templates", async () => {
    const f = fixture([entry("a", "public")]);
    await f.save([{ specificationDefinitionId: "a", sortOrder: 0 }], undefined, actor, "type-b");
    assert.equal(f.current()?.entries[0].publicVisibility, "internal");
  });
  it("emits no success audit for CAS conflict and rolls back audit failure", async () => {
    const f = fixture([entry("a", "public")]); f.setCasFailure();
    assert.deepEqual(await f.save([entry("a")], 1), { ok: false, error: "Conflict" }); assert.equal(f.audits.length, 0);
    const g = fixture([entry("a", "public")]); g.setAuditFailure();
    await assert.rejects(() => g.save([entry("a")], 1)); assert.equal(g.current()?.version, 1); assert.equal(g.current()?.entries[0].publicVisibility, "public");
  });
  it("rejects duplicate identities/orders and malformed runtime input before writes", async () => {
    const f = fixture();
    for (const entries of [[entry("a"), entry("a", "public", 1)], [entry("a"), entry("b")]]) assert.deepEqual(await f.save(entries), { ok: false, error: "InvalidInput" });
    assert.equal(f.writes(), 0);
  });
});

describe("P2 strict configure-entry parser", () => {
  it("preserves omission only and accepted defaults", () => {
    assert.deepEqual(parseConfigureSpecificationTemplateEntries([{ specificationDefinitionId: "a", sortOrder: 0 }]), [{ specificationDefinitionId: "a", sortOrder: 0, required: false }]);
    for (const visibility of ["internal", "public"]) assert.equal(parseConfigureSpecificationTemplateEntries([{ ...entry("a"), publicVisibility: visibility }])[0].publicVisibility, visibility);
  });
  for (const value of [null, undefined, "Public", " public", "internal ", false, 1, {}]) it(`rejects explicit visibility ${JSON.stringify(value)}`, () => assert.throws(() => parseConfigureSpecificationTemplateEntries([{ ...entry("a"), publicVisibility: value }])));
  for (const value of [null, [], "a", {}, { ...entry("a"), extra: true }, { ...entry("a"), required: null }, { ...entry("a"), required: 1 }, { ...entry("a"), specificationDefinitionId: " " }, { ...entry("a"), sortOrder: -1 }]) it(`rejects malformed entry ${JSON.stringify(value)}`, () => assert.throws(() => parseConfigureSpecificationTemplateEntries([value])));
});
