import { MockSpecificationOptionSetRepository } from "@/domains/catalog/repositories/mock-specification-option-set.repository";

export const SpecificationOptionSetService = {
  getActiveByWorkspace(companyId: string, workspaceId: string) {
    return MockSpecificationOptionSetRepository.getActiveByWorkspace(companyId, workspaceId);
  },
  getActiveById(id: string, companyId: string, workspaceId: string) {
    const optionSet = MockSpecificationOptionSetRepository.getById(id, companyId, workspaceId);
    return optionSet?.isActive ? optionSet : undefined;
  },
  getActiveByCode(code: string, companyId: string, workspaceId: string) {
    const optionSet = MockSpecificationOptionSetRepository.getByCode(code, companyId, workspaceId);
    return optionSet?.isActive ? optionSet : undefined;
  },
};
