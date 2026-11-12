import { selectPublicShareResource, type PublicShareEligibilityResource } from "../domain/public-product-share-eligibility";
import type { PublicProductShareSpecificationHandoff } from "./public-product-share.types";
export interface PublicShareProjection {
  readonly productName: string;
  readonly retail: { readonly amount: string; readonly currency: string };
  readonly specifications: readonly PublicProductShareSpecificationHandoff[];
  readonly hasMainImage: boolean;
}
export const projectPublicShareResource = (workspaceId: string, resource: PublicShareEligibilityResource) => {
  const selected = selectPublicShareResource(workspaceId, resource);
  if (selected.type !== "Eligible") return selected;
  const specifications: PublicProductShareSpecificationHandoff[] = selected.items.map(({ definition, value }) => ({
    label: definition.displayName, ...(definition.unit === null ? {} : { unit: definition.unit }),
    ...(typeof value === "string" ? { valueType: "Text" as const, value }
      : typeof value === "number" ? { valueType: "Number" as const, value } : { valueType: "Boolean" as const, value }),
  }));
  return { type: "Eligible" as const, projection: {
    productName: selected.productName, retail: selected.retail, specifications, hasMainImage: false,
  } satisfies PublicShareProjection };
};