import { ProductEntryWizard } from "@/domains/catalog/product-entry/components/ProductEntryWizard";

interface NewProductPageProps {
  searchParams: Promise<{ categoryId?: string; departmentId?: string; deviceClassId?: string }>;
}

export default async function NewProductPage({ searchParams }: NewProductPageProps) {
  const { categoryId, departmentId, deviceClassId } = await searchParams;
  return <ProductEntryWizard initialContext={{ categoryId, departmentId, deviceClassId }} />;
}
