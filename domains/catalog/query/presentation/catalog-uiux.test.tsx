import assert from "node:assert/strict";
import {describe,it} from "node:test";
import {renderToStaticMarkup} from "react-dom/server";
import {CatalogFilters,recoverCatalogDialogFocus} from "./catalog-typed-filters";
import {CatalogProductCard,CatalogProductDetailsContent} from "./catalog-components";
import {catalogActiveFilterItems} from "./catalog-active-filters";
import type {CatalogQueryState} from "./catalog-query-state";
import type {CatalogFilterOptionsView,CatalogProductCardView,CatalogProductDetailsView} from "./catalog-presentation.types";
const state:CatalogQueryState={q:"",productTypeId:"type",lifecycle:"Published",sort:"newest"};
const options:CatalogFilterOptionsView={
 departments:[],categories:[],productTypes:[{id:"type",displayName:"Laptop / حاسوب"}],
 brands:[{id:"brand",displayName:"Authorized Brand"}],branches:[{id:"main",displayName:"Authorized Main"}],supplyStatuses:[],enabledConditions:[],enabledCurrencies:[],
 capabilities:{lifecycles:["Published"],listingFilters:[],stockFilters:[],retailPrice:false},
 specificationFilters:[{specificationDefinitionId:"memory",displayName:"Memory / الذاكرة",valueType:"Number",unit:"GB",sortOrder:0,values:["0","16"],truncated:false}]
};
const html=(extra:Partial<Parameters<typeof CatalogFilters>[0]>={})=>renderToStaticMarkup(<CatalogFilters state={state} filterOptions={options} locale="en" onChange={()=>{}} onReset={()=>{}} {...extra}/>);
const product:CatalogProductCardView={productId:"p",productName:"Laptop",productCode:"QA",createdAt:"2026-01-01",updatedAt:"2026-01-01",lifecycle:"Published",classification:{department:null,category:null,productType:null,brand:null,deviceClass:null,condition:null,supplyStatus:null},mainMedia:null,listingStatus:"Listed",cardSpecifications:[
 {specificationDefinitionId:"cpu",displayName:"CPU / المعالج",valueType:"Text",unit:null,value:"Intel Core i7-1255U",sortOrder:0},
 {specificationDefinitionId:"ram",displayName:"RAM / الذاكرة",valueType:"Text",unit:null,value:"16 GB DDR5",sortOrder:1},
 {specificationDefinitionId:"storage",displayName:"Storage / التخزين",valueType:"Text",unit:null,value:"512 GB NVMe SSD",sortOrder:2},
 {specificationDefinitionId:"fourth",displayName:"Fourth",valueType:"Text",unit:null,value:"Not a fourth card slot",sortOrder:3}]};
