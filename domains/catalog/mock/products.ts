import { Product } from "@/domains/catalog/types/product";

export const products: Product[] = [
  {
    id: 1,
    name: "Lenovo LOQ 15",
    cpu: "Ryzen 7 250",
    ram: "16GB",
    gpu: "RTX 5050",
    price: 870,
    type: "🎮 جيمنج",
  },
  {
    id: 2,
    name: "HP Victus",
    cpu: "Intel i7",
    ram: "16GB",
    gpu: "RTX 4060",
    price: 950,
    type: "🎮 جيمنج",
  },
  {
    id: 3,
    name: "Dell Latitude 7420",
    cpu: "Intel i5",
    ram: "16GB",
    gpu: "Intel UHD",
    price: 600,
    type: "💼 بزنس",
  },
];
