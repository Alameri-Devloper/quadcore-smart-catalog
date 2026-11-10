import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { CatalogSpecificationProjection } from "../domain/catalog-query";
import type { CatalogSpecificationPresentationProfile } from "../domain/catalog-specification-presentation";
import { projectCatalogSpecifications } from "./project-catalog-specifications";
import { parseCatalogSpecificationPresentationProfiles } from "../infrastructure/catalog-specification-presentation-config";

const value = (id: string, v: string | boolean, valueType: "Text" | "Number" | "Boolean" = "Text"): CatalogSpecificationProjection => ({ specificationDefinitionId: id, displayName: id, valueType, unit: null, value: v, sortOrder: 0 });
const toDefinition = ({ specificationDefinitionId, displayName, valueType, unit, sortOrder }: CatalogSpecificationProjection) => ({ specificationDefinitionId, displayName, valueType, unit, sortOrder });
const profile = (ids: readonly string[], workspaceId = "workspace-a", productTypeId = "type-a"): CatalogSpecificationPresentationProfile => ({ workspaceId, productTypeId, groups: [{ id: "hardware", label: { en: "Hardware", ar: "العتاد" } }], fields: ids.map((id, index) => ({ specificationDefinitionId: id, groupId: "hardware", cardPriority: index + 1, importantInDetails: true })) });
const run = (p: CatalogSpecificationPresentationProfile, values: readonly CatalogSpecificationProjection[], definitions = values.map(toDefinition)) => projectCatalogSpecifications({ workspaceId: "workspace-a", productTypeId: "type-a", specifications: values, definitions, profiles: [p] })!;

describe("Phase 1 specification projection", () => {
  it("uses explicit per-type priorities, capped at three, with configured fallbacks", () => {
    const cases = [
      ["cpu", "memory", "storage", "gpu", "display"],
      ["memory"],
      ["resolution", "outdoor", "technology", "lens"],
      ["resolution", "outdoor", "technology", "lens"],
      ["channels", "record-resolution", "technology"],
      ["channels", "record-resolution", "technology"],
    ];
    for (const ids of cases) {
      const values = [...ids].reverse().map((id) => value(id, id));
      assert.deepEqual(run(profile(ids), values).cardSpecifications.map((v) => v.specificationDefinitionId), ids.slice(0, 3));
      const remaining = values.filter((v) => v.specificationDefinitionId !== ids[0]);
      assert.deepEqual(run(profile(ids), remaining).cardSpecifications.map((v) => v.specificationDefinitionId), ids.slice(1, 4));
    }
  });
  it("keeps zero and false, skips blanks, and never calls false an indoor classification", () => {
    const values = [value("blank", " "), value("zero", "0", "Number"), value("outdoor", false, "Boolean"), value("fallback", "known")];
    const projected = run(profile(["blank", "zero", "outdoor", "fallback"]), values);
    assert.deepEqual(projected.cardSpecifications.map((v) => v.value), ["0", false, "known"]);
    assert.equal(values[2]!.value, false);
  });
  it("preserves every historical/off-template value and input order within each group", () => {
    const values = Object.freeze([value("historical", "old"), value("second", "B"), value("first", "A")]);
    const projected = run(profile(["first", "second"]), values, values.filter((v) => v.specificationDefinitionId !== "historical").map(toDefinition));
    assert.deepEqual(projected.specificationGroups.map((g) => g.specificationDefinitionIds), [["second", "first"], ["historical"]]);
    assert.deepEqual(values.map((v) => v.specificationDefinitionId), ["historical", "second", "first"]);
  });
  it("limits important missing rows to four and rejects nonexistent/unapproved applicability", () => {
    const ids = ["a", "b", "c", "d", "e", "nonexistent", "off-template"];
    const p = profile(ids);
    const definitions = ids.slice(0, 5).map((id) => ({ specificationDefinitionId: id, displayName: id, valueType: "Text" as const, unit: null, sortOrder: 0 }));
    const projected = run(p, [], definitions);
    assert.deepEqual(projected.specificationGroups.flatMap((g) => g.missingSpecifications.map((v) => v.specificationDefinitionId)), ["a", "b", "c", "d"]);
    const optional = { ...p, fields: p.fields.map((field) => ({ ...field, importantInDetails: false })) };
    assert.deepEqual(run(optional, [], definitions).specificationGroups, []);
    assert.deepEqual(projectCatalogSpecifications({ workspaceId: "workspace-b", productTypeId: "type-a", specifications: [], definitions, profiles: [p] }), null);
    assert.deepEqual(projectCatalogSpecifications({ workspaceId: "workspace-a", productTypeId: "unknown", specifications: [], definitions, profiles: [p] }), null);
  });
  it("does not treat stored values as missing or select incompatible metadata types for cards", () => {
    const values = [value("outdoor", false, "Boolean")];
    const wrongType = [{ specificationDefinitionId: "outdoor", displayName: "Outdoor", valueType: "Text" as const, unit: null, sortOrder: 0 }];
    const projected = run(profile(["outdoor"]), values, wrongType);
    assert.deepEqual(projected.cardSpecifications, []);
    assert.equal(projected.specificationGroups.flatMap((g) => g.specificationDefinitionIds).length, 1);
    assert.equal(projected.specificationGroups.flatMap((g) => g.missingSpecifications).length, 0);
  });
});

