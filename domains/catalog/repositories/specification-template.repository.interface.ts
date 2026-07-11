import { SpecificationTemplateEntity } from "@/domains/catalog/types/specification-template.entity";

export interface ISpecificationTemplateRepository {
  getAll(): SpecificationTemplateEntity[];

  getActive(): SpecificationTemplateEntity[];

  getByWorkspaceId(workspaceId: string): SpecificationTemplateEntity[];

  getByCategoryIdAndDeviceClassId(
    categoryId: string,
    deviceClassId?: string,
  ): SpecificationTemplateEntity | undefined;

  getById(id: string): SpecificationTemplateEntity | undefined;
}
