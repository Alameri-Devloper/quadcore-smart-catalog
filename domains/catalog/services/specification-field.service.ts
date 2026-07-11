import { MockSpecificationFieldRepository } from "@/domains/catalog/repositories/mock-specification-field.repository";

export const SpecificationFieldService = {
  getSpecificationFields() {
    return MockSpecificationFieldRepository.getActive();
  },

  getSpecificationFieldsByWorkspace(workspaceId: string) {
    return MockSpecificationFieldRepository.getByWorkspaceId(workspaceId);
  },

  getSpecificationFieldById(id: string) {
    return MockSpecificationFieldRepository.getById(id);
  },
};
