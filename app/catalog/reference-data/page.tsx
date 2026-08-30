import { Suspense } from "react";
import { CatalogReferenceDataManagementPage } from "@/domains/catalog/reference-data/presentation/CatalogReferenceDataManagementPage";

export default function CatalogReferenceDataRoute() {
  return <Suspense fallback={null}><CatalogReferenceDataManagementPage /></Suspense>;
}
