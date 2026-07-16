import { specificationOptions } from "@/domains/catalog/mock/specification-options";
import type { ISpecificationOptionRepository } from "./specification-option.repository.interface";

export const MockSpecificationOptionRepository: ISpecificationOptionRepository = {
  getActiveByOptionSetId: (optionSetId, companyId, workspaceId) => specificationOptions.filter((option) => option.specificationOptionSetId === optionSetId && option.companyId === companyId && option.workspaceId === workspaceId && option.isActive).sort((left, right) => left.sortOrder - right.sortOrder),
  getByCode: (code, companyId, workspaceId) => specificationOptions.find((option) => option.code === code && option.companyId === companyId && option.workspaceId === workspaceId),
  getByValue: (optionSetId, value, companyId, workspaceId) => specificationOptions.find((option) => option.specificationOptionSetId === optionSetId && Object.is(option.value, value) && option.companyId === companyId && option.workspaceId === workspaceId),
};
