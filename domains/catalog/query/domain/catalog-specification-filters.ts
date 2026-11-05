export interface SpecificationFilterInput {
  readonly specificationDefinitionId: string;
  readonly operator: "EQ" | "IN";
  readonly values: readonly (string | boolean)[];
  readonly unit?: string | null;
}
export interface TypedSpecificationFilter extends SpecificationFilterInput {
  readonly valueType: "Text" | "Number" | "Boolean";
  readonly unit: string | null;
}
export interface SpecificationFilterDefinition {
  readonly specificationDefinitionId: string; readonly displayName: string;
  readonly valueType: "Text" | "Number" | "Boolean"; readonly unit: string | null; readonly sortOrder: number;
}
export interface SpecificationFilterOption extends SpecificationFilterDefinition {
  readonly values: readonly (string | boolean)[]; readonly truncated: boolean;
}
export const canonicalSpecificationNumber = (value: string): string => {
  if(value.length>600 || !/^-?(?:0|[1-9][0-9]*)(?:\.[0-9]+)?(?:[eE][+-]?[0-9]{1,3})?$/.test(value))throw new Error("InvalidSpecificationNumber");
  const negative=value.startsWith("-");
  const [coefficient,exponentText="0"]=value.replace(/^-/,"").toLowerCase().split("e");
  const exponent=Number(exponentText);
  if(Math.abs(exponent)>400)throw new Error("InvalidSpecificationNumber");
  const point=(coefficient.indexOf(".")<0?coefficient.length:coefficient.indexOf("."))+exponent;
  const digits=coefficient.replace(".","");
  let decimal=point<=0 ? "0."+"0".repeat(-point)+digits : point>=digits.length ? digits+"0".repeat(point-digits.length) : digits.slice(0,point)+"."+digits.slice(point);
  decimal=decimal.replace(/^0+(?=[0-9])/,"");
  if(decimal.includes("."))decimal=decimal.replace(/0+$/,"").replace(/\.$/,"");
  return negative && decimal!=="0" ? "-"+decimal : decimal;
};
const id=(v:unknown):string=>{
  if(typeof v!=="string" || !v || v!==v.trim() || v.length>160 || /[\u0000-\u001f\u007f]/u.test(v))throw new Error("InvalidFilterIdentifier");
  return v;
};
export const parseSpecificationFilterInput=(serialized:string|undefined):readonly SpecificationFilterInput[]=>{
  if(serialized===undefined)return [];
  if(typeof serialized!=="string" || serialized.length>8192)throw new Error("InvalidSpecificationFilters");
  const rows:unknown=JSON.parse(serialized);
  if(!Array.isArray(rows)||rows.length>8)throw new Error("InvalidSpecificationFilters");
  const ids=new Set<string>();
  return Object.freeze(rows.map((row:unknown)=>{
    if(!row || typeof row!=="object" || Array.isArray(row))throw new Error("InvalidSpecificationFilter");
    const r=row as Record<string,unknown>;
    if(Object.keys(r).some(k=>!["specificationDefinitionId","operator","values","unit"].includes(k)))throw new Error("InvalidSpecificationFilter");
    const definitionId=id(r.specificationDefinitionId);
    if(ids.has(definitionId) || (r.operator!=="EQ" && r.operator!=="IN") || !Array.isArray(r.values) || r.values.length>10 || (r.operator==="EQ"&&r.values.length!==1))throw new Error("InvalidSpecificationFilter");
    ids.add(definitionId);
    if(r.unit!==undefined && r.unit!==null && (typeof r.unit!=="string"||r.unit.length>40))throw new Error("InvalidSpecificationUnit");
    const values=r.values.map(v=>{
      if(typeof v==="boolean")return v;
      if(typeof v!=="string"||!v || v.length>600 || /[\u0000-\u001f\u007f]/u.test(v))throw new Error("InvalidSpecificationValue");
      return v;
    });
    if(new Set(values.map(v=>JSON.stringify(v))).size!==values.length)throw new Error("DuplicateSpecificationValue");
    return Object.freeze({specificationDefinitionId:definitionId,operator:r.operator as "EQ"|"IN",values:Object.freeze(values),...(Object.hasOwn(r,"unit")?{unit:r.unit as string|null}:{})});
  }).sort((a,b)=>a.specificationDefinitionId.localeCompare(b.specificationDefinitionId)));
};
export const parseCatalogBrandIds=(serialized:string|undefined):readonly string[]=>{
  if(serialized===undefined)return [];
  if(serialized.length>2000)throw new Error("InvalidBrands");
  const values:unknown=JSON.parse(serialized);
  if(!Array.isArray(values)||values.length>10)throw new Error("InvalidBrands");
  const ids=values.map(id);if(new Set(ids).size!==ids.length)throw new Error("DuplicateBrands");
  return Object.freeze(ids.sort());
};
export const resolveTypedSpecificationFilters=(input:readonly SpecificationFilterInput[],definitions:readonly SpecificationFilterDefinition[]):readonly TypedSpecificationFilter[]=>{
  return Object.freeze(input.map(f=>{
    const d=definitions.find(d=>d.specificationDefinitionId===f.specificationDefinitionId);
    if(!d || (f.unit!==undefined&&f.unit!==d.unit))throw new Error("UnapprovedSpecificationFilter");
    const values=f.values.map(v=>{
      if(d.valueType==="Boolean"){if(typeof v!=="boolean")throw new Error("InvalidBoolean");return v;}
      if(typeof v!=="string" || (d.valueType==="Text" && v.length>200))throw new Error("InvalidSpecificationValue");
      return d.valueType==="Number" ? canonicalSpecificationNumber(v) : v;
    }).sort((a,b)=>String(a).localeCompare(String(b)));
    return Object.freeze({...f,unit:d.unit,valueType:d.valueType,values:Object.freeze([...new Set(values)])});
  }).filter(f=>f.values.length));
};
