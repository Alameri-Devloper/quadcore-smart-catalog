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

function formatPrice(price: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(price);
}

function formatStatus(status: ProductEntity["status"]) {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

function formatSpecificationValue(value: SpecificationValue) {
  if (typeof value === "boolean") {
    return value ? "Yes" : "No";
  }

  return String(value);
}

export function ProductCard({ product, specifications }: ProductCardProps) {
  return (
    <article className="rounded-lg bg-white p-4 shadow">
      <h2 className="text-lg font-bold text-gray-950">{product.name}</h2>

      <p className="mt-2 text-xl font-bold text-green-700">
        {formatPrice(product.price, product.currency)}
        <span className="ml-2 text-sm font-medium text-gray-500">
          {product.currency}
        </span>
      </p>

      <p className="mt-1 text-sm font-medium text-blue-600">
        {formatStatus(product.status)}
      </p>

      <div className="mt-4 space-y-2">
        {specifications.map((specification) => (
          <p key={specification.id} className="text-sm text-gray-800">
            <span className="font-semibold">{specification.label}:</span>{" "}
            <span>{formatSpecificationValue(specification.value)}</span>
          </p>
        ))}

        {specifications.length === 0 && (
          <p className="text-sm text-gray-500">No specifications available.</p>
        )}
      </div>
    </article>
  );
}
