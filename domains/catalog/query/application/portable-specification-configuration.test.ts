import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import { STAFF_SPECIFICATION_CONFIGURATION as approved, parseApprovedSpecificationManifest } from "../domain/staff-specification-configuration";
import { parseCatalogSpecificationPresentationProfiles } from "../infrastructure/catalog-specification-presentation-config";
import { portableConfigurationFixture } from "../mock/portable-specification-fixture";
import { PortableSpecificationConfigurationUseCase, type IsolatedConfigurationWrites, type ReferenceConfigurationReader } from "./portable-specification-configuration.use-case";

function harness(complete = false) {
  const f = portableConfigurationFixture(complete);
  let snapshot = structuredClone(f.snapshot), writes = 0, reads = 0;
  const reader: ReferenceConfigurationReader = { execute: async ({ context }) => {
    reads++;
    return context.permissions.includes("catalog.referenceData.view") && context.permissions.includes("catalog.referenceData.manage")
      ? { ok: true, value: structuredClone(snapshot) } : { ok: false, error: "Forbidden" };
  } };
  const writer: IsolatedConfigurationWrites = {
    createDefinition: { execute: async c => {
      writes++; const { context, ...d } = c;
      const def = { ...snapshot.departments[0], ...d, unit: d.unit ?? null, valueType: c.valueType as "Text" | "Number" | "Boolean", workspaceId: context.workspaceId, id: randomUUID() };
      snapshot = { ...snapshot, specificationDefinitions: [...snapshot.specificationDefinitions, def] }; return { ok: true, value: def };
    } },
    configureTemplate: { execute: async c => {
      writes++; const old = snapshot.specificationTemplates.find(t => t.productTypeId === c.productTypeId)!;
      if (old.version !== c.expectedVersion) return { ok: false, error: "Conflict" };
      const template = { ...old, version: old.version + 1, entries: c.entries.map(e => ({ ...e, required: e.required ?? false, publicVisibility: e.publicVisibility ?? "internal" })) };
      snapshot = { ...snapshot, specificationTemplates: snapshot.specificationTemplates.map(t => t.id === old.id ? template : t) }; return { ok: true, value: template };
    } },
  };
  const command = { context: f.context, workspaceId: f.workspaceId, currentProfiles: [] };
  return { ...f, reader, writer, command, get snapshot() { return snapshot; }, set snapshot(s) { snapshot = s; }, get writes() { return writes; }, get reads() { return reads; } };
}
test("approved manifest has no UUIDs, product fixtures or new aliases; exact approved input accepted", () => {
  assert.equal(parseApprovedSpecificationManifest(JSON.parse(JSON.stringify(approved))), approved);
  assert.equal(/[a-f0-9]{8}-[a-f0-9]{4}-/i.test(JSON.stringify(approved)), false);
  assert.equal(approved.definitions.filter(d => d.creation === "approved-missing").length, 5);
  assert.equal(approved.productTypes.length, 6);
});
const invalidMutations: readonly [string, (m: Record<string, unknown>) => void][] = [
  ["missing identity", m => { delete m.name; }],
  ["invalid type", m => { (m.definitions as { valueType: string }[])[0].valueType = "Date"; }],
  ["invalid unit", m => { (m.definitions as { unit: string }[])[0].unit = "TB"; }],
  ["duplicate definition", m => { (m.definitions as unknown[]).push((m.definitions as unknown[])[0]); }],
  ["unsupported ProductType", m => { (m.productTypes as { code: string }[])[0].code = "unapproved"; }],
  ["unapproved alias", m => { const t = (m.productTypes as { presentation: { structuredAliases: string[] } }[])[0]; t.presentation.structuredAliases = ["new alias"]; }],
  ["extra value", m => { m.products = []; }],
  ["missing binding", m => { (m.productTypes as { bindings: unknown[] }[])[0].bindings.pop(); }],
];
for (const [name, mutate] of invalidMutations) test("reject manifest: " + name, () => {
  const m = JSON.parse(JSON.stringify(approved)) as Record<string, unknown>; mutate(m);
  assert.throws(() => parseApprovedSpecificationManifest(m));
});
test("dry run is default and never invokes injected writers; reports approved missing and matching dependencies", async () => {
  const h = harness(); const before = JSON.stringify(h.snapshot);
  const r = await new PortableSpecificationConfigurationUseCase(h.reader, h.writer).execute(h.command);
  assert.equal(r.mode, "dry-run"); assert.equal(r.blocked, false); assert.equal(h.writes, 0);
  assert.equal(r.rows.filter(r => r.action === "CREATE").length, 5);
  assert.equal(r.rows.filter(r => r.action === "BIND").length, 5);
  assert.equal(r.rows.filter(r => r.recordType === "Definition" && r.status === "EXISTS_MATCHING").length, 12);
  assert.equal(JSON.stringify(h.snapshot), before); assert.equal(r.candidateProfiles, undefined);
});
test("isolated apply creates five definitions/one template change, emits remapped runtime profiles, repeated apply has zero writes", async () => {
  const h = harness(), useCase = new PortableSpecificationConfigurationUseCase(h.reader, h.writer);
  const r = await useCase.execute({ ...h.command, mode: "apply-isolated" });
  assert.equal(r.application?.status, "PREPARED_NOT_INSTALLED"); assert.equal(h.writes, 6);
  const profiles = parseCatalogSpecificationPresentationProfiles(JSON.stringify(r.candidateProfiles));
  assert.equal(profiles.length, 6);
  assert.ok(profiles.every(p => p.workspaceId === h.workspaceId));
  const laptop = profiles.find(p => p.fields.length === 11)!;
  assert.equal(laptop.fields.filter(f => f.filterable === true).length, 8);
  assert.equal(laptop.fields.find(f => f.combineWith)?.combineSeparator, " ");
  const second = await useCase.execute({ ...h.command, mode: "apply-isolated", currentProfiles: profiles });
  assert.equal(second.application?.completed.length, 0); assert.equal(h.writes, 6);
  assert.ok(second.rows.every(r => r.status === "EXISTS_MATCHING"));
});
test("operational apply disabled before read by default", async () => {
  const h = harness(); const r = await new PortableSpecificationConfigurationUseCase(h.reader).execute({ ...h.command, mode: "apply-isolated" });
  assert.equal(r.application?.status, "DISABLED"); assert.equal(h.reads, 0); assert.equal(h.writes, 0);
});
test("cross-Workspace explicit target rejected before read", async () => {
  const h = harness(); const r = await new PortableSpecificationConfigurationUseCase(h.reader, h.writer).execute({ ...h.command, workspaceId: randomUUID(), mode: "apply-isolated" });
  assert.equal(r.rows[0].status, "NOT_AUTHORIZED"); assert.equal(h.reads, 0); assert.equal(h.writes, 0);
});
test("existing read authorization remains mandatory", async () => {
  const h = harness(); const r = await new PortableSpecificationConfigurationUseCase(h.reader).execute({ ...h.command, context: { ...h.context, permissions: [] } });
  assert.equal(r.rows[0].status, "NOT_AUTHORIZED"); assert.equal(h.writes, 0);
});
test("foreign snapshot and foreign ProductType parent blocked", async () => {
  const h = harness(true); h.snapshot = { ...h.snapshot, productTypes: h.snapshot.productTypes.map((p, i) => i ? p : { ...p, workspaceId: randomUUID() }) };
  assert.equal((await new PortableSpecificationConfigurationUseCase(h.reader).execute(h.command)).blocked, true);
  const other = harness(true); other.snapshot = { ...other.snapshot, categories: [] };
  const r = await new PortableSpecificationConfigurationUseCase(other.reader).execute(other.command);
  assert.equal(r.blocked, true); assert.ok(r.rows.some(r => r.status === "UNRESOLVED_DEPENDENCY"));
});
test("type/unit/label/status mismatch and required missing definitions block all writes", async () => {
  for (const patch of [{ valueType: "Boolean" as const }, { unit: "TB" }, { displayName: "different" }, { status: "Inactive" as const }]) {
    const h = harness(true); h.snapshot = { ...h.snapshot, specificationDefinitions: h.snapshot.specificationDefinitions.map((d, i) => i ? d : { ...d, ...patch }) };
    const r = await new PortableSpecificationConfigurationUseCase(h.reader, h.writer).execute({ ...h.command, mode: "apply-isolated" });
    assert.equal(r.blocked, true); assert.ok(r.rows.some(r => r.status === "CONFLICT")); assert.equal(h.writes, 0);
  }
  const h = harness(); h.snapshot = { ...h.snapshot, specificationDefinitions: [] };
  assert.equal((await new PortableSpecificationConfigurationUseCase(h.reader, h.writer).execute({ ...h.command, mode: "apply-isolated" })).blocked, true);
  assert.equal(h.writes, 0);
});
test("ambiguous code/mapping and unsupported mapping rejected", async () => {
  const h = harness(true); h.snapshot = { ...h.snapshot, specificationDefinitions: [...h.snapshot.specificationDefinitions, h.snapshot.specificationDefinitions[0]] };
  assert.equal((await new PortableSpecificationConfigurationUseCase(h.reader).execute(h.command)).blocked, true);
  const mapping = Object.fromEntries(approved.productTypes.map(t => [t.code, "same"]));
  assert.equal((await new PortableSpecificationConfigurationUseCase(h.reader).execute({ ...h.command, productTypeCodes: mapping })).blocked, true);
  assert.equal((await new PortableSpecificationConfigurationUseCase(h.reader).execute({ ...h.command, productTypeCodes: { unknown: "x" } })).blocked, true);
});
test("wrong binding, occupied order and runtime filterability changes conflict without overwrite", async () => {
  const h = harness(true); const first = h.snapshot.specificationTemplates[0];
  h.snapshot = { ...h.snapshot, specificationTemplates: [{ ...first, entries: first.entries.map(e => ({ ...e, publicVisibility: "public" as const })) }, ...h.snapshot.specificationTemplates.slice(1)] };
  assert.equal((await new PortableSpecificationConfigurationUseCase(h.reader).execute(h.command)).blocked, true);
  const other = harness(true), u = new PortableSpecificationConfigurationUseCase(other.reader);
  const valid = await u.execute(other.command); const profiles = structuredClone(valid.candidateProfiles!);
  const mutated = profiles.map((p, i) => i ? p : { ...p, fields: p.fields.map(f => ({ ...f, filterable: !f.filterable })) });
  const r = await u.execute({ ...other.command, currentProfiles: mutated });
  assert.ok(r.rows.some(r => r.recordType === "Profile" && r.status === "CONFLICT"));
});
test("unknown runtime state blocks apply, never interpreted as empty", async () => {
  const h = harness(); const r = await new PortableSpecificationConfigurationUseCase(h.reader, h.writer).execute({ ...h.command, currentProfiles: undefined, mode: "apply-isolated" });
  assert.equal(r.blocked, true); assert.equal(h.writes, 0);
});
test("persistence failure stops without retries or claiming batch rollback", async () => {
  const h = harness(); let calls = 0;
  const u = new PortableSpecificationConfigurationUseCase(h.reader, { ...h.writer, createDefinition: { execute: async () => { calls++; throw Error("simulated uncertain result"); } } });
  const r = await u.execute({ ...h.command, mode: "apply-isolated" });
  assert.equal(r.application?.status, "STOPPED_REPLAN_REQUIRED"); assert.equal(calls, 1);
});

