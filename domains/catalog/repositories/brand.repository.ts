import { brands } from "@/domains/catalog/mock/brands";
import { Brand } from "@/domains/catalog/types/brand";

export const BrandRepository = {
  getAll(): Brand[] {
    return brands.filter((brand) => brand.active);
  },

  getById(id: string): Brand | undefined {
    return brands.find((brand) => brand.id === id);
  },
};
