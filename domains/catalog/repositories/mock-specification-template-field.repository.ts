import { specificationTemplateFields } from "@/domains/catalog/mock/specification-template-fields";
import { ISpecificationTemplateFieldRepository } from "@/domains/catalog/repositories/specification-template-field.repository.interface";
import { SpecificationTemplateFieldEntity } from "@/domains/catalog/types/specification-template-field.entity";

export const MockSpecificationTemplateFieldRepository: ISpecificationTemplateFieldRepository =
  {
    getAll(): SpecificationTemplateFieldEntity[] {
      return specificationTemplateFields;
    },

    getActive(): SpecificationTemplateFieldEntity[] {
      return specificationTemplateFields.filter(
        (specificationTemplateField) => specificationTemplateField.isActive,
      );
    },

    getByWorkspaceId(workspaceId: string): SpecificationTemplateFieldEntity[] {
      return specificationTemplateFields.filter(
        (specificationTemplateField) =>
          specificationTemplateField.workspaceId === workspaceId &&
          specificationTemplateField.isActive,
      );
    },

    getBySpecificationTemplateId(
      specificationTemplateId: string,
    ): SpecificationTemplateFieldEntity[] {
      return specificationTemplateFields.filter(
        (specificationTemplateField) =>
          specificationTemplateField.specificationTemplateId ===
            specificationTemplateId && specificationTemplateField.isActive,
      );
    },

    getBySpecificationFieldId(
      specificationFieldId: string,
    ): SpecificationTemplateFieldEntity[] {
      return specificationTemplateFields.filter(
        (specificationTemplateField) =>
          specificationTemplateField.specificationFieldId ===
            specificationFieldId && specificationTemplateField.isActive,
      );
    },

    getById(id: string): SpecificationTemplateFieldEntity | undefined {
      return specificationTemplateFields.find(
        (specificationTemplateField) => specificationTemplateField.id === id,
      );
    },
  };
