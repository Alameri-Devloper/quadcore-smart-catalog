import { MockSpecificationValueRepository } from "@/domains/catalog/repositories/mock-specification-value.repository";

export const SpecificationValueService = {
  getSpecificationValues() {
    return MockSpecificationValueRepository.getAll();
  },

  getSpecificationValuesByWorkspace(workspaceId: string) {
    return MockSpecificationValueRepository.getByWorkspaceId(workspaceId);
  },

  getSpecificationValuesByProduct(productId: string) {
    return MockSpecificationValueRepository.getByProductId(productId);
  },

  getSpecificationValuesBySpecificationField(specificationFieldId: string) {
    return MockSpecificationValueRepository.getBySpecificationFieldId(
      specificationFieldId,
    );
  },

  getSpecificationValueByProductAndSpecificationField(
    productId: string,
    specificationFieldId: string,
  ) {
    return MockSpecificationValueRepository.getByProductIdAndSpecificationFieldId(
      productId,
      specificationFieldId,
    );
  },

  getSpecificationValueById(id: string) {
    return MockSpecificationValueRepository.getById(id);
  },
};
