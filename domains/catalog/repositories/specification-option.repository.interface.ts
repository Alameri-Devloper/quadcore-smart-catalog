import type { SpecificationOptionEntity, SpecificationOptionValue } from "@/domains/catalog/types/specification-option.entity";

export interface ISpecificationOptionRepository {
  getActiveByOptionSetId(optionSetId: string, companyId: string, workspaceId: string): SpecificationOptionEntity[];
  getByCode(code: string, companyId: string, workspaceId: string): SpecificationOptionEntity | undefined;
  getByValue(optionSetId: string, value: SpecificationOptionValue, companyId: string, workspaceId: string): SpecificationOptionEntity | undefined;
}
