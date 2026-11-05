"use client";
import {useEffect,useLayoutEffect,useRef,useState} from "react";
import {parseSpecificationFilterInput,parseCatalogBrandIds} from "../domain/catalog-specification-filters";
import type {CatalogQueryState} from "./catalog-query-state";
import type {CatalogFilterOptionsView} from "./catalog-presentation.types";
import type {Locale} from "../../../identity/presentation/identity-presentation.types";
import {CatalogFilterPanel} from "./catalog-components";

export function recoverCatalogDialogFocus(dialog:Pick<HTMLDialogElement,"open"|"contains">|null,active:Element|null,focusClose:()=>void):void {
  if(dialog?.open && (!dialog.contains(active)||active?.matches(":disabled")))focusClose();
}
export const CatalogFilters=({state,filterOptions,locale,onChange,onReset,loading=false,failed=false,onRetry}:{readonly state:CatalogQueryState;readonly filterOptions:CatalogFilterOptionsView|null;readonly loading?:boolean;readonly failed?:boolean;readonly onRetry?:()=>void;readonly locale:Locale;readonly onChange:(patch:Partial<CatalogQueryState>)=>void;readonly onReset:()=>void})=>{
  const [mobile,setMobile]=useState(false),[open,setOpen]=useState(false);
  const dialog=useRef<HTMLDialogElement>(null),trigger=useRef<HTMLButtonElement>(null),closeButton=useRef<HTMLButtonElement>(null);
  useEffect(()=>{const media=matchMedia("(max-width: 899px)");const update=()=>setMobile(media.matches);update();media.addEventListener("change",update);return()=>media.removeEventListener("change",update);},[]);
  useEffect(()=>{
    const element=dialog.current;
    if(!mobile || !open){element?.close();return;}
    if(element && !element.open) element.showModal();
    const previous=document.body.style.overflow;document.body.style.overflow="hidden";
    return()=>{document.body.style.overflow=previous;element?.close();};
  },[mobile,open]);
  // The modal shell survives option refreshes. Focus a stable control only when
  // the focused dependent input was removed or disabled by a context transition.
  useLayoutEffect(()=>{
    const element=dialog.current,active=document.activeElement;
    if(mobile && open) recoverCatalogDialogFocus(element,active,()=>closeButton.current?.focus());
  },[mobile,open,filterOptions,loading,failed]);
  const close=()=>{dialog.current?.close();setOpen(false);trigger.current?.focus();};
  const selectedCount=parseSpecificationFilterInput(state.specificationFilters).reduce((n,f)=>n+f.values.length,0)+
    (state.brandIds?parseCatalogBrandIds(state.brandIds).length:state.brandId?1:0);
  const selected=parseSpecificationFilterInput(state.specificationFilters);
  const brands=state.brandIds ? parseCatalogBrandIds(state.brandIds) : state.brandId ? [state.brandId] : [];
  const text=(en:string,ar:string)=>locale==="ar"?ar:en;
  const valueText=(value:string|boolean,unit:string|null)=>typeof value==="boolean"?text(value?"Yes":"No",value?"نعم":"لا"):value+(unit?" "+unit:"");
  const toggle=(id:string,value:string|boolean,unit:string|null)=>{
    const old=selected.find(f=>f.specificationDefinitionId===id);
    const values=old?.values.includes(value)?old.values.filter(v=>v!==value):[...(old?.values??[]),value];
    const next=selected.filter(f=>f.specificationDefinitionId!==id);
    if(values.length)next.push({specificationDefinitionId:id,operator:"IN",values,unit});
    onChange({specificationFilters:next.length?JSON.stringify(next):undefined});
  };
  const content=filterOptions?<>
    {selected.length||brands.length?<section aria-label={text("Selected filters","الفلاتر المختارة")}><h3>{text("Selected filters","الفلاتر المختارة")}</h3>
      {brands.map(id=><button className="text-button catalog-selected-value" key={id} type="button" onClick={()=>{const next=brands.filter(v=>v!==id);onChange({brandId:undefined,brandIds:next.length?JSON.stringify(next):undefined});}}>{text("Remove","حذف")} {filterOptions.brands.find(b=>b.id===id)?.displayName??text("Unavailable value","قيمة غير متاحة")} ×</button>)}
      {selected.flatMap(f=>f.values.map(v=><button className="text-button catalog-selected-value" type="button" key={f.specificationDefinitionId+JSON.stringify(v)} onClick={()=>toggle(f.specificationDefinitionId,v,filterOptions.specificationFilters?.find(d=>d.specificationDefinitionId===f.specificationDefinitionId)?.unit??f.unit??null)}>{text("Remove","حذف")} {filterOptions.specificationFilters?.find(d=>d.specificationDefinitionId===f.specificationDefinitionId)?.displayName.split(" / ")[locale==="ar"?1:0]??text("Specification","مواصفة")}: <bdi dir="auto">{valueText(v,f.unit??null)}</bdi> ×</button>))}
      <button className="button button--secondary" type="button" onClick={()=>onChange({specificationFilters:undefined,brandId:undefined,brandIds:undefined})}>{text("Clear selected values","مسح القيم المختارة")}</button>
    </section>:null}
    <CatalogFilterPanel state={state} filterOptions={filterOptions} locale={locale} onChange={onChange} expanded/>
    <details className="catalog-filter-group" open={brands.length>0}><summary>{text("Brand","الشركة المصنعة")}<span>{brands.length || filterOptions.brands.length}</span></summary><fieldset className="catalog-choice-group"><legend className="sr-only">{text("Brand","الشركة المصنعة")}</legend><div className="catalog-choice-options">{filterOptions.brands.map(b=><label className="catalog-choice" key={b.id}><input type="checkbox" checked={brands.includes(b.id)} disabled={!brands.includes(b.id)&&brands.length>=10} onChange={()=>{const next=brands.includes(b.id)?brands.filter(id=>id!==b.id):[...brands,b.id];onChange({brandId:undefined,brandIds:next.length?JSON.stringify(next):undefined});}}/>{b.displayName}</label>)}</div></fieldset></details>
    {!state.productTypeId?<p>{text("Choose one Product Type for specification filters.","اختر نوع منتج واحداً لمرشحات المواصفات.")}</p>:null}
    {(filterOptions.specificationFilters??[]).map(d=>{
      const chosen=selected.find(f=>f.specificationDefinitionId===d.specificationDefinitionId);
      const labels=d.displayName.split(" / ");
      return <details className="catalog-filter-group" key={d.specificationDefinitionId} open={Boolean(chosen?.values.length)}><summary>{labels[locale==="ar"?1:0]??labels[0]}<span>{chosen?.values.length||d.values.length}</span></summary><fieldset className="catalog-choice-group"><legend className="sr-only">{labels[locale==="ar"?1:0]??labels[0]}</legend><div className="catalog-choice-options">
        {d.values.map(v=><label className="catalog-choice" key={JSON.stringify(v)}><input type="checkbox" checked={chosen?.values.includes(v)??false} disabled={!chosen?.values.includes(v)&&((chosen?.values.length??0)>=10||(!chosen&&selected.length>=8))} onChange={()=>toggle(d.specificationDefinitionId,v,d.unit)}/><bdi dir="auto">{valueText(v,d.unit)}</bdi></label>)}
        {d.values.length===0?<p>{text("No values in this authorized context.","لا توجد قيم ضمن السياق المخول.")}</p>:null}
        {d.truncated?<p>{text("First 100 values shown.","تُعرض أول 100 قيمة.")}</p>:null}
      </div></fieldset></details>;
    })}

  </>:null;
  const clear=<button className="button button--secondary" type="button" disabled={loading||failed||!filterOptions} onClick={()=>{close();onReset();}}>{state.searchMode?text("Clear manual filters","مسح الفلاتر اليدوية"):text("Clear all filters","مسح جميع الفلاتر")}</button>;
  const body=<div className="catalog-filter-content" aria-busy={loading}>
    {loading?<p role="status">{text("Loading filter options…","جارٍ تحميل خيارات الترشيح…")}</p>:failed?<div role="alert"><p>{text("Filter options are unavailable. Retry before changing filters.","خيارات الترشيح غير متاحة. أعد المحاولة قبل تعديل الفلاتر.")}</p><button className="button button--secondary" type="button" onClick={onRetry}>{text("Retry","إعادة المحاولة")}</button></div>:content}
  </div>;
  return <div className="catalog-typed-filters">
    {mobile?<><button className="button button--secondary" ref={trigger} type="button" aria-haspopup="dialog" aria-expanded={open} onClick={()=>setOpen(true)}>{text("Filters","الفلاتر")}{selectedCount?` (${selectedCount})`:""}</button>
      <dialog ref={dialog} className="catalog-filter-dialog" aria-labelledby="catalog-filter-dialog-title" onCancel={event=>{event.preventDefault();close();}}>
        <header className="catalog-filter-dialog__header"><h2 id="catalog-filter-dialog-title">{text("Filters","الفلاتر")}</h2><button ref={closeButton} className="button button--secondary" type="button" autoFocus onClick={close}>{text("Close filters","إغلاق الفلاتر")}</button></header>
        {body}<footer className="catalog-filter-dialog__footer"><span>{text("Selected values","القيم المختارة")}: {selectedCount}</span>{clear}</footer>
      </dialog></>:<aside aria-label={text("Filters","الفلاتر")}>{body}{clear}</aside>}
  </div>;
};
