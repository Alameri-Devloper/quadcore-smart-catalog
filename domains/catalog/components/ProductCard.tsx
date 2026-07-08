import { Product } from "@/app/domains/catalog/types/product";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="h-40 bg-gray-200 rounded-lg mb-3"></div>

      <h2 className="font-bold text-lg">{product.name}</h2>

      <p className="text-sm text-gray-600">
        {product.cpu} - {product.ram} - {product.gpu}
      </p>

      <p className="mt-2 font-bold text-green-600">${product.price}</p>

      <p className="text-xs text-blue-500 mt-1">{product.type}</p>

      <div className="flex gap-2 mt-3">
        <button className="flex-1 bg-green-500 text-white py-1 rounded">
          واتساب
        </button>

        <button className="flex-1 bg-gray-700 text-white py-1 rounded">
          تعديل
        </button>
      </div>
    </div>
  );
}
