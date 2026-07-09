import { brands } from "@/domains/catalog/mock/brands";
import { BrandEntity } from "@/domains/catalog/types/brand.entity";
import { IBrandRepository } from "@/domains/catalog/repositories/brand.repository.interface";

export const MockBrandRepository: IBrandRepository = {
  getAll(): BrandEntity[] {
    return brands;
  },

  getActive(): BrandEntity[] {
    return brands.filter((brand) => brand.isActive);
  },

  getByCompanyId(companyId: string): BrandEntity[] {
    return brands.filter(
      (brand) => brand.companyId === companyId && brand.isActive,
    );
  },

  getByWorkspaceId(workspaceId: string): BrandEntity[] {
    return brands.filter(
      (brand) => brand.workspaceId === workspaceId && brand.isActive,
    );
  },

  getById(id: string): BrandEntity | undefined {
    return brands.find((brand) => brand.id === id);
  },
};
