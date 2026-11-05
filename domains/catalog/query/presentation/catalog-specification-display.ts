import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import type { CatalogProductCardView, CatalogSpecificationView } from "./catalog-presentation.types";
export const catalogProductTitle = (product: Pick<CatalogProductCardView,"productName"|"productCode"|"productId"|"classification"|"modelName">): string => {
  const original=product.productName ?? "";
  const brand=product.classification.brand?.displayName ?? "";
  const model=product.modelName ?? "";
  const contains=(text:string,part:string) => {
    const escaped=part.replace(/[.*+?^$()|[\]\\]/g,"\\$&");
    return new RegExp("(^|[^\\p{L}\\p{N}])"+escaped+"(?=$|[^\\p{L}\\p{N}])","iu").test(text);
  };
  const brandPresent=brand.split(" / ").filter(Boolean).some(part=>contains(original,part));
  const identity=[brandPresent ? "" : brand,model].filter(Boolean);
  let title=original;
  for(const part of identity)if(!contains(title,part))title=title ? title+" · "+part : part;
  return title || product.productCode || product.productId;
};
const raw = (item: Omit<CatalogSpecificationView,"presentation">,locale:Locale):string => {
  const value=typeof item.value==="boolean" ? (locale==="ar" ? (item.value?"نعم":"لا") : (item.value?"Yes":"No")) : item.value;
  return value+(item.unit ? " "+item.unit : "");
};
export const formatCatalogSpecification = (item:CatalogSpecificationView,locale:Locale):string => {
  if(item.presentation?.format==="generation" && typeof item.value==="string" && item.valueType==="Number" && item.unit===null){
    if(locale==="ar")return "الجيل "+item.value;
    const n=item.value, lastTwo=n.slice(-2), last=n.slice(-1);
    const suffix=/^\d+$/.test(n) && !["11","12","13"].includes(lastTwo) ? (last==="1"?"st":last==="2"?"nd":last==="3"?"rd":"th"):"th";
    return n+(/^\d+$/.test(n)?suffix:"")+" Gen";
  }
  return raw(item,locale)+(item.presentation?.component ? (item.presentation.separator ?? " ")+raw(item.presentation.component,locale) : "");
};
export const visibleCatalogSpecifications = (values:readonly CatalogSpecificationView[]): readonly CatalogSpecificationView[] => {
  const ids=new Set(values.map(v=>v.specificationDefinitionId));
  const hidden=new Set(values.flatMap(v=>v.presentation?.component && ids.has(v.presentation.component.specificationDefinitionId) ? [v.presentation.component.specificationDefinitionId]:[]));
  return values.filter(v=>!hidden.has(v.specificationDefinitionId));
};
