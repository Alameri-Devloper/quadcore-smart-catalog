import { SpecificationTemplateFieldEntity } from "@/domains/catalog/types/specification-template-field.entity";

export interface ISpecificationTemplateFieldRepository {
  getAll(): SpecificationTemplateFieldEntity[];

  getActive(): SpecificationTemplateFieldEntity[];

  getByWorkspaceId(workspaceId: string): SpecificationTemplateFieldEntity[];

  getBySpecificationTemplateId(
    specificationTemplateId: string,
  ): SpecificationTemplateFieldEntity[];

  getBySpecificationFieldId(
    specificationFieldId: string,
  ): SpecificationTemplateFieldEntity[];

  getById(id: string): SpecificationTemplateFieldEntity | undefined;
}
