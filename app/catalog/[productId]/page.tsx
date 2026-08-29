import { CatalogProductDetailsPage } from "@/domains/catalog/query/presentation/CatalogProductDetailsPage";

export default async function CatalogProductRoute({ params, searchParams }: { readonly params: Promise<{ readonly productId: string }>; readonly searchParams: Promise<{ readonly branchId?: string; readonly returnTo?: string }> }) {
  const [{ productId }, query] = await Promise.all([params, searchParams]);
  return <CatalogProductDetailsPage productId={productId} branchId={query.branchId} returnTo={query.returnTo} />;
}
