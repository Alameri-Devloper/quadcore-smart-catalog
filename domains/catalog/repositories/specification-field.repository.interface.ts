import { SpecificationFieldEntity } from "@/domains/catalog/types/specification-field.entity";

export interface ISpecificationFieldRepository {
  getAll(): SpecificationFieldEntity[];

  getActive(): SpecificationFieldEntity[];

  getByWorkspaceId(workspaceId: string): SpecificationFieldEntity[];

  getById(id: string): SpecificationFieldEntity | undefined;
}
