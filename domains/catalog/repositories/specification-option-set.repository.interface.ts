import type { SpecificationOptionSetEntity } from "@/domains/catalog/types/specification-option-set.entity";

export interface ISpecificationOptionSetRepository {
  getById(id: string, companyId: string, workspaceId: string): SpecificationOptionSetEntity | undefined;
  getActiveByWorkspace(companyId: string, workspaceId: string): SpecificationOptionSetEntity[];
  getByCode(code: string, companyId: string, workspaceId: string): SpecificationOptionSetEntity | undefined;
}
