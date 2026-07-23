import type { ProductClassification } from "../types/product-classification.value-object";
import type {
  CatalogId,
  WorkspaceId,
} from "../types/product-identity.value-object";
import type { ProductPublicationRequirements } from "../types/product-publication-requirements.value-object";

export interface ProductPublicationRequirementsResolver {
  resolve(input: {
    readonly workspaceId: WorkspaceId;
    readonly catalogId: CatalogId;
    readonly classification: ProductClassification | undefined;
  }): Promise<ProductPublicationRequirements>;
}
