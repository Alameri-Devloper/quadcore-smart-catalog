import { brands } from "@/domains/catalog/mock/brands";
import { BrandEntity } from "@/domains/catalog/types/brand.entity";

export const BrandRepository = {
  getAll(): BrandEntity[] {
    return brands.filter((brand) => brand.isActive);
  },

  getById(id: string): BrandEntity | undefined {
    return brands.find((brand) => brand.id === id);
  },
};
