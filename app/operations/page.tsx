import { Suspense } from "react";
import { OperationsPage } from "@/domains/workspace/branches/presentation/OperationsPage";

export default function OperationsRoute() {
  return <Suspense fallback={null}><OperationsPage /></Suspense>;
}
