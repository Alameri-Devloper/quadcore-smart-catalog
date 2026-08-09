import { ProductEntryWizard } from "@/domains/catalog/product-entry/components/ProductEntryWizard";

interface EditProductPageProps {
  readonly params: Promise<{ readonly productId: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;
  return <ProductEntryWizard mode="Edit" productId={productId} />;
}
