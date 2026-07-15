"use client";

import { useCallback, useState } from "react";
import { useRouter } from "next/navigation";
import { productEntryWorkflow } from "../product-entry.workflow";
import {
  PRODUCT_ENTRY_STEP_IDS,
  createInitialProductEntryState,
  type ProductEntryWorkflowContext,
} from "../product-entry.types";
import {
  ProductEntryWorkflowProvider,
  useProductEntryWorkflow,
} from "../react/product-entry-workflow-adapter";
import { ProductEntryNavigation } from "./ProductEntryNavigation";
import { ProductEntryProgress } from "./ProductEntryProgress";
import { ProductEntryStepContent } from "./ProductEntryStepContent";
import { ProductEntryWizardHeader } from "./ProductEntryWizardHeader";
import { ProductEntryExitDialog } from "./ProductEntryExitDialog";
import { ProductEntryCompletion } from "./ProductEntryCompletion";

const DEVELOPMENT_CATEGORY_ID = "development-category";
const DEVELOPMENT_DEVICE_CLASS_ID = "development-device-class";
const DEVELOPMENT_PRODUCT_MODEL_ID = "development-product-model";

const DEVELOPMENT_WORKFLOW_CONTEXT: ProductEntryWorkflowContext = {
  categoryRequiresDeviceClass: true,
  compatibleDeviceClassIds: [DEVELOPMENT_DEVICE_CLASS_ID],
  compatibleProductModelIds: [DEVELOPMENT_PRODUCT_MODEL_ID],
  compatibleSpecificationFieldIds: [],
  requiredSpecificationFieldIds: [],
  resolvedProductModelBrandId: undefined,
};

const createDevelopmentProductEntryValues = () => ({
  ...createInitialProductEntryState(),
  categoryId: DEVELOPMENT_CATEGORY_ID,
  deviceClassId: DEVELOPMENT_DEVICE_CLASS_ID,
  productModelId: DEVELOPMENT_PRODUCT_MODEL_ID,
  productName: "Development product",
  price: 0,
  currency: "USD",
  quantity: 0,
  condition: "new",
  availabilityStatus: "available",
});

type ExitDestination = "home" | "cancel";

function ProductEntryWizardSession() {
  const router = useRouter();
  const { isCompleted, isDirty, resetWorkflow } = useProductEntryWorkflow();
  const [exitDestination, setExitDestination] =
    useState<ExitDestination | null>(null);

  const leave = useCallback(() => router.push("/"), [router]);
  const requestExit = (destination: ExitDestination) => {
    if (!isDirty) {
      leave();
      return;
    }

    setExitDestination(destination);
  };

  if (isCompleted) {
    return (
      <ProductEntryCompletion
        onAddAnother={resetWorkflow}
        onBackToCatalog={leave}
        onHome={leave}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <ProductEntryWizardHeader
          onCancel={() => requestExit("cancel")}
          onHome={() => requestExit("home")}
        />
        <ProductEntryProgress />
        <ProductEntryStepContent />
        <ProductEntryNavigation />
      </div>
      {exitDestination ? (
        <ProductEntryExitDialog
          destinationLabel={
            exitDestination === "home" ? "Home" : "the Catalog"
          }
          onContinueEditing={() => setExitDestination(null)}
          onDiscardChanges={leave}
        />
      ) : null}
    </main>
  );
}

export function ProductEntryWizard() {
  return (
    <ProductEntryWorkflowProvider
      context={DEVELOPMENT_WORKFLOW_CONTEXT}
      createInitialValues={createDevelopmentProductEntryValues}
      initialStep={PRODUCT_ENTRY_STEP_IDS.entryMethod}
      workflow={productEntryWorkflow}
    >
      <ProductEntryWizardSession />
    </ProductEntryWorkflowProvider>
  );
}
