import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {projectCatalogSpecifications} from "../application/project-catalog-specifications";
import {parseCatalogSpecificationPresentationProfiles} from "../infrastructure/catalog-specification-presentation-config";
import type {CatalogSpecificationProjection} from "../domain/catalog-query";
import type {CatalogSpecificationPresentationProfile} from "../domain/catalog-specification-presentation";
import {formatCatalogSpecification,visibleCatalogSpecifications,catalogProductTitle} from "./catalog-specification-display";
const spec=(id:string,value:string|boolean,type:"Text"|"Number"|"Boolean"="Text",unit:string|null=null):CatalogSpecificationProjection=>({specificationDefinitionId:id,displayName:id,valueType:type,value,unit,sortOrder:0});
const values=[spec("cpu","Intel Core i7-1255U"),spec("ram","0","Number","GB"),spec("ddr","DDR5"),spec("storage","512","Number","GB"),spec("tech","NVMe SSD"),spec("gpu","NVIDIA GeForce RTX 3050"),spec("vram","0","Number","GB"),spec("generation","12","Number"),spec("os","Windows 11 Pro"),spec("model","ThinkPad T14 Gen 3"),spec("historical",false,"Boolean")];
const profile:CatalogSpecificationPresentationProfile={workspaceId:"ws",productTypeId:"laptop",identityModelDefinitionId:"model",groups:[{id:"hardware",label:{en:"Hardware",ar:"العتاد"}}],fields:values.slice(0,-1).map((v)=>({specificationDefinitionId:v.specificationDefinitionId,groupId:"hardware",importantInDetails:false,...({cpu:{cardPriority:1},ram:{cardPriority:2,combineWith:"ddr"},storage:{cardPriority:3,combineWith:"tech"},gpu:{cardPriority:4,combineWith:"vram",combineSeparator:" — " as const},generation:{format:"generation" as const}}[v.specificationDefinitionId]??{})}))};
const project=(stored=values,definitions=values)=>projectCatalogSpecifications({workspaceId:"ws",productTypeId:"laptop",specifications:stored,definitions,profiles:[profile]})!;
describe("Configured laptop composition",()=>{
 it("keeps raw independent values and one slot per pair, with full CPU/model and separate generation",()=>{
  const before=JSON.stringify(values),r=project();assert.equal(JSON.stringify(values),before);assert.equal(r.cardSpecifications.length,3);
  assert.equal(formatCatalogSpecification(r.cardSpecifications[0],"en"),"Intel Core i7-1255U");
  assert.equal(formatCatalogSpecification(r.cardSpecifications[1],"en"),"0 GB DDR5");
  assert.equal(formatCatalogSpecification(r.cardSpecifications[2],"en"),"512 GB NVMe SSD");
  assert.equal(r.modelName,"ThinkPad T14 Gen 3");assert.equal(r.specifications.length,11);
  const visible=visibleCatalogSpecifications(r.specifications);assert.equal(visible.length,8);assert.ok(visible.some(v=>v.value===false));
  assert.equal(formatCatalogSpecification(visible.find(v=>v.specificationDefinitionId==="gpu")!,"en"),"NVIDIA GeForce RTX 3050 — 0 GB");
  assert.equal(formatCatalogSpecification(visible.find(v=>v.specificationDefinitionId==="generation")!,"en"),"12th Gen");
  assert.equal(formatCatalogSpecification(visible.find(v=>v.specificationDefinitionId==="generation")!,"ar"),"الجيل 12");
 });
 it("uses known components only for every missing-component case",()=>{
  const noSecondary=project(values.filter(v=>!["ddr","tech","vram"].includes(v.specificationDefinitionId)));
  assert.equal(formatCatalogSpecification(noSecondary.cardSpecifications[1],"en"),"0 GB");
  const noPrimary=project(values.filter(v=>v.specificationDefinitionId!=="ram"));assert.equal(formatCatalogSpecification(noPrimary.cardSpecifications[1],"en"),"DDR5");
  assert.ok(!noPrimary.cardSpecifications[1].presentation?.component);
 });
 it("does not combine an off-template secondary or lose historical data",()=>{
  const r=project(values,values.filter(v=>v.specificationDefinitionId!=="ddr"));
  assert.equal(r.cardSpecifications[1].presentation,undefined);assert.ok(visibleCatalogSpecifications(r.specifications).some(v=>v.specificationDefinitionId==="ddr"));
  assert.equal(r.specificationGroups.flatMap(g=>g.specificationDefinitionIds).length,values.length);
 });
 it("rejects cross-scope profiles and invalid composition graphs",()=>{
  assert.equal(projectCatalogSpecifications({workspaceId:"foreign",productTypeId:"laptop",specifications:values,definitions:values,profiles:[profile]}),null);
  for(const fields of [
   profile.fields.map(f=>f.specificationDefinitionId==="ram"?{...f,combineWith:"missing"}:f),
   profile.fields.map(f=>f.specificationDefinitionId==="ddr"?{...f,combineWith:"ram"}:f),
   profile.fields.map(f=>f.specificationDefinitionId==="storage"?{...f,combineWith:"ddr"}:f),
  ])assert.throws(()=>parseCatalogSpecificationPresentationProfiles(JSON.stringify([{...profile,fields}])));
 });
 it("formats ordinals accurately without inferring generations from processor/model names",()=>{
  for(const [n,text]of [["11","11th Gen"],["12","12th Gen"],["13","13th Gen"],["21","21st Gen"],["22","22nd Gen"],["23","23rd Gen"],["112","112th Gen"]]){
   assert.equal(formatCatalogSpecification({...spec("g",n,"Number"),presentation:{format:"generation"}},"en"),text);
  }
  assert.equal(formatCatalogSpecification(spec("cpu","Intel Core i7-1255U"),"en"),"Intel Core i7-1255U");
 });
 it("adds only missing authoritative identity components and preserves meaningful original names",()=>{
  const p={productId:"p",productCode:null,productName:"Lenovo ThinkPad T14 Gen 3 / لابتوب لينوفو",classification:{department:null,category:null,productType:null,brand:{id:"brand",displayName:"Lenovo / لينوفو"},condition:null,deviceClass:null,supplyStatus:null},modelName:"ThinkPad T14 Gen 3"};
  assert.equal(catalogProductTitle(p),p.productName);
  assert.equal(catalogProductTitle({...p,productName:null}),"Lenovo / لينوفو · ThinkPad T14 Gen 3");
  assert.equal(catalogProductTitle({...p,modelName:undefined}),p.productName);
 });
});