describe("Trusted scoped presentation configuration", () => {
  it("defaults to no profiles and deeply freezes explicitly scoped configuration", () => {
    assert.deepEqual(parseCatalogSpecificationPresentationProfiles(undefined), []);
    const parsed = parseCatalogSpecificationPresentationProfiles(JSON.stringify([profile(["cpu"])]));
    assert.equal(parsed[0]!.workspaceId, "workspace-a");
    assert.ok(Object.isFrozen(parsed[0]!.fields[0]));
  });
  it("rejects ambiguous duplicate scopes, fields, groups, priorities and unknown group references", () => {
    const p = profile(["a", "b"]);
    const invalid = [
      [p, p], [{ ...p, fields: [p.fields[0], p.fields[0]] }],
      [{ ...p, groups: [p.groups[0], p.groups[0]] }],
      [{ ...p, fields: p.fields.map((f) => ({ ...f, cardPriority: 1 })) }],
      [{ ...p, fields: [{ ...p.fields[0], groupId: "unknown" }] }],
      [{ ...p, fields: [{ ...p.fields[0], importantInDetails: "yes" }] }],
      [{ ...p, groups: [{ id: "additional-stored", label: { en: "A", ar: "أ" } }], fields: [] }],
    ];
    for (const item of invalid) assert.throws(() => parseCatalogSpecificationPresentationProfiles(JSON.stringify(item)), /InvalidCatalogSpecificationPresentationConfiguration/);
    assert.throws(() => parseCatalogSpecificationPresentationProfiles("{"), /InvalidCatalogSpecificationPresentationConfiguration/);
  });
});

describe("Laptop scoped label refinement", () => {
  it("preserves full stored CPU, capacity-only fallbacks, zero, false and historical values", () => {
    const values = [value("cpu", "Intel Core i7-1165G7"), value("memory", "0", "Number"), value("storage", "512", "Number"), value("gpu", "Intel Iris Xe"), value("historical", false, "Boolean")];
    const p = profile(["cpu","memory","storage","gpu"]);
    const labels = [{en:"Processor",ar:"المعالج"},{en:"Memory (RAM)",ar:"الذاكرة (الرام)"},{en:"Storage",ar:"التخزين"},{en:"Graphics (GPU)",ar:"الرسومات (كرت الشاشة)"}];
    const scoped = {...p, fields:p.fields.map((f,i)=>({...f,displayLabel:labels[i]}))};
    const before=JSON.stringify(values);
    const result=run(scoped,values,values.slice(0,4).map(toDefinition));
    assert.equal(JSON.stringify(values),before);
    assert.equal(result.cardSpecifications.length,3);
    assert.deepEqual(result.specifications.map(s=>s.value),values.map(s=>s.value));
    assert.equal(result.specifications[0].value,"Intel Core i7-1165G7");
    assert.equal(result.specifications[1].displayName,"Memory (RAM) / الذاكرة (الرام)");
    assert.equal(result.specifications[3].displayName,"Graphics (GPU) / الرسومات (كرت الشاشة)");
    assert.equal(result.specificationGroups.flatMap(g=>g.specificationDefinitionIds).length,5);
    assert.doesNotMatch(JSON.stringify(result),/DDR|SSD|VRAM|Generation|11th/);
  });
  it("never relabels historical/inapplicable values or a different ProductType", () => {
    const original=value("old","historical");
    const p=profile(["old"]);const scoped={...p,fields:p.fields.map(f=>({...f,displayLabel:{en:"Changed",ar:"معدل"}}))};
    assert.equal(run(scoped,[original],[]).specifications[0],original);
    assert.equal(projectCatalogSpecifications({workspaceId:"workspace-a",productTypeId:"other",specifications:[original],definitions:[],profiles:[scoped]}),null);
  });
  it("validates bilingual configured labels and preserves unconfigured legacy labels", () => {
    const p=profile(["memory"]);
    const valid={...p,fields:p.fields.map(f=>({...f,displayLabel:{en:"Memory (RAM)",ar:"الذاكرة (الرام)"}}))};
    assert.equal(parseCatalogSpecificationPresentationProfiles(JSON.stringify([valid]))[0].fields[0].displayLabel?.en,"Memory (RAM)");
    for(const label of [{en:"Memory",ar:""}, {en:12,ar:"ذاكرة"},null]){
      assert.throws(()=>parseCatalogSpecificationPresentationProfiles(JSON.stringify([{...p,fields:p.fields.map(f=>({...f,displayLabel:label}))}])));
    }
    assert.equal(run(p,[value("memory","16")]).specifications[0].displayName,"memory");
  });
});
