import {normalizeStructuredPhrase,type StructuredFieldConfiguration} from "../domain/catalog-structured-search";
import type { CatalogSpecificationPresentationProfile } from "../domain/catalog-specification-presentation";
import { validateCatalogId } from "../domain/catalog-query";

const invalid = (): never => { throw new Error("InvalidCatalogSpecificationPresentationConfiguration"); };
const record = (value: unknown): Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : invalid();
const text = (value: unknown): string => typeof value === "string" && value.trim() !== "" && value === value.trim() ? value : invalid();
const id = (value: unknown): string => { const result = text(value); try { validateCatalogId(result); } catch { return invalid(); } return result; };
const array = (value: unknown): readonly unknown[] => Array.isArray(value) ? value : invalid();


const aliases=(value:unknown,maximum=12):readonly string[]=>{
  const values=array(value);
  if(values.length>maximum)return invalid();
  const result=values.map(v=>text(v));
  const normalized=result.map(normalizeStructuredPhrase);
  if(result.some((v,i)=>v.length>80 || !/\p{L}/u.test(normalized[i]) || ["and","و"].includes(normalized[i])) || new Set(normalized).size!==result.length)return invalid();
  return Object.freeze(result);
};
const structuredField=(value:unknown):StructuredFieldConfiguration=>{
  const item=record(value);
  if(Object.keys(item).some(k=>!["aliases","unitAliases","valueAliases","ordinal","unitOnly"].includes(k)))return invalid();
  if(item.ordinal!==undefined && typeof item.ordinal!=="boolean")return invalid();
  if(item.unitOnly!==undefined && typeof item.unitOnly!=="boolean")return invalid();
  const rows=array(item.valueAliases??[]);
  if(rows.length>32)return invalid();
  const seen=new Set<string>();
  const valueAliases=rows.map(v=>{
    const row=record(v),phrase=aliases([row.phrase],1)[0];
    const normalized=normalizeStructuredPhrase(phrase);
    if(seen.has(normalized) || (typeof row.value!=="string"&&typeof row.value!=="boolean") || (typeof row.value==="string"&&(!row.value || row.value.length>200)))return invalid();
    seen.add(normalized);
    return Object.freeze({phrase,value:row.value as string|boolean});
  });
  return Object.freeze({aliases:aliases(item.aliases??[],8),unitAliases:aliases(item.unitAliases??[],8),valueAliases:Object.freeze(valueAliases),ordinal:item.ordinal===true,unitOnly:item.unitOnly===true});
};

/** Trusted server configuration only; no request parameter can choose or replace profiles. */
export const parseCatalogSpecificationPresentationProfiles = (serialized: string | undefined): readonly CatalogSpecificationPresentationProfile[] => {
  if (serialized === undefined || serialized.trim() === "") return Object.freeze([]);
  let parsed: unknown;
  try { parsed = JSON.parse(serialized); } catch { return invalid(); }
  const scopes = new Set<string>();
  return Object.freeze(array(parsed).map((value): CatalogSpecificationPresentationProfile => {
    const item = record(value), workspaceId = id(item.workspaceId), productTypeId = id(item.productTypeId);
    const scope = JSON.stringify([workspaceId, productTypeId]);
    if (scopes.has(scope)) return invalid();
    scopes.add(scope);
    const groupIds = new Set<string>();
    const groups = array(item.groups).map((value) => {
      const group = record(value), groupId = id(group.id), label = record(group.label);
      if (groupId === "additional-stored" || groupIds.has(groupId)) return invalid();
      groupIds.add(groupId);
      return Object.freeze({ id: groupId, label: Object.freeze({ en: text(label.en), ar: text(label.ar) }) });
    });
    const fieldsSeen = new Set<string>(), priorities = new Set<number>();
    const fields = array(item.fields).map((value) => {
      const field = record(value), specificationDefinitionId = id(field.specificationDefinitionId), groupId = id(field.groupId);
      if (fieldsSeen.has(specificationDefinitionId) || !groupIds.has(groupId) || typeof field.importantInDetails !== "boolean") return invalid();
      fieldsSeen.add(specificationDefinitionId);
      if(field.filterable !== undefined && typeof field.filterable !== "boolean") return invalid();
      const priority = field.cardPriority;
      if (priority !== undefined && (typeof priority !== "number" || !Number.isSafeInteger(priority) || priority < 1 || priorities.has(priority))) return invalid();
      if (priority !== undefined) priorities.add(priority as number);
      const label = field.displayLabel === undefined ? undefined : record(field.displayLabel);
      const displayLabel = label ? Object.freeze({ en: text(label.en), ar: text(label.ar) }) : undefined;
      if (field.format !== undefined && field.format !== "generation") return invalid();
      if (field.combineSeparator !== undefined && ![" ", " — "].includes(String(field.combineSeparator))) return invalid();
      return Object.freeze({ specificationDefinitionId, groupId, ...(field.structured===undefined?{}:{structured:structuredField(field.structured)}), ...(field.filterable === undefined ? {} : {filterable:field.filterable}), ...(displayLabel ? { displayLabel } : {}), ...(field.combineWith !== undefined ? { combineWith: id(field.combineWith), combineSeparator: (field.combineSeparator ?? " ") as " " | " — " } : {}), ...(field.format ? { format: "generation" as const } : {}), importantInDetails: field.importantInDetails, ...(priority !== undefined ? { cardPriority: priority as number } : {}) });
    });
    const consumed = new Set<string>();
    for (const field of fields) if (field.combineWith) {
      const secondary = fields.find((f) => f.specificationDefinitionId === field.combineWith);
      if (!secondary || secondary === field || secondary.combineWith || secondary.cardPriority !== undefined || consumed.has(field.combineWith)) return invalid();
      consumed.add(field.combineWith);
    }
    const identityModelDefinitionId = item.identityModelDefinitionId === undefined ? undefined : id(item.identityModelDefinitionId);
    if (identityModelDefinitionId && !fieldsSeen.has(identityModelDefinitionId)) return invalid();
    const structuredAliases=item.structuredAliases===undefined?undefined:aliases(item.structuredAliases);
    const structuredDeviceClassAliases=item.structuredDeviceClassAliases===undefined?undefined:array(item.structuredDeviceClassAliases).map(v=>{const a=record(v);if(!["personal","business","gaming","workstation"].includes(typeof a.value==="string"?a.value:""))return invalid();return Object.freeze({phrase:aliases([a.phrase],1)[0],value:a.value as string});});
    if(structuredDeviceClassAliases && structuredDeviceClassAliases.length>8)return invalid();
    return Object.freeze({ workspaceId, productTypeId, ...(structuredAliases?{structuredAliases}:{}),...(structuredDeviceClassAliases?{structuredDeviceClassAliases:Object.freeze(structuredDeviceClassAliases)}:{}), ...(identityModelDefinitionId ? { identityModelDefinitionId } : {}), groups: Object.freeze(groups), fields: Object.freeze(fields) });
  }));
};
