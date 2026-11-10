import type {CatalogSpecificationPresentationProfile} from "./catalog-specification-presentation";
import {canonicalSpecificationNumber,parseCatalogBrandIds,parseSpecificationFilterInput,resolveTypedSpecificationFilters,type SpecificationFilterDefinition,type SpecificationFilterInput} from "./catalog-specification-filters";
export interface StructuredFieldConfiguration {
  readonly aliases:readonly string[]; readonly unitAliases:readonly string[];
  readonly valueAliases:readonly {readonly phrase:string;readonly value:string|boolean}[];
  readonly ordinal:boolean; readonly unitOnly:boolean;
}
export interface StructuredInterpretation {
  readonly productTypeId?:string;
  readonly rows:readonly {readonly kind:"ProductType"|"Brand"|"DeviceClass"|"Specification";readonly displayName?:string;readonly values:readonly (string|boolean)[];readonly unit:string|null}[];
}
interface Reference {readonly id:string;readonly displayName:string}
export interface StructuredContext {
  readonly query:string; readonly selectedProductTypeId?:string;
  readonly profiles:readonly CatalogSpecificationPresentationProfile[];
  readonly productTypes:readonly Reference[];readonly brands:readonly Reference[];
  readonly definitions:readonly SpecificationFilterDefinition[];
}
export interface ParsedStructuredSearch {
  readonly productTypeId?:string;readonly brandId?:string;readonly deviceClass?:string;
  readonly criteria:readonly SpecificationFilterInput[];
}
export const normalizeStructuredPhrase=(text:string):string=>text.normalize("NFKC").replace(/[٠-٩۰-۹]/gu,ch=>String("٠١٢٣٤٥٦٧٨٩".includes(ch)?"٠١٢٣٤٥٦٧٨٩".indexOf(ch):"۰۱۲۳۴۵۶۷۸۹".indexOf(ch))).toLowerCase().trim().replace(/\s+/gu," ");
const escape=(text:string)=>text.replace(/[.*+?^$()|[\]\\]/g,"\\$&").replace(/ /g,"\\s+");
const phrasePattern=(phrase:string)=>escape(normalizeStructuredPhrase(phrase));
const end="(?=$|[\\s,،;])";
const boundary="(?:^|[\\s,،;])";
const hasPhrase=(query:string,phrase:string)=>new RegExp(boundary+phrasePattern(phrase)+end,"u").test(query);
export const selectStructuredProductType=(query:string,selected:string|undefined,profiles:readonly CatalogSpecificationPresentationProfile[],productTypes:readonly Reference[]):string|undefined=>{
  const normalized=normalizeStructuredPhrase(query);
  const configured=profiles.filter(p=>productTypes.some(t=>t.id===p.productTypeId));
  const mentions=configured.flatMap(p=>(p.structuredAliases??[]).filter(a=>hasPhrase(normalized,a)).map(a=>({id:p.productTypeId,alias:normalizeStructuredPhrase(a)})));
  // A generic alias embedded in a longer explicit alias must not create ambiguity.
  const longest=mentions.filter(m=>!mentions.some(n=>n.alias.length>m.alias.length && hasPhrase(n.alias,m.alias)));
  const ids=[...new Set(longest.map(m=>m.id))];
  if(selected){
    if(!configured.some(p=>p.productTypeId===selected))throw new Error("StructuredTypeNotConfigured");
    if(ids.length && !ids.includes(selected))throw new Error("ConflictingProductType");
    if(ids.some(id=>id!==selected) && !longest.some(m=>m.id===selected))throw new Error("ConflictingProductType");
    return selected;
  }
  if(ids.length>1)throw new Error("SelectOneProductType");
  return ids[0];
};
type Atom={readonly kind:"ProductType"|"Brand"|"DeviceClass"|"Specification";readonly id:string;readonly value:string|boolean;readonly unit?:string|null};
type Pattern={readonly regex:RegExp;readonly atom:(match:RegExpExecArray)=>Atom};
const ordinalSuffix=(number:string)=>["11","12","13"].includes(number.slice(-2))?"th":number.endsWith("1")?"st":number.endsWith("2")?"nd":number.endsWith("3")?"rd":"th";
export const interpretStructuredSearch=(context:StructuredContext):ParsedStructuredSearch=>{
  const query=normalizeStructuredPhrase(context.query);
  if(!query || context.query.length>200)throw new Error("InvalidStructuredPhrase");
  const typeId=selectStructuredProductType(context.query,context.selectedProductTypeId,context.profiles,context.productTypes);
  const profile=context.profiles.find(p=>p.productTypeId===typeId);
  const patterns:Pattern[]=[];
  const literal=(phrase:string,atom:Atom)=>patterns.push({regex:new RegExp("^"+phrasePattern(phrase)+end,"u"),atom:()=>atom});
  for(const brand of context.brands)for(const phrase of brand.displayName.split(" / ").filter(Boolean))literal(phrase,{kind:"Brand",id:brand.id,value:brand.id});
  const typeAliases=typeId ? context.profiles.filter(p=>p.productTypeId===typeId) : context.profiles;
  for(const p of typeAliases)for(const alias of p.structuredAliases??[])literal(alias,{kind:"ProductType",id:p.productTypeId,value:p.productTypeId});
  for(const p of typeAliases)for(const alias of p.structuredDeviceClassAliases??[])literal(alias.phrase,{kind:"DeviceClass",id:alias.value,value:alias.value});
  for(const field of profile?.fields??[]){
    if(field.filterable!==true || !field.structured)continue;
    const definition=context.definitions.find(d=>d.specificationDefinitionId===field.specificationDefinitionId);
    if(!definition)continue;
    const config=field.structured;
    if(definition.unit===null && (config.unitAliases.length || config.unitOnly))throw new Error("InvalidStructuredUnitConfiguration");
    const atom=(value:string|boolean):Atom=>{
      if(definition.valueType==="Boolean" ? typeof value!=="boolean" : typeof value!=="string")throw new Error("InvalidStructuredValueConfiguration");
      const canonical=definition.valueType==="Number"?canonicalSpecificationNumber(String(value)):value;
      return {kind:"Specification",id:definition.specificationDefinitionId,value:canonical,unit:definition.unit};
    };
    for(const alias of config.valueAliases){
      const value=atom(alias.value);literal(alias.phrase,value);
      for(const name of config.aliases)literal(name+" "+alias.phrase,value);
    }
    if(definition.valueType!=="Number")continue;
    const number="(-?(?:[0-9]+(?:[.][0-9]+)?)(?:e[+-]?[0-9]{1,3})?)";
    const unitNames=[...new Set([...(definition.unit?[definition.unit]:[]),...config.unitAliases].map(normalizeStructuredPhrase))];
    const unit=unitNames.length?"(?:"+unitNames.map(escape).join("|")+")":"";
    const read=(match:RegExpExecArray):Atom=>{
      if(match[2] && match[2]!==ordinalSuffix(match[1]))throw new Error("InvalidOrdinal");
      return atom(match[1]);
    };
    for(const name of config.aliases){
      patterns.push({regex:new RegExp("^"+phrasePattern(name)+"\\s*[:=]?\\s*"+number+(unit?"(?:\\s*"+unit+")?":"")+end,"u"),atom:read});
      patterns.push({regex:new RegExp("^"+number+(config.ordinal?"(st|nd|rd|th)?":"")+(unit?"(?:\\s*"+unit+")?":"")+"\\s+"+phrasePattern(name)+end,"u"),atom:read});
    }
    if(config.unitOnly && unit)patterns.push({regex:new RegExp("^"+number+"\\s*"+unit+end,"u"),atom:read});
  }
  const atoms:Atom[]=[];let remaining=query;
  while(remaining){
    remaining=remaining.replace(/^[\s,،;]+/u,"");
    if(!remaining)break;
    const connector=/^(?:and|و)(?=$|\s)\s*/u.exec(remaining);
    if(connector){if(!atoms.length || connector[0].length===remaining.length)throw new Error("IncompleteStructuredPhrase");remaining=remaining.slice(connector[0].length);continue;}
    const matches=patterns.flatMap(pattern=>{const match=pattern.regex.exec(remaining);return match?[{length:match[0].length,atom:pattern.atom(match)}]:[];});
    if(!matches.length)throw new Error("UnrecognizedStructuredPhrase");
    const length=Math.max(...matches.map(m=>m.length));
    const best=matches.filter(m=>m.length===length);
    if(new Set(best.map(m=>JSON.stringify(m.atom))).size!==1)throw new Error("AmbiguousStructuredPhrase");
    atoms.push(best[0].atom);remaining=remaining.slice(length);
  }
  if(!atoms.length)throw new Error("UnrecognizedStructuredPhrase");
  let brandId:string|undefined,deviceClass:string|undefined;
  const values=new Map<string,SpecificationFilterInput>();
  for(const atom of atoms){
    if(atom.kind==="ProductType"){if(typeId!==atom.id)throw new Error("ConflictingProductType");}
    if(atom.kind==="Brand"){if(brandId&&brandId!==atom.id)throw new Error("ConflictingBrand");brandId=atom.id;}
    if(atom.kind==="DeviceClass"){if(deviceClass&&deviceClass!==atom.id)throw new Error("ConflictingDeviceClass");deviceClass=atom.id;}
    if(atom.kind==="Specification"){
      const previous=values.get(atom.id);
      if(previous && previous.values[0]!==atom.value)throw new Error("ConflictingSpecification");
      values.set(atom.id,{specificationDefinitionId:atom.id,operator:"EQ",values:[atom.value],unit:atom.unit??null});
    }
  }
  if(values.size && !typeId)throw new Error("SelectOneProductType");
  if(values.size>8)throw new Error("TooManyStructuredCriteria");
  return Object.freeze({...(typeId?{productTypeId:typeId}:{}),...(brandId?{brandId}:{}),...(deviceClass?{deviceClass}:{}),criteria:Object.freeze([...values.values()])});
};
export const mergeStructuredConstraints=(manual:{readonly brandId?:string;readonly brandIds?:string;readonly deviceClass?:string;readonly specificationFilters?:string},parsed:ParsedStructuredSearch,definitions:readonly SpecificationFilterDefinition[])=>{
  if(manual.brandId!==undefined && manual.brandIds!==undefined)throw new Error("ConflictingBrands");
  const brands=manual.brandIds===undefined?(manual.brandId?[manual.brandId]:[]):parseCatalogBrandIds(manual.brandIds);
  if(parsed.brandId && brands.length && !brands.includes(parsed.brandId))throw new Error("ConflictingBrand");
  if(parsed.deviceClass && manual.deviceClass && parsed.deviceClass!==manual.deviceClass)throw new Error("ConflictingDeviceClass");
  const criteria=new Map(resolveTypedSpecificationFilters(parseSpecificationFilterInput(manual.specificationFilters),definitions).map(f=>[f.specificationDefinitionId,{specificationDefinitionId:f.specificationDefinitionId,operator:"IN" as const,values:f.values,unit:f.unit}]));
  for(const clause of parsed.criteria){
    const old=criteria.get(clause.specificationDefinitionId);
    const values=old?old.values.filter(v=>clause.values.includes(v)):clause.values;
    if(!values.length)throw new Error("ConflictingSpecification");
    criteria.set(clause.specificationDefinitionId,{specificationDefinitionId:clause.specificationDefinitionId,operator:"IN",values,unit:clause.unit??null});
  }
  const serialized=JSON.stringify([...criteria.values()]);
  parseSpecificationFilterInput(serialized);
  return {productTypeId:parsed.productTypeId,...(parsed.brandId?{brandId:parsed.brandId,brandIds:undefined}:{}),...(parsed.deviceClass?{deviceClass:parsed.deviceClass}:{}),specificationFilters:serialized};
};
export const describeStructuredSearch=(parsed:ParsedStructuredSearch,definitions:readonly SpecificationFilterDefinition[],types:readonly Reference[],brands:readonly Reference[]):StructuredInterpretation=>{
  const rows:StructuredInterpretation["rows"][number][]=[];
  const productType=types.find(t=>t.id===parsed.productTypeId),brand=brands.find(b=>b.id===parsed.brandId);
  if(productType)rows.push({kind:"ProductType",values:[productType.displayName],unit:null});
  if(brand)rows.push({kind:"Brand",values:[brand.displayName],unit:null});
  if(parsed.deviceClass)rows.push({kind:"DeviceClass",values:[parsed.deviceClass],unit:null});
  for(const criterion of parsed.criteria){const definition=definitions.find(d=>d.specificationDefinitionId===criterion.specificationDefinitionId);if(!definition)throw new Error("InvalidStructuredBinding");rows.push({kind:"Specification",displayName:definition.displayName,values:criterion.values,unit:definition.unit});}
  return Object.freeze({...(parsed.productTypeId?{productTypeId:parsed.productTypeId}:{}),rows:Object.freeze(rows)});
};