describe("Phase 4B bounded presentation regressions",()=>{
 for(const locale of ["en","ar"] as const){
  it("hides stale scoped options while loading: "+locale,()=>{const value=html({locale,loading:true});assert.match(value,/aria-busy="true"/);assert.match(value,/role="status"/);assert.doesNotMatch(value,/Authorized Brand|Authorized Main|type="checkbox"/);assert.match(value,/disabled=""/);});
  it("hides stale scoped options after failure with retry: "+locale,()=>{const value=html({locale,failed:true});assert.match(value,/role="alert"/);assert.doesNotMatch(value,/Authorized Brand|Authorized Main|type="checkbox"/);assert.match(value,locale==="ar"?/إعادة المحاولة/u:/Retry/);});
  it("isolates complete technical values without a fourth card slot: "+locale,()=>{const value=renderToStaticMarkup(<CatalogProductCard product={product} queryState={state} locale={locale}/>);for(const text of ["Intel Core i7-1255U","16 GB DDR5","512 GB NVMe SSD"])assert.ok(value.includes('<bdi dir="auto">'+text+"</bdi>"));assert.equal((value.match(/<dt>/g)||[]).length,3);assert.doesNotMatch(value,/Not a fourth card slot|Wholesale|Reference Cost|On hand/);});
 }
 it("does not fabricate filter authority when options have not loaded",()=>{const value=html({filterOptions:null,loading:true});assert.doesNotMatch(value,/catalog-product-type|type="checkbox"/);});
 it("keeps all 100 options, selected values and the ten-value ceiling",()=>{const values=Array.from({length:100},(_,i)=>"value"+i),opts={...options,specificationFilters:[{specificationDefinitionId:"long",displayName:"Long text",valueType:"Text" as const,unit:null,sortOrder:0,values,truncated:true}]};
 const value=html({filterOptions:opts,state:{...state,specificationFilters:JSON.stringify([{specificationDefinitionId:"long",operator:"IN",values:values.slice(0,10),unit:null}])}});assert.equal((value.match(/type="checkbox"/g)||[]).length,101);assert.equal((value.match(/checked=""/g)||[]).length,10);assert.equal((value.match(/disabled=""/g)||[]).length,90);assert.match(value,/First 100 values shown/);});
 it("prevents a ninth criterion without blocking existing criterion values",()=>{const defs=Array.from({length:9},(_,i)=>({specificationDefinitionId:"spec"+i,displayName:"Spec "+i,valueType:"Text" as const,unit:null,sortOrder:i,values:["A","B"],truncated:false}));const selected=defs.slice(0,8).map(d=>({specificationDefinitionId:d.specificationDefinitionId,operator:"IN",values:["A"],unit:null}));const value=html({filterOptions:{...options,specificationFilters:defs},state:{...state,specificationFilters:JSON.stringify(selected)}});assert.equal((value.match(/disabled=""/g)||[]).length,2);assert.equal((value.match(/checked=""/g)||[]).length,8);});
 it("uses trusted active names, preserves zero and never echoes foreign IDs",()=>{const selected={...state,brandIds:JSON.stringify(["brand","foreign-brand-id"]),specificationFilters:JSON.stringify([{specificationDefinitionId:"memory",operator:"IN",values:["0"],unit:"GB"},{specificationDefinitionId:"foreign-spec-id",operator:"IN",values:["private"],unit:null}])};const value=JSON.stringify(catalogActiveFilterItems(selected,options,"ar"));assert.match(value,/Authorized Brand/);assert.match(value,/0 GB/);assert.match(value,/الذاكرة/u);assert.doesNotMatch(value,/foreign-brand-id|foreign-spec-id|private/);});
 it("keeps Details values and media with the commercial summary first",()=>{const details:CatalogProductDetailsView={...product,cardSpecifications:[],media:[{mediaId:"m1",altText:"Main",isMain:true,position:0,downloadUrl:"/api/catalog/products/p/media/m1"},{mediaId:"m2",altText:"Second",isMain:false,position:1,downloadUrl:"/api/catalog/products/p/media/m2"}],specifications:[...product.cardSpecifications!,{specificationDefinitionId:"historical",displayName:"Historical",valueType:"Text",unit:null,value:"Retained historical text",sortOrder:9}],capabilities:{directSharePriceModes:[]}};
 const value=renderToStaticMarkup(<CatalogProductDetailsContent product={details} locale="ar" returnTo="/catalog?q=Lenovo&amp;branchId=main"/>);assert.ok(value.indexOf('id="product-summary-heading"')<value.indexOf('id="product-media-heading"'));assert.match(value,/Retained historical text/);assert.match(value,/m1/);assert.match(value,/m2/);assert.match(value,/Not a fourth card slot/);});
});
describe("Dialog focus recovery guard (unit model, not native browser evidence)",()=>{
 it("restores a stable target after context removal",()=>{let focused=0;recoverCatalogDialogFocus({open:true,contains:()=>false},null,()=>focused++);assert.equal(focused,1);});
 it("does not steal a valid input focus on a normal rerender",()=>{let focused=0;recoverCatalogDialogFocus({open:true,contains:()=>true},{matches:()=>false} as unknown as Element,()=>focused++);assert.equal(focused,0);});
 it("recovers when the old focused input becomes disabled",()=>{let focused=0;recoverCatalogDialogFocus({open:true,contains:()=>true},{matches:()=>true} as unknown as Element,()=>focused++);assert.equal(focused,1);});
 it("does not focus through a closed or unmounted modal",()=>{let focused=0;recoverCatalogDialogFocus({open:false,contains:()=>false},null,()=>focused++);recoverCatalogDialogFocus(null,null,()=>focused++);assert.equal(focused,0);});
});
