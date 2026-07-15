"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { ProductEntryResumeDialog } from "./ProductEntryResumeDialog";
import { ProductEntryDraftService } from "../drafts/product-entry-draft.service";
import { BrowserProductEntryDraftRepository } from "../drafts/infrastructure/browser-product-entry-draft.repository";
import type { ProductEntryDraft } from "../drafts/product-entry-draft.entity";
import { PRODUCT_ENTRY_DEVELOPMENT_SCOPE } from "../product-entry.development-config";

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

function ProductEntryWizardSession() {
  const router = useRouter();
  const workflow = useProductEntryWorkflow();
  const draftService = useMemo(
    () => new ProductEntryDraftService(new BrowserProductEntryDraftRepository()),
    [],
  );
  const [activeDraft, setActiveDraft] = useState<ProductEntryDraft | null>(null);
  const [resumeDraft, setResumeDraft] = useState<ProductEntryDraft | null>(null);
  const [showCancel, setShowCancel] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isWorking, setIsWorking] = useState(false);
  const previousStepRef = useRef(workflow.currentStepId);
  const initializedRef = useRef(false);

  const leave = useCallback((saved = false) => {
    router.push(saved ? "/?productEntryDraft=saved" : "/");
  }, [router]);
  const saveDraft = useCallback(async () => {
    if (!workflow.currentStepId) throw new Error("The current workflow step is unavailable.");
    const saved = await draftService.saveActive({
      existingDraft: activeDraft,
      scope: PRODUCT_ENTRY_DEVELOPMENT_SCOPE,
      values: workflow.values,
      currentStepId: workflow.currentStepId,
      completedStepIds: workflow.completedSteps.map((step) => step.id),
    });
    setActiveDraft(saved);
    return saved;
  }, [activeDraft, draftService, workflow.completedSteps, workflow.currentStepId, workflow.values]);

  useEffect(() => {
    void draftService.findActive(PRODUCT_ENTRY_DEVELOPMENT_SCOPE)
      .then((draft) => { setResumeDraft(draft); initializedRef.current = true; })
      .catch(() => setError("The saved Draft could not be loaded. Start a new Product or try again."));
  }, [draftService]);

  useEffect(() => {
    if (!initializedRef.current || resumeDraft || !workflow.currentStepId) return;
    if (previousStepRef.current !== workflow.currentStepId) {
      previousStepRef.current = workflow.currentStepId;
      void saveDraft().catch(() => setError("The Draft could not be saved after moving steps. Your work remains open."));
    }
  }, [resumeDraft, saveDraft, workflow.currentStepId]);

  useEffect(() => {
    if (!workflow.isCompleted || !activeDraft) return;
    void draftService.delete(activeDraft.id).then(() => setActiveDraft(null)).catch(() => setError("The completed Draft could not be removed from browser storage."));
  }, [activeDraft, draftService, workflow.isCompleted]);

  const run = async (action: () => Promise<void>) => {
    setIsWorking(true); setError(null);
    try { await action(); } catch { setError("Browser storage is unavailable. Your work remains open and no navigation occurred."); }
    finally { setIsWorking(false); }
  };
  const startClean = () => { workflow.resetWorkflow(); setActiveDraft(null); setResumeDraft(null); previousStepRef.current = PRODUCT_ENTRY_STEP_IDS.entryMethod; };

  if (workflow.isCompleted) {
    return (
      <ProductEntryCompletion
        onAddAnother={startClean}
        onBackToCatalog={() => leave()}
        onHome={() => leave()}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <ProductEntryWizardHeader
          onCancel={() => {
            const started = workflow.completedSteps.length > 0 || workflow.isDirty || workflow.currentStepId !== PRODUCT_ENTRY_STEP_IDS.entryMethod;
            if (started) setShowCancel(true); else leave();
          }}
          onHome={() => void run(async () => { await saveDraft(); leave(true); })}
        />
        <ProductEntryProgress />
        <ProductEntryStepContent />
        <ProductEntryNavigation />
      </div>
      {showCancel ? (
        <ProductEntryExitDialog
          error={error}
          isSaving={isWorking}
          onContinueEditing={() => { setShowCancel(false); setError(null); }}
          onDiscardChanges={() => void run(async () => { if (activeDraft) await draftService.discard(activeDraft); leave(); })}
          onSaveDraft={() => void run(async () => { await saveDraft(); leave(true); })}
        />
      ) : null}
      {resumeDraft ? (
        <ProductEntryResumeDialog
          draft={resumeDraft}
          error={error}
          isWorking={isWorking}
          onContinue={() => void run(async () => {
            await workflow.restoreWorkflow({ values: resumeDraft.workflowValues, currentStepId: resumeDraft.currentStepId, completedStepIds: resumeDraft.completedStepIds });
            setActiveDraft(resumeDraft); setResumeDraft(null); previousStepRef.current = resumeDraft.currentStepId;
          })}
          onDelete={() => void run(async () => { await draftService.delete(resumeDraft.id); startClean(); })}
          onStartNew={() => void run(async () => { await draftService.discard(resumeDraft); startClean(); })}
        />
      ) : null}
      {error && !showCancel && !resumeDraft ? <div className="mx-auto mt-4 max-w-5xl rounded-xl border border-red-200 bg-red-50 p-4 text-sm font-medium text-red-800" role="alert">{error}</div> : null}
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
