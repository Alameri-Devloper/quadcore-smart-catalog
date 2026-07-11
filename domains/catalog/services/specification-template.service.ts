import { MockSpecificationFieldRepository } from "@/domains/catalog/repositories/mock-specification-field.repository";
import { MockSpecificationTemplateFieldRepository } from "@/domains/catalog/repositories/mock-specification-template-field.repository";
import { MockSpecificationTemplateRepository } from "@/domains/catalog/repositories/mock-specification-template.repository";

export const SpecificationTemplateService = {
  getTemplateByProductModelId(productModelId: string) {
    return MockSpecificationTemplateRepository.getByProductModelId(
      productModelId,
    );
  },

  getTemplateFields(specificationTemplateId: string) {
    return MockSpecificationTemplateFieldRepository.getBySpecificationTemplateId(
      specificationTemplateId,
    ).sort(
      (currentTemplateField, nextTemplateField) =>
        currentTemplateField.sortOrder - nextTemplateField.sortOrder,
    );
  },

  getFieldsByProductModelId(productModelId: string) {
    const specificationTemplate =
      MockSpecificationTemplateRepository.getByProductModelId(productModelId);

    if (!specificationTemplate) {
      return [];
    }

    return MockSpecificationTemplateFieldRepository.getBySpecificationTemplateId(
      specificationTemplate.id,
    )
      .sort(
        (currentTemplateField, nextTemplateField) =>
          currentTemplateField.sortOrder - nextTemplateField.sortOrder,
      )
      .map((specificationTemplateField) =>
        MockSpecificationFieldRepository.getById(
          specificationTemplateField.specificationFieldId,
        ),
      )
      .filter((specificationField) => specificationField !== undefined);
  },
};
