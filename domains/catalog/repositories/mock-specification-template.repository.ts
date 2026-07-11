import { specificationTemplates } from "@/domains/catalog/mock/specification-templates";
import { ISpecificationTemplateRepository } from "@/domains/catalog/repositories/specification-template.repository.interface";
import { SpecificationTemplateEntity } from "@/domains/catalog/types/specification-template.entity";

export const MockSpecificationTemplateRepository: ISpecificationTemplateRepository =
  {
    getAll(): SpecificationTemplateEntity[] {
      return specificationTemplates;
    },

    getActive(): SpecificationTemplateEntity[] {
      return specificationTemplates.filter(
        (specificationTemplate) => specificationTemplate.isActive,
      );
    },

    getByWorkspaceId(workspaceId: string): SpecificationTemplateEntity[] {
      return specificationTemplates.filter(
        (specificationTemplate) =>
          specificationTemplate.workspaceId === workspaceId &&
          specificationTemplate.isActive,
      );
    },

    getByProductModelId(
      productModelId: string,
    ): SpecificationTemplateEntity | undefined {
      return specificationTemplates.find(
        (specificationTemplate) =>
          specificationTemplate.productModelId === productModelId &&
          specificationTemplate.isActive,
      );
    },

    getById(id: string): SpecificationTemplateEntity | undefined {
      return specificationTemplates.find(
        (specificationTemplate) => specificationTemplate.id === id,
      );
    },
  };
