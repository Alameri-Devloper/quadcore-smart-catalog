import { ProductEntryWizard } from "@/domains/catalog/product-entry/components/ProductEntryWizard";
import { AuthenticatedBoundary } from "@/domains/identity/presentation/components/authenticated-boundary";

interface EditProductPageProps {
  readonly params: Promise<{ readonly productId: string }>;
}

export default async function EditProductPage({ params }: EditProductPageProps) {
  const { productId } = await params;
  return <AuthenticatedBoundary><ProductEntryWizard mode="Edit" productId={productId} /></AuthenticatedBoundary>;
}
