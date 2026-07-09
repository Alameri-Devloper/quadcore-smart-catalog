import { specificationFields } from "@/domains/catalog/mock/specification-fields";
import { SpecificationFieldEntity } from "@/domains/catalog/types/specification-field.entity";
import { ISpecificationFieldRepository } from "@/domains/catalog/repositories/specification-field.repository.interface";

export const MockSpecificationFieldRepository: ISpecificationFieldRepository = {
  getAll(): SpecificationFieldEntity[] {
    return specificationFields;
  },

  getActive(): SpecificationFieldEntity[] {
    return specificationFields.filter(
      (specificationField) => specificationField.isActive,
    );
  },

  getByWorkspaceId(workspaceId: string): SpecificationFieldEntity[] {
    return specificationFields.filter(
      (specificationField) =>
        specificationField.workspaceId === workspaceId &&
        specificationField.isActive,
    );
  },

  getByProductModelId(productModelId: string): SpecificationFieldEntity[] {
    return specificationFields.filter(
      (specificationField) =>
        specificationField.productModelId === productModelId &&
        specificationField.isActive,
    );
  },

  getFilterableByProductModelId(
    productModelId: string,
  ): SpecificationFieldEntity[] {
    return specificationFields.filter(
      (specificationField) =>
        specificationField.productModelId === productModelId &&
        specificationField.isFilterable &&
        specificationField.isActive,
    );
  },

  getById(id: string): SpecificationFieldEntity | undefined {
    return specificationFields.find(
      (specificationField) => specificationField.id === id,
    );
  },
};
