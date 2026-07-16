import { specificationOptionSets } from "@/domains/catalog/mock/specification-option-sets";
import type { ISpecificationOptionSetRepository } from "./specification-option-set.repository.interface";

export const MockSpecificationOptionSetRepository: ISpecificationOptionSetRepository = {
  getById: (id, companyId, workspaceId) => specificationOptionSets.find((set) => set.id === id && set.companyId === companyId && set.workspaceId === workspaceId),
  getActiveByWorkspace: (companyId, workspaceId) => specificationOptionSets.filter((set) => set.companyId === companyId && set.workspaceId === workspaceId && set.isActive),
  getByCode: (code, companyId, workspaceId) => specificationOptionSets.find((set) => set.code === code && set.companyId === companyId && set.workspaceId === workspaceId),
};
