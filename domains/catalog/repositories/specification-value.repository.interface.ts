import { SpecificationValueEntity } from "@/domains/catalog/types/specification-value.entity";

export interface ISpecificationValueRepository {
  getAll(): SpecificationValueEntity[];

  getByWorkspaceId(workspaceId: string): SpecificationValueEntity[];

  getByProductId(productId: string): SpecificationValueEntity[];

  getBySpecificationFieldId(
    specificationFieldId: string,
  ): SpecificationValueEntity[];

  getByProductIdAndSpecificationFieldId(
    productId: string,
    specificationFieldId: string,
  ): SpecificationValueEntity | undefined;

  getById(id: string): SpecificationValueEntity | undefined;
}
