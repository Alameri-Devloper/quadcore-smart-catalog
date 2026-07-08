import { Brand } from "@/domains/catalog/types/brand";

export const brands: Brand[] = [
  {
    id: "brand-lenovo",
    companyId: "company-quadcore",
    name: "Lenovo",
    logoUrl: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "brand-hp",
    companyId: "company-quadcore",
    name: "HP",
    logoUrl: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
  {
    id: "brand-dell",
    companyId: "company-quadcore",
    name: "Dell",
    logoUrl: "",
    active: true,
    createdAt: new Date().toISOString(),
  },
];
