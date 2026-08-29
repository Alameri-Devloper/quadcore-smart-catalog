import { Suspense } from "react";
import { CatalogPage } from "@/domains/catalog/query/presentation/CatalogPage";

export default function CatalogRoute() {
  return <Suspense fallback={null}><CatalogPage /></Suspense>;
}
