import { MockSpecificationFieldRepository } from "@/domains/catalog/repositories/mock-specification-field.repository";
import { MockSpecificationTemplateFieldRepository } from "@/domains/catalog/repositories/mock-specification-template-field.repository";
import { MockSpecificationTemplateRepository } from "@/domains/catalog/repositories/mock-specification-template.repository";
import { SpecificationFieldEntity } from "@/domains/catalog/types/specification-field.entity";

function isSpecificationField(
  specificationField: SpecificationFieldEntity | undefined,
): specificationField is SpecificationFieldEntity {
  return specificationField !== undefined;
}

export const SpecificationTemplateService = {
  getTemplate(categoryId: string, deviceClassId?: string) {
    return MockSpecificationTemplateRepository.getByCategoryIdAndDeviceClassId(
      categoryId,
      deviceClassId,
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

  getFields(categoryId: string, deviceClassId?: string) {
    const specificationTemplate =
      MockSpecificationTemplateRepository.getByCategoryIdAndDeviceClassId(
        categoryId,
        deviceClassId,
      );

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
      .filter(isSpecificationField);
  },
};
