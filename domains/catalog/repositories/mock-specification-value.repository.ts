import { specificationValues } from "@/domains/catalog/mock/specification-values";
import { SpecificationValueEntity } from "@/domains/catalog/types/specification-value.entity";
import { ISpecificationValueRepository } from "@/domains/catalog/repositories/specification-value.repository.interface";

export const MockSpecificationValueRepository: ISpecificationValueRepository = {
  getAll(): SpecificationValueEntity[] {
    return specificationValues;
  },

  getByWorkspaceId(workspaceId: string): SpecificationValueEntity[] {
    return specificationValues.filter(
      (specificationValue) => specificationValue.workspaceId === workspaceId,
    );
  },

  getByProductId(productId: string): SpecificationValueEntity[] {
    return specificationValues.filter(
      (specificationValue) => specificationValue.productId === productId,
    );
  },

  getBySpecificationFieldId(
    specificationFieldId: string,
  ): SpecificationValueEntity[] {
    return specificationValues.filter(
      (specificationValue) =>
        specificationValue.specificationFieldId === specificationFieldId,
    );
  },

  getByProductIdAndSpecificationFieldId(
    productId: string,
    specificationFieldId: string,
  ): SpecificationValueEntity | undefined {
    return specificationValues.find(
      (specificationValue) =>
        specificationValue.productId === productId &&
        specificationValue.specificationFieldId === specificationFieldId,
    );
  },

  getById(id: string): SpecificationValueEntity | undefined {
    return specificationValues.find(
      (specificationValue) => specificationValue.id === id,
    );
  },
};