test("null manifest is invalid rather than silently using defaults", async () => {
  const h = harness(); const r = await new PortableSpecificationConfigurationUseCase(h.reader).execute({ ...h.command, manifest: null });
  assert.equal(r.blocked, true); assert.equal(h.reads, 0);
});
test("explicit target ProductType and required-definition code mappings preserve semantic bindings", async () => {
  const h = harness(true), laptop = "qa-discovery-laptop";
  h.snapshot = { ...h.snapshot,
    productTypes: h.snapshot.productTypes.map(t => t.code === laptop ? { ...t, code: "target-laptop" } : t),
    specificationDefinitions: h.snapshot.specificationDefinitions.map(d => d.code === "qa-memory" ? { ...d, code: "target-memory" } : d),
  };
  const u = new PortableSpecificationConfigurationUseCase(h.reader);
  assert.equal((await u.execute(h.command)).blocked, true);
  const r = await u.execute({ ...h.command, productTypeCodes: { [laptop]: "target-laptop" }, definitionCodes: { "qa-memory": "target-memory" } });
  assert.equal(r.blocked, false); assert.equal(r.candidateProfiles?.length, 6); assert.equal(h.writes, 0);
});
test("ambiguous definition mapping and remapping new-definition creation are rejected", async () => {
  const h = harness(true), u = new PortableSpecificationConfigurationUseCase(h.reader, h.writer);
  const mappings: Readonly<Record<string, string>>[] = [{ "qa-memory": "qa-discovery-cpu" }, { "cpu-generation": "other-generation" }, { unknown: "unknown" }];
  for (const definitionCodes of mappings) {
    const r = await u.execute({ ...h.command, definitionCodes, mode: "apply-isolated" });
    assert.equal(r.blocked, true);
  }
  assert.equal(h.reads, 0); assert.equal(h.writes, 0);
});
test("unknown writes before apply composition and read failure remain fail closed", async () => {
  const reader: ReferenceConfigurationReader = { execute: async () => { throw Error("read failed"); } };
  const r = await new PortableSpecificationConfigurationUseCase(reader).execute(harness().command);
  assert.equal(r.mode, "dry-run"); assert.equal(r.blocked, true); assert.equal(r.application, undefined);
});
test("occupied approved binding position is a conflict; unrelated bindings never removed", async () => {
  const h = harness(); const laptop = h.snapshot.specificationTemplates.find(t => t.entries.length === 6)!;
  h.snapshot = { ...h.snapshot, specificationTemplates: h.snapshot.specificationTemplates.map(t => t.id !== laptop.id ? t : { ...t, entries: [...t.entries, { specificationDefinitionId: randomUUID(), sortOrder: 6, required: false, publicVisibility: "internal" }] }) };
  const r = await new PortableSpecificationConfigurationUseCase(h.reader, h.writer).execute({ ...h.command, mode: "apply-isolated" });
  assert.equal(r.blocked, true); assert.ok(r.rows.some(r => r.reason.includes("position occupied"))); assert.equal(h.writes, 0);
});
test("runtime profile keeps unapproved fields default-denied and unrelated scopes preserved", async () => {
  const h = harness(true), u = new PortableSpecificationConfigurationUseCase(h.reader);
  const initial = await u.execute(h.command);
  const profiles = initial.candidateProfiles!;
  const laptop = profiles.find(p => p.fields.length === 11)!;
  assert.equal(laptop.fields.filter(f => f.filterable !== true).length, 3);
  const extra = { ...profiles[0], workspaceId: randomUUID(), productTypeId: randomUUID() };
  const result = await u.execute({ ...h.command, currentProfiles: [extra, ...profiles] });
  assert.equal(result.blocked, false); assert.equal(result.candidateProfiles?.length, 7); assert.deepEqual(result.candidateProfiles?.[0], extra);
});
