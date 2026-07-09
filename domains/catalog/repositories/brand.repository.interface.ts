import { BrandEntity } from "@/domains/catalog/types/brand.entity";

export interface IBrandRepository {
  getAll(): BrandEntity[];

  getActive(): BrandEntity[];

  getByCompanyId(companyId: string): BrandEntity[];

  getByWorkspaceId(workspaceId: string): BrandEntity[];

  getById(id: string): BrandEntity | undefined;
}
