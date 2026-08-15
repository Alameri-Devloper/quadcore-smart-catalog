import { ProductEntryWizard } from "@/domains/catalog/product-entry/components/ProductEntryWizard";
import { AuthenticatedBoundary } from "@/domains/identity/presentation/components/authenticated-boundary";

interface NewProductPageProps {
  searchParams: Promise<{ submissionId?: string; categoryId?: string; departmentId?: string; deviceClassId?: string; productModelId?: string; brandId?: string }>;
}

export default async function NewProductPage({ searchParams }: NewProductPageProps) {
  const { submissionId, categoryId, departmentId, deviceClassId, productModelId, brandId } = await searchParams;
  return <AuthenticatedBoundary><ProductEntryWizard initialContext={{ categoryId, departmentId, deviceClassId, productModelId, brandId }} submissionId={submissionId} /></AuthenticatedBoundary>;
}
