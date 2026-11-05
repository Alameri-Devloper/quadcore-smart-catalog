import type { CatalogSpecificationProjection } from "./catalog-query";

export interface CatalogSpecificationGroupLabel { readonly en: string; readonly ar: string }
export interface CatalogSpecificationPresentationProfile {
  readonly workspaceId: string;
  readonly productTypeId: string;
  readonly identityModelDefinitionId?: string;
  readonly structuredAliases?: readonly string[];
  readonly structuredDeviceClassAliases?: readonly {readonly phrase:string;readonly value:string}[];
  readonly groups: readonly { readonly id: string; readonly label: CatalogSpecificationGroupLabel }[];
  readonly fields: readonly {
    readonly specificationDefinitionId: string;
    readonly groupId: string;
    readonly displayLabel?: CatalogSpecificationGroupLabel;
    readonly combineWith?: string;
    readonly combineSeparator?: " " | " — ";
    readonly format?: "generation";
    readonly cardPriority?: number;
    readonly importantInDetails: boolean;
    readonly filterable?: boolean;
    readonly structured?: import("./catalog-structured-search").StructuredFieldConfiguration;
  }[];
}
export type CatalogSpecificationDefinitionProjection = Omit<CatalogSpecificationProjection, "value">;
export interface CatalogSpecificationPresentationContext {
  readonly productId: string;
  readonly productTypeId: string | null;
  readonly specifications: readonly CatalogSpecificationProjection[];
  readonly definitions: readonly CatalogSpecificationDefinitionProjection[];
}
export interface CatalogSpecificationGroupProjection {
  readonly id: string;
  readonly label: CatalogSpecificationGroupLabel;
  readonly specificationDefinitionIds: readonly string[];
  readonly missingSpecifications: readonly CatalogSpecificationDefinitionProjection[];
}
