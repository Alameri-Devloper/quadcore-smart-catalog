import { validatePublicShareToken } from "../domain/public-share-values";
import type { PublicShareProjection } from "../application/public-share-projection";
export interface PublicProductShareView {
  readonly productName: string;
  readonly retail: { readonly amount: string; readonly currency: string };
  readonly specifications: readonly { readonly label: string; readonly value: string; readonly unit?: string }[];
  readonly mainImage: { readonly src: string; readonly alt: string } | null;
}
/** Server-only handoff for P7, not a public data endpoint or an SSR page. */
export const publicShareView = (projection: PublicShareProjection, canonicalToken: string, locale: "ar" | "en"): PublicProductShareView | null => {
  try { validatePublicShareToken(canonicalToken); } catch { return null; }
  const specifications = projection.specifications.map(item => ({
    label: item.label,
    value: item.valueType === "Boolean" ? (item.value ? (locale === "ar" ? "نعم" : "Yes") : (locale === "ar" ? "لا" : "No")) : String(item.value),
    ...(item.unit === undefined ? {} : { unit: item.unit }),
  }));
  const bytes = new TextEncoder();
  if (!specifications.length || specifications.length > 64 || specifications.some(item => [...item.value].length > 2048 || bytes.encode(item.value).length > 8192)
    || bytes.encode(JSON.stringify(specifications)).length > 65536) return null;
  return { productName: projection.productName,
    retail: { amount: projection.retail.amount, currency: projection.retail.currency }, specifications,
    mainImage: projection.hasMainImage ? { src: "/share/" + canonicalToken + "/media", alt: projection.productName } : null };
};