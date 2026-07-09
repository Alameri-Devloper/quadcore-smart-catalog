import { ProductEntity } from "@/domains/catalog/types/product.entity";
import { SpecificationValue } from "@/domains/catalog/types/specification-value.entity";

type ProductSpecificationDisplay = {
  id: string;
  label: string;
  value: SpecificationValue;
};

type ProductCardProps = {
  product: ProductEntity;
  specifications: ProductSpecificationDisplay[];
};

export function ProductCard({ product, specifications }: ProductCardProps) {
  return (
    <div className="bg-white p-4 rounded-xl shadow">
      <div className="h-40 bg-gray-200 rounded-lg mb-3"></div>

      <h2 className="font-bold text-lg">{product.name}</h2>

      <p className="text-sm text-gray-600">{product.description}</p>

      <p className="mt-2 font-bold text-green-600">
        {product.currency} {product.price}
      </p>

      <p className="text-xs text-blue-500 mt-1 capitalize">
        {product.status}
      </p>

      <div className="mt-3 space-y-1">
        {specifications.map((specification) => (
          <div
            key={specification.id}
            className="flex justify-between gap-3 text-sm"
          >
            <span className="text-gray-500">{specification.label}</span>
            <span className="font-medium text-gray-800">
              {String(specification.value)}
            </span>
          </div>
        ))}
      </div>

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
