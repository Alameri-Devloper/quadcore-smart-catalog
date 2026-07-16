import { MockSpecificationOptionRepository } from "@/domains/catalog/repositories/mock-specification-option.repository";
import type { SpecificationOptionValue } from "@/domains/catalog/types/specification-option.entity";

export const SpecificationOptionService = {
  getActiveByOptionSetId(optionSetId: string, companyId: string, workspaceId: string) {
    return MockSpecificationOptionRepository.getActiveByOptionSetId(optionSetId, companyId, workspaceId);
  },
  getActiveByValue(optionSetId: string, value: SpecificationOptionValue, companyId: string, workspaceId: string) {
    const option = MockSpecificationOptionRepository.getByValue(optionSetId, value, companyId, workspaceId);
    return option?.isActive ? option : undefined;
  },
};
