"use client";

import { useCallback, useEffect, useMemo, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { ProductEntryLocalDraftIdentity, ProductEntryLocalDraftRestoreDecision } from "../drafts/product-entry-local-draft.types";
import { createBrowserProductEntryLocalDraftRuntime, type BrowserProductEntryLocalDraftRuntime } from "../drafts/infrastructure/browser-product-entry-local-draft.factory";
import {
  HttpProductEntryMediaClient,
  HttpProductEntryProductReadClient,
  HttpProductEntrySubmissionClient,
  HttpProductEntryTrustedClientContextAdapter,
} from "../infrastructure/browser/http-product-entry-clients";
import {
  PRODUCT_ENTRY_STEP_IDS,
  createInitialProductEntryState,
  type ProductEntryValues,
  type ProductEntryWorkflowContext,
} from "../product-entry.types";
import { productEntryWorkflow } from "../product-entry.workflow";
import { ProductEntryBrowserMediaProvider, useProductEntryBrowserMedia } from "../react/product-entry-media-adapter";
import { ProductEntryWorkflowProvider, useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import {
  buildProductEntryLocalDraftSaveInput,
  buildSubmitProductEntryCommand,
  productEntryLocalFormToValues,
  productEntryProductToValues,
} from "../presentation/product-entry-presentation.mapper";
import {
  INITIAL_PRODUCT_ENTRY_PRESENTATION_STATE,
  productEntryPresentationIsBusy,
  productEntryPresentationReducer,
  type ProductEntryPresentationState,
} from "../presentation/product-entry-presentation.reducer";
import { ProductEntryTwoPhaseSaveCoordinator, type ProductEntryTwoPhaseSaveResult } from "../presentation/product-entry-save.coordinator";
import { ProductEntryAddNewTransition, type ProductEntryAddNewTransitionResult } from "../presentation/product-entry-add-new.transition";
import type { ProductEntryProductView, ProductEntryReferenceDataLoadErrorCode, ProductEntryTrustedClientContext } from "../presentation/product-entry-presentation.types";
import { formatProductEntryWesternNumber, PRODUCT_ENTRY_PRESENTATION_TEXT, resolveProductEntryReferenceDataLoadError, type ProductEntryPresentationText } from "../presentation/product-entry-i18n";
import { ProductEntryCategoryService, type ProductEntryCategoryQueryResult } from "../services/product-entry-category.service";
import { ProductEntryDeviceClassService, type ProductEntryDeviceClassOption } from "../services/product-entry-device-class.service";
import { ProductEntryIdentityService } from "../services/product-entry-identity.service";
import { productEntryImagesService } from "../services/product-entry-images.service";
import { ProductEntryProductModelService, type ProductEntryProductModelContext, type ProductEntryProductModelOption } from "../services/product-entry-product-model.service";
import { ProductEntryReviewService } from "../services/product-entry-review.service";
import { ProductEntrySpecificationsService, type ProductEntrySpecificationsResolution } from "../services/product-entry-specifications.service";
import { ProductEntryExitDialog } from "./ProductEntryExitDialog";
import { ProductEntryNavigation } from "./ProductEntryNavigation";
import { ProductEntryProgress } from "./ProductEntryProgress";
import { ProductEntryRecoveryDialog } from "./ProductEntryRecoveryDialog";
import { ProductEntryRevisionConflictDialog } from "./ProductEntryRevisionConflictDialog";
import { ProductEntryStepContent } from "./ProductEntryStepContent";
import { ProductEntryWizardHeader } from "./ProductEntryWizardHeader";
import { ProductIdentityCard } from "./ProductIdentityCard";

const EMPTY_CATEGORY_QUERY: ProductEntryCategoryQueryResult = {
  categories: [], categoryRequiresDeviceClassByCategory: {}, deviceClassIdsByCategory: {},
  brandIdByProductModel: {}, productModelIdsByCategory: {}, productModelIdsByCategoryAndDeviceClass: {},
  specificationFieldIdsByCategory: {}, specificationFieldIdsByCategoryAndDeviceClass: {},
  selectOptionValuesBySpecificationField: {},
};

const createWorkflowContext = (
  trusted: ProductEntryTrustedClientContext,
  categoryQuery: ProductEntryCategoryQueryResult,
): ProductEntryWorkflowContext => ({
  companyId: trusted.companyId,
  workspaceId: trusted.workspaceId,
  categoryRequiresDeviceClassByCategory: categoryQuery.categoryRequiresDeviceClassByCategory,
  deviceClassIdsByCategory: categoryQuery.deviceClassIdsByCategory,
  brandIdByProductModel: categoryQuery.brandIdByProductModel,
  productModelIdsByCategory: categoryQuery.productModelIdsByCategory,
  productModelIdsByCategoryAndDeviceClass: categoryQuery.productModelIdsByCategoryAndDeviceClass,
  specificationFieldIdsByCategory: categoryQuery.specificationFieldIdsByCategory,
  specificationFieldIdsByCategoryAndDeviceClass: categoryQuery.specificationFieldIdsByCategoryAndDeviceClass,
  selectOptionValuesBySpecificationField: categoryQuery.selectOptionValuesBySpecificationField,
  compatibleDeviceClassIds: [], compatibleProductModelIds: [], compatibleSpecificationFieldIds: [],
  requiredSpecificationFieldIds: [], resolvedProductModelBrandId: undefined,
});

export interface ProductEntryInitialContext {
  readonly categoryId?: string;
  readonly departmentId?: string;
  readonly deviceClassId?: string;
  readonly productModelId?: string;
  readonly brandId?: string;
}

interface ProductEntryWizardProps {
  readonly mode?: "Create" | "Edit";
  readonly productId?: string;
  readonly submissionId?: string;
  readonly initialContext?: ProductEntryInitialContext;
}

interface ReadyBootstrap {
  readonly type: "Ready";
  readonly trusted: ProductEntryTrustedClientContext;
  readonly identity: ProductEntryLocalDraftIdentity;
  readonly initialValues: ProductEntryValues;
  readonly product: ProductEntryProductView | null;
  readonly notice: string | null;
}

type RecoverableDecision = Extract<ProductEntryLocalDraftRestoreDecision, { readonly type: "RecoverableCreateDraft" | "RecoverableEditDraft" }>;
type ConflictDecision = Extract<ProductEntryLocalDraftRestoreDecision, { readonly type: "RevisionConflict" }>;
type BootstrapState =
  | { readonly type: "Loading" }
  | { readonly type: "Failure"; readonly code: string }
  | { readonly type: "Recovery"; readonly base: ReadyBootstrap; readonly decision: RecoverableDecision }
  | { readonly type: "Conflict"; readonly base: ReadyBootstrap; readonly decision: ConflictDecision }
  | ReadyBootstrap;

const initialCreateValues = (initial?: ProductEntryInitialContext): ProductEntryValues => ({
  ...createInitialProductEntryState(),
  categoryId: initial?.categoryId ?? null,
  departmentId: initial?.departmentId ?? null,
  deviceClassId: initial?.deviceClassId ?? null,
  productModelId: initial?.productModelId ?? null,
  brandId: initial?.brandId ?? null,
});

const safePresentationMessage = (state: ProductEntryPresentationState, text: ProductEntryPresentationText): string => {
  switch (state.type) {
    case "Initializing": return text.statusInitializing;
    case "CheckingDraft": return text.statusCheckingDraft;
    case "Editing": return state.revalidationRequired ? text.statusRevalidate : "";
    case "Validating": return text.statusValidating;
    case "HashingMedia": return text.statusHashing;
    case "SavingProduct": return text.statusSavingProduct;
    case "ProductSaved": return text.statusProductSaved;
    case "UploadingMedia": return text.statusUploadingMedia;
    case "MediaPartiallyCompleted": return state.code === "MEDIA_SOURCE_RESELECTION_REQUIRED"
      ? text.statusMediaReselection
      : text.statusMediaPartial;
    case "Completed": return state.mediaStatus === null
      ? text.statusCompletedWithoutMedia
      : text.statusCompletedWithMedia;
    case "RetryableFailure": return state.receipt
      ? text.statusMediaRetry
      : text.statusPhaseOneRetry;
    case "RevisionConflict": return text.statusRevisionConflict;
    case "FatalFailure": return text.statusFatal;
    case "StorageUnavailable": return text.statusStorageUnavailable;
    case "RestoreDecisionRequired": return text.statusRestoreDecision;
  }
};

interface ProductEntryWizardSessionProps {
  readonly bootstrap: ReadyBootstrap;
  readonly draftRuntime: BrowserProductEntryLocalDraftRuntime;
  readonly coordinator: ProductEntryTwoPhaseSaveCoordinator;
  readonly categories: ProductEntryCategoryQueryResult["categories"];
  readonly categoryRequiresDeviceClassByCategory: ProductEntryCategoryQueryResult["categoryRequiresDeviceClassByCategory"];
  readonly categoryLoadErrorCode: ProductEntryReferenceDataLoadErrorCode | null;
  readonly categoriesLoading: boolean;
  readonly onRetryCategories: () => void;
  readonly locale: "en" | "ar";
  readonly onLocaleChange: (locale: "en" | "ar") => void;
  readonly onAddNew: (afterEstablished: () => void) => Promise<ProductEntryAddNewTransitionResult>;
  readonly onReloadEdit: () => Promise<void>;
}

function ProductEntryWizardSession({ bootstrap, draftRuntime, coordinator, categories, categoryRequiresDeviceClassByCategory, categoryLoadErrorCode, categoriesLoading, onRetryCategories, locale, onLocaleChange, onAddNew, onReloadEdit }: ProductEntryWizardSessionProps) {
  const router = useRouter();
  const workflow = useProductEntryWorkflow();
  const media = useProductEntryBrowserMedia();
  const [presentation, dispatch] = useReducer(productEntryPresentationReducer, INITIAL_PRODUCT_ENTRY_PRESENTATION_STATE);
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [showPhaseOneConflict, setShowPhaseOneConflict] = useState(false);
  const [draftState, setDraftState] = useState(draftRuntime.controller.draftState);
  const [addNewBusy, setAddNewBusy] = useState(false);
  const [addNewFailure, setAddNewFailure] = useState(false);
  const [replacementSelectionStates, setReplacementSelectionStates] = useState<Record<string, "Preparing" | "Ready" | "Failed">>({});
  const lastDraftPayload = useRef<string | null>(null);
  const [deviceClassResult, setDeviceClassResult] = useState<{ categoryId: string; options: ProductEntryDeviceClassOption[] } | null>(null);
  const [deviceClassError, setDeviceClassError] = useState<{ categoryId: string; code: ProductEntryReferenceDataLoadErrorCode } | null>(null);
  const [productModelResult, setProductModelResult] = useState<{ contextKey: string; options: ProductEntryProductModelOption[] } | null>(null);
  const [productModelError, setProductModelError] = useState<{ contextKey: string; code: ProductEntryReferenceDataLoadErrorCode } | null>(null);
  const [specificationsResult, setSpecificationsResult] = useState<{ contextKey: string; resolution: ProductEntrySpecificationsResolution } | null>(null);
  const [specificationsError, setSpecificationsError] = useState<{ contextKey: string; code: ProductEntryReferenceDataLoadErrorCode } | null>(null);
  const ar = locale === "ar";
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const categoryLoadError = categoryLoadErrorCode
    ? resolveProductEntryReferenceDataLoadError(categoryLoadErrorCode, text)
    : null;

  useEffect(() => { dispatch({ type: "Edit", revalidationRequired: Boolean(bootstrap.notice) }); }, [bootstrap.notice]);
  useEffect(() => draftRuntime.controller.subscribe(() => setDraftState(draftRuntime.controller.draftState)), [draftRuntime]);
  useEffect(() => draftRuntime.controller.attachVisibilityFlush(document), [draftRuntime]);
  useEffect(() => {
    const beforeUnload = (event: BeforeUnloadEvent) => {
      if (workflow.isDirty && draftRuntime.controller.draftState !== "Saved") event.preventDefault();
    };
    window.addEventListener("beforeunload", beforeUnload);
    return () => window.removeEventListener("beforeunload", beforeUnload);
  }, [draftRuntime, workflow.isDirty]);
  useEffect(() => {
    if (!workflow.isDirty) return;
    const input = buildProductEntryLocalDraftSaveInput(bootstrap.identity, workflow.values, bootstrap.trusted);
    const payload = JSON.stringify(input);
    if (payload === lastDraftPayload.current) return;
    lastDraftPayload.current = payload;
    draftRuntime.controller.saveDraft(input);
  }, [bootstrap.identity, bootstrap.trusted, draftRuntime, workflow.isDirty, workflow.values]);

  const selectedCategoryId = workflow.values.categoryId;
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);
  useEffect(() => {
    if (selectedCategory && workflow.values.departmentId !== selectedCategory.departmentId) void workflow.setValue("departmentId", selectedCategory.departmentId);
  }, [selectedCategory, workflow]);

  const loadDeviceClasses = useCallback(() => {
    if (!selectedCategoryId) return;
    setDeviceClassError(null);
    void ProductEntryDeviceClassService.getCompatibleDeviceClasses({
      categoryId: selectedCategoryId, companyId: bootstrap.trusted.companyId, workspaceId: bootstrap.trusted.workspaceId,
    }).then((options) => setDeviceClassResult({ categoryId: selectedCategoryId, options }))
      .catch(() => setDeviceClassError({ categoryId: selectedCategoryId, code: "DeviceTypesLoadFailed" }));
  }, [bootstrap.trusted, selectedCategoryId]);
  useEffect(() => {
    if (!selectedCategoryId) return;
    void ProductEntryDeviceClassService.getCompatibleDeviceClasses({
      categoryId: selectedCategoryId, companyId: bootstrap.trusted.companyId, workspaceId: bootstrap.trusted.workspaceId,
    }).then((options) => setDeviceClassResult({ categoryId: selectedCategoryId, options }))
      .catch(() => setDeviceClassError({ categoryId: selectedCategoryId, code: "DeviceTypesLoadFailed" }));
  }, [bootstrap.trusted, selectedCategoryId]);
  const deviceClasses = deviceClassResult?.categoryId === selectedCategoryId ? deviceClassResult.options : [];
  const deviceClassesLoading = Boolean(selectedCategoryId) && deviceClassResult?.categoryId !== selectedCategoryId && deviceClassError?.categoryId !== selectedCategoryId;
  const activeDeviceClassError = deviceClassError?.categoryId === selectedCategoryId
    ? resolveProductEntryReferenceDataLoadError(deviceClassError.code, text)
    : null;
  const deviceClassSelectionValid = Boolean(workflow.values.deviceClassId && deviceClasses.some((option) => option.id === workflow.values.deviceClassId));
  const categoryRequiresDeviceClass = Boolean(selectedCategoryId && categoryRequiresDeviceClassByCategory[selectedCategoryId]);

  const productModelContext = useMemo<ProductEntryProductModelContext>(() => ({
    companyId: bootstrap.trusted.companyId, workspaceId: bootstrap.trusted.workspaceId,
    departmentId: workflow.values.departmentId, categoryId: workflow.values.categoryId,
    deviceClassId: workflow.values.deviceClassId, categoryRequiresDeviceClass,
  }), [bootstrap.trusted, categoryRequiresDeviceClass, workflow.values.categoryId, workflow.values.departmentId, workflow.values.deviceClassId]);
  const productModelContextValid = Boolean(productModelContext.departmentId && productModelContext.categoryId && (!productModelContext.categoryRequiresDeviceClass || productModelContext.deviceClassId));
  const productModelContextKey = JSON.stringify(productModelContext);
  const loadProductModels = useCallback(() => {
    if (!productModelContextValid) return;
    setProductModelError(null);
    void ProductEntryProductModelService.getAvailableProductModels(productModelContext)
      .then((options) => setProductModelResult({ contextKey: productModelContextKey, options }))
      .catch(() => setProductModelError({ contextKey: productModelContextKey, code: "ProductModelsLoadFailed" }));
  }, [productModelContext, productModelContextKey, productModelContextValid]);
  useEffect(() => {
    if (!productModelContextValid) return;
    void ProductEntryProductModelService.getAvailableProductModels(productModelContext)
      .then((options) => setProductModelResult({ contextKey: productModelContextKey, options }))
      .catch(() => setProductModelError({ contextKey: productModelContextKey, code: "ProductModelsLoadFailed" }));
  }, [productModelContext, productModelContextKey, productModelContextValid]);
  const productModels = productModelResult?.contextKey === productModelContextKey ? productModelResult.options : [];
  const productModelsLoading = productModelContextValid && productModelResult?.contextKey !== productModelContextKey && productModelError?.contextKey !== productModelContextKey;
  const activeProductModelError = productModelError?.contextKey === productModelContextKey
    ? resolveProductEntryReferenceDataLoadError(productModelError.code, text)
    : null;
  const selectedDeviceClass = deviceClasses.find((deviceClass) => deviceClass.id === workflow.values.deviceClassId);
  const selectedProductModel = productModels.find((productModel) => productModel.productModelId === workflow.values.productModelId && productModel.brandId === workflow.values.brandId);
  const productModelContextLabel = [selectedDeviceClass?.name, selectedCategory?.name].filter(Boolean).join(" · ");

  const specificationsContext = useMemo(() => ({
    companyId: bootstrap.trusted.companyId, workspaceId: bootstrap.trusted.workspaceId,
    categoryId: workflow.values.categoryId, deviceClassId: workflow.values.deviceClassId, categoryRequiresDeviceClass,
  }), [bootstrap.trusted, categoryRequiresDeviceClass, workflow.values.categoryId, workflow.values.deviceClassId]);
  const specificationsContextKey = JSON.stringify(specificationsContext);
  const loadSpecifications = useCallback(() => {
    setSpecificationsError(null);
    void ProductEntrySpecificationsService.resolve(specificationsContext)
      .then((resolution) => setSpecificationsResult({ contextKey: specificationsContextKey, resolution }))
      .catch(() => setSpecificationsError({ contextKey: specificationsContextKey, code: "SpecificationFieldsLoadFailed" }));
  }, [specificationsContext, specificationsContextKey]);
  useEffect(() => {
    void ProductEntrySpecificationsService.resolve(specificationsContext)
      .then((resolution) => setSpecificationsResult({ contextKey: specificationsContextKey, resolution }))
      .catch(() => setSpecificationsError({ contextKey: specificationsContextKey, code: "SpecificationFieldsLoadFailed" }));
  }, [specificationsContext, specificationsContextKey]);
  const specificationsResolution = specificationsResult?.contextKey === specificationsContextKey ? specificationsResult.resolution : null;
  const specificationsLoading = specificationsResult?.contextKey !== specificationsContextKey && specificationsError?.contextKey !== specificationsContextKey;
  const activeSpecificationsError = specificationsError?.contextKey === specificationsContextKey
    ? resolveProductEntryReferenceDataLoadError(specificationsError.code, text)
    : null;

  const productIdentity = ProductEntryIdentityService.createViewModel({
    values: workflow.values, steps: workflow.visibleSteps, categoryName: selectedCategory?.name,
    deviceClassName: selectedDeviceClass?.name, brandName: selectedProductModel?.brandName,
    productModelName: selectedProductModel?.name, specificationsResolution,
    draftSaved: draftState === "Saved", identityError: Boolean(categoryLoadError || activeDeviceClassError || activeProductModelError),
  });
  const review = ProductEntryReviewService.createViewModel({
    values: workflow.values, steps: workflow.visibleSteps, specificationsResolution, categoryRequiresDeviceClass,
    names: { department: selectedCategory?.departmentName, category: selectedCategory?.name, deviceClass: selectedDeviceClass?.name, brand: selectedProductModel?.brandName, productModel: selectedProductModel?.name },
  });

  const sourceProvider = useCallback((operationIds: readonly string[], replacementOperationIds: readonly string[] = []) => {
    const selected = media.requiredSources(operationIds);
    if (selected.type === "Missing") return selected;
    const replacements = new Set(replacementOperationIds);
    const mismatch = selected.sources.filter((source) => {
      const descriptor = workflow.values.images.find((image) => image.operationId === source.operationId);
      return !replacements.has(source.operationId)
        && (!descriptor || descriptor.expectedSourceSha256 !== source.sha256 || descriptor.expectedSourceByteLength !== source.byteLength);
    }).map((source) => source.operationId);
    return mismatch.length > 0 ? { type: "Missing" as const, operationIds: mismatch } : selected;
  }, [media, workflow.values.images]);

  const handleResult = useCallback(async (result: ProductEntryTwoPhaseSaveResult) => {
    if (result.type === "Completed") {
      dispatch({ type: "Complete", receipt: result.receipt, mediaStatus: result.mediaStatus });
      if (bootstrap.identity.mode === "Edit") await draftRuntime.controller.completeEditDraft(bootstrap.identity);
    } else if (result.type === "RevisionConflict") {
      dispatch({ type: "ShowRevisionConflict", productId: result.productId, baseRevision: result.expectedRevision, currentRevision: result.actualRevision, source: "PhaseOne" });
      setShowPhaseOneConflict(true);
    } else if (result.type === "ProductRejected") {
      dispatch({ type: "Retryable", stage: "Product", code: result.code });
    } else if (result.type === "ProductRetryableFailure") {
      dispatch({ type: "Retryable", stage: "Product", code: result.code });
    } else if (result.type === "ProductFatalFailure") {
      dispatch({ type: "Fatal", code: result.code });
    } else if (result.type === "MediaRequiresSources") {
      dispatch({ type: "MediaPartial", receipt: result.receipt, status: result.status, code: "MEDIA_SOURCE_RESELECTION_REQUIRED" });
    } else if (result.type === "MediaPartiallyCompleted") {
      dispatch({ type: "MediaPartial", receipt: result.receipt, status: result.status, code: result.code });
    } else if (result.type === "MediaRetryableFailure") {
      dispatch({ type: "Retryable", stage: "Media", code: result.code, receipt: result.receipt });
    } else {
      dispatch({ type: "Fatal", code: result.code });
    }
  }, [bootstrap.identity, draftRuntime]);

  const retryMedia = useCallback(async () => {
    const receipt = coordinator.productReceipt;
    if (!receipt) return;
    dispatch({ type: "UploadMedia", receipt });
    await handleResult(await coordinator.retryMedia(sourceProvider));
  }, [coordinator, handleResult, sourceProvider]);

  const save = useCallback(async () => {
    if (coordinator.productReceipt) { await retryMedia(); return; }
    await draftRuntime.controller.flushBeforePhaseOne();
    dispatch({ type: "Validate" });
    const valid = await workflow.completeWorkflow();
    if (!valid) {
      dispatch({ type: "Edit", revalidationRequired: true });
      requestAnimationFrame(() => (document.querySelector<HTMLElement>("[aria-invalid='true']") ?? document.querySelector<HTMLElement>("[role='alert']"))?.focus());
      return;
    }
    const command = buildSubmitProductEntryCommand(bootstrap.identity, workflow.values, bootstrap.trusted);
    dispatch({ type: "SaveProduct" });
    const result = await coordinator.save(command, sourceProvider, (receipt) => {
      dispatch({ type: "ProductSaved", receipt });
      if ((command.mediaOperations?.length ?? 0) > 0) dispatch({ type: "UploadMedia", receipt });
    });
    await handleResult(result);
  }, [bootstrap.identity, bootstrap.trusted, coordinator, draftRuntime, handleResult, retryMedia, sourceProvider, workflow]);

  const leave = useCallback(async () => {
    await draftRuntime.controller.flushBeforeNavigation();
    router.push("/");
  }, [draftRuntime, router]);
  const startAnotherProduct = useCallback(async () => {
    setAddNewBusy(true);
    setAddNewFailure(false);
    try {
      const result = await onAddNew(() => media.clear());
      if (result.type === "Rejected") setAddNewFailure(true);
    } finally {
      setAddNewBusy(false);
    }
  }, [media, onAddNew]);
  const receipt = "receipt" in presentation ? presentation.receipt : coordinator.productReceipt;
  const busy = productEntryPresentationIsBusy(presentation);
  const statusMessage = safePresentationMessage(presentation, text);
  const partialMediaStatus = presentation.type === "MediaPartiallyCompleted" ? presentation.status : null;
  const replacementOperationIds = partialMediaStatus?.canReplaceSource
    ? partialMediaStatus.operations.filter((operation) =>
      operation.status === "SourceUnavailable" && operation.requiresNewSource).map((operation) => operation.operationId)
    : [];

  const chooseReplacement = async (operationId: string, file: File) => {
    setReplacementSelectionStates((current) => ({ ...current, [operationId]: "Preparing" }));
    const result = await media.select(operationId, file);
    setReplacementSelectionStates((current) => ({
      ...current,
      [operationId]: result.type === "Hashed" ? "Ready" : "Failed",
    }));
  };

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10" dir={ar ? "rtl" : "ltr"} lang={locale}>
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <ProductEntryWizardHeader mode={bootstrap.identity.mode} productId={bootstrap.product?.productId ?? null} locale={locale} onLocaleChange={onLocaleChange} onClose={() => setShowCloseDialog(true)} onHome={() => setShowCloseDialog(true)} />
        <div aria-live="polite" className={`rounded-2xl border p-4 text-sm ${receipt ? "border-emerald-200 bg-emerald-50 text-emerald-950" : presentation.type.includes("Failure") || presentation.type === "RevisionConflict" ? "border-red-200 bg-red-50 text-red-900" : "border-blue-200 bg-blue-50 text-blue-950"}`} role={presentation.type.includes("Failure") || presentation.type === "RevisionConflict" ? "alert" : "status"}>
          <p className="font-semibold">{statusMessage || text.readyToEdit}</p>
          <p className="mt-1 text-xs opacity-80">{text.localDraft}: {draftState === "Saving" ? text.draftSaving : draftState === "Saved" ? text.draftSaved : draftState === "Unavailable" ? text.draftUnavailable : text.draftIdle}</p>
          {receipt ? <p className="mt-1 text-xs">{text.productId}: {receipt.productId} · {text.revision}: {formatProductEntryWesternNumber(receipt.productRevision, locale)}</p> : null}
          {replacementOperationIds.length > 0 ? (
            <section aria-labelledby="media-source-replacement-heading" className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-amber-950">
              <h2 className="font-semibold" id="media-source-replacement-heading">{text.replaceMediaSource}</h2>
              <p className="mt-1 text-xs leading-5">{text.replaceMediaSourceDescription}</p>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {replacementOperationIds.map((operationId) => (
                  <div className="min-w-0 rounded-lg border border-amber-200 bg-white p-3" key={operationId}>
                    <p className="truncate text-xs font-mono" title={operationId}>{operationId}</p>
                    <label className="mt-2 inline-flex min-h-11 w-full cursor-pointer items-center justify-center rounded-lg bg-amber-700 px-3 text-center text-sm font-semibold text-white focus-within:ring-4 focus-within:ring-amber-200">
                      {text.chooseReplacementFile}
                      <input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => {
                        const file = event.target.files?.[0];
                        if (file) void chooseReplacement(operationId, file);
                        event.target.value = "";
                      }} type="file" />
                    </label>
                    <p aria-live="polite" className="mt-2 text-xs">
                      {replacementSelectionStates[operationId] === "Preparing" ? text.preparingReplacement
                        : replacementSelectionStates[operationId] === "Ready" ? text.replacementReady
                          : replacementSelectionStates[operationId] === "Failed" ? text.replacementFailed
                            : text.reselectAfterReload}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {receipt && presentation.type !== "Completed" ? <button className="min-h-11 rounded-lg border border-emerald-300 bg-white px-4 font-semibold" disabled={busy} onClick={() => void retryMedia()} type="button">{replacementOperationIds.length > 0 ? text.applyReplacement : text.retryMedia}</button> : null}
            {receipt && bootstrap.identity.mode === "Create" ? <button className="min-h-11 rounded-lg bg-blue-600 px-4 font-semibold text-white" disabled={busy || addNewBusy} onClick={startAnotherProduct} type="button">{text.addNewProduct}</button> : null}
          </div>
          {addNewFailure ? <p className="mt-2 text-xs font-semibold text-red-800" role="alert">{text.addNewFailed}</p> : null}
        </div>
        <ProductEntryProgress locale={locale} />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="order-2 min-w-0 lg:order-1"><ProductEntryStepContent categories={categories} categoryLoadError={categoryLoadError} categoriesLoading={categoriesLoading} onRetryCategories={onRetryCategories} deviceClasses={deviceClasses} deviceClassLoadError={activeDeviceClassError} deviceClassesLoading={deviceClassesLoading} onRetryDeviceClasses={loadDeviceClasses} productModels={productModels} productModelContextLabel={productModelContextLabel} productModelContextValid={productModelContextValid} productModelLoadError={activeProductModelError} productModelsLoading={productModelsLoading} onRetryProductModels={loadProductModels} specificationsLoadError={activeSpecificationsError} specificationsLoading={specificationsLoading} specificationsResolution={specificationsResolution} onRetrySpecifications={loadSpecifications} review={review} locale={locale} /></div>
          <div className="order-1 lg:order-2"><ProductIdentityCard identity={productIdentity} locale={locale} /></div>
        </div>
        <ProductEntryNavigation deviceClassSelectionValid={deviceClassSelectionValid} isBusy={busy} locale={locale} onSave={save} reviewReadyToSave={review.readyToSave} />
      </div>
      {showCloseDialog ? <ProductEntryExitDialog locale={locale} onContinueEditing={() => setShowCloseDialog(false)} onDiscardChanges={() => void leave()} /> : null}
      {showPhaseOneConflict && presentation.type === "RevisionConflict" ? <ProductEntryRevisionConflictDialog baseRevision={presentation.baseRevision} canReviewLocal currentRevision={presentation.currentRevision} locale={locale} onCancel={() => setShowPhaseOneConflict(false)} onDiscardAndReload={() => void onReloadEdit()} onReviewLocal={() => setShowPhaseOneConflict(false)} /> : null}
    </main>
  );
}

export function ProductEntryWizard({ mode = "Create", productId, submissionId, initialContext }: ProductEntryWizardProps) {
  const router = useRouter();
  const [draftRuntime] = useState(() => createBrowserProductEntryLocalDraftRuntime());
  const [coordinator] = useState(() => new ProductEntryTwoPhaseSaveCoordinator(new HttpProductEntrySubmissionClient(), new HttpProductEntryMediaClient()));
  const [bootstrap, setBootstrap] = useState<BootstrapState>({ type: "Loading" });
  const [categoryQuery, setCategoryQuery] = useState(EMPTY_CATEGORY_QUERY);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryLoadErrorCode, setCategoryLoadErrorCode] = useState<ProductEntryReferenceDataLoadErrorCode | null>(null);
  const [localeOverride, setLocaleOverride] = useState<"en" | "ar" | null>(null);
  const [addNewTransition] = useState(() => new ProductEntryAddNewTransition());

  useEffect(() => () => { coordinator.dispose(); draftRuntime.close(); }, [coordinator, draftRuntime]);
  useEffect(() => {
    const abort = new AbortController();
    let active = true;
    void (async () => {
      const trustedResult = await new HttpProductEntryTrustedClientContextAdapter().resolve(abort.signal);
      if (!active) return;
      if (trustedResult.type === "Unavailable") { setBootstrap({ type: "Failure", code: trustedResult.code }); return; }
      const trusted = trustedResult.context;
      let product: ProductEntryProductView | null = null;
      let values = initialCreateValues(initialContext);
      if (mode === "Edit") {
        if (!productId) { setBootstrap({ type: "Failure", code: "PRODUCT_ID_REQUIRED" }); return; }
        const read = await new HttpProductEntryProductReadClient().get(productId, abort.signal);
        if (!active) return;
        if (read.type !== "Found") { setBootstrap({ type: "Failure", code: read.type === "NotFound" ? "PRODUCT_NOT_FOUND" : read.code }); return; }
        product = read.product;
        values = productEntryProductToValues(product);
      }
      const context = { workspaceId: trusted.workspaceId, actorId: trusted.actorId };
      const identity = mode === "Create"
        ? submissionId?.trim()
          ? { ...context, mode: "Create" as const, submissionId: submissionId.trim() }
          : draftRuntime.sessions.startCreate(context)
        : draftRuntime.sessions.startEdit(context, product!.productId, product!.revision);
      if (!identity) { setBootstrap({ type: "Failure", code: "SUBMISSION_ID_UNAVAILABLE" }); return; }
      if (mode === "Create" && !submissionId) router.replace(`/products/new?submissionId=${encodeURIComponent(identity.submissionId)}`);
      const base: ReadyBootstrap = { type: "Ready", trusted, identity, initialValues: values, product, notice: null };
      const decision = await draftRuntime.controller.checkForRecovery(identity, product?.revision);
      if (!active) return;
      if (decision.type === "RecoverableCreateDraft" || decision.type === "RecoverableEditDraft") setBootstrap({ type: "Recovery", base, decision });
      else if (decision.type === "RevisionConflict") setBootstrap({ type: "Conflict", base, decision });
      else setBootstrap({ ...base, notice: decision.type === "StorageUnavailable" ? decision.code : null });
    })();
    return () => { active = false; abort.abort(); };
  }, [draftRuntime, initialContext, mode, productId, router, submissionId]);

  const trusted = bootstrap.type === "Ready" ? bootstrap.trusted : bootstrap.type === "Recovery" || bootstrap.type === "Conflict" ? bootstrap.base.trusted : null;
  const loadCategories = useCallback(() => {
    if (!trusted) return;
    setCategoriesLoading(true); setCategoryLoadErrorCode(null);
    void ProductEntryCategoryService.getAvailableCategories(trusted.companyId, trusted.workspaceId)
      .then(setCategoryQuery).catch(() => setCategoryLoadErrorCode("ProductClassificationsLoadFailed"))
      .finally(() => setCategoriesLoading(false));
  }, [trusted]);
  useEffect(() => {
    if (!trusted) return;
    void ProductEntryCategoryService.getAvailableCategories(trusted.companyId, trusted.workspaceId)
      .then(setCategoryQuery).catch(() => setCategoryLoadErrorCode("ProductClassificationsLoadFailed"))
      .finally(() => setCategoriesLoading(false));
  }, [trusted]);

  const readyFromDecision = useCallback((base: ReadyBootstrap): ReadyBootstrap => {
    const accepted = draftRuntime.controller.resolveRestoreDecision(true);
    if (accepted.type !== "Accepted") return base;
    const images = productEntryImagesService.restore(base.initialValues.images, accepted.draft.mediaDescriptors);
    const restoredIdentity = { ...base.identity, submissionId: accepted.draft.submissionId } as ProductEntryLocalDraftIdentity;
    return { ...base, identity: restoredIdentity, initialValues: productEntryLocalFormToValues(accepted.draft.formState, images), notice: "RESTORED_REVALIDATION_REQUIRED" };
  }, [draftRuntime]);

  const addNew = useCallback(async (afterEstablished: () => void) => addNewTransition.execute({
    establishNextSession: async () => {
      if (bootstrap.type !== "Ready" || bootstrap.identity.mode !== "Create") {
        return { type: "Rejected" as const, code: "IdentityInvalid" as const };
      }
      return draftRuntime.controller.startNewProduct(bootstrap.identity);
    },
    afterEstablished: (next) => {
      if (bootstrap.type !== "Ready") return;
      afterEstablished();
      coordinator.reset();
      setBootstrap({ ...bootstrap, identity: next, initialValues: initialCreateValues(), product: null, notice: null });
      router.replace(`/products/new?submissionId=${encodeURIComponent(next.submissionId)}`);
    },
  }), [addNewTransition, bootstrap, coordinator, draftRuntime, router]);

  const reloadEdit = useCallback(async () => {
    const base = bootstrap.type === "Conflict" ? bootstrap.base : bootstrap.type === "Ready" ? bootstrap : null;
    if (!base || base.identity.mode !== "Edit") return;
    await draftRuntime.controller.discardDraft(base.identity);
    coordinator.reset();
    const read = await new HttpProductEntryProductReadClient().get(base.identity.productId);
    if (read.type !== "Found") {
      setBootstrap({ type: "Failure", code: read.type === "NotFound" ? "PRODUCT_NOT_FOUND" : read.code });
      return;
    }
    const nextIdentity = draftRuntime.sessions.startEdit(
      { workspaceId: base.trusted.workspaceId, actorId: base.trusted.actorId },
      read.product.productId,
      read.product.revision,
    );
    if (!nextIdentity) { setBootstrap({ type: "Failure", code: "SUBMISSION_ID_UNAVAILABLE" }); return; }
    setBootstrap({ ...base, identity: nextIdentity, product: read.product, initialValues: productEntryProductToValues(read.product), notice: null });
    router.refresh();
  }, [bootstrap, coordinator, draftRuntime, router]);

  const bootstrapText = PRODUCT_ENTRY_PRESENTATION_TEXT[localeOverride ?? "en"];
  if (bootstrap.type === "Loading") return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6" role="status">{bootstrapText.initializing}</main>;
  if (bootstrap.type === "Failure") return <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6"><section className="max-w-lg rounded-3xl border border-red-200 bg-white p-8" role="alert"><h1 className="text-xl font-bold text-slate-950">{bootstrapText.unavailableHeading}</h1><p className="mt-3 text-sm text-slate-600">{bootstrapText.unavailableDescription}</p><code className="mt-3 block text-xs text-red-700">{bootstrap.code}</code></section></main>;
  if (bootstrap.type === "Recovery") {
    const locale = localeOverride ?? bootstrap.base.trusted.locale;
    return <ProductEntryRecoveryDialog locale={locale} updatedAt={bootstrap.decision.draft.updatedAt} onContinue={() => { draftRuntime.controller.resolveRestoreDecision(false); setBootstrap(bootstrap.base); }} onDiscard={() => void draftRuntime.controller.discardDraft(bootstrap.base.identity).then(() => setBootstrap(bootstrap.base))} onRestore={() => setBootstrap(readyFromDecision(bootstrap.base))} />;
  }
  if (bootstrap.type === "Conflict") {
    const locale = localeOverride ?? bootstrap.base.trusted.locale;
    return <ProductEntryRevisionConflictDialog baseRevision={bootstrap.decision.baseProductRevision} canReviewLocal={false} currentRevision={bootstrap.decision.currentProductRevision} locale={locale} onCancel={() => router.push("/")} onDiscardAndReload={() => void reloadEdit()} />;
  }

  const locale = localeOverride ?? bootstrap.trusted.locale;
  const workflowContext = createWorkflowContext(bootstrap.trusted, categoryQuery);
  return (
    <ProductEntryWorkflowProvider context={workflowContext} createInitialValues={() => bootstrap.initialValues} initialStep={PRODUCT_ENTRY_STEP_IDS.entryMethod} key={`${bootstrap.identity.mode}:${bootstrap.identity.submissionId}`} workflow={productEntryWorkflow}>
      <ProductEntryBrowserMediaProvider>
        <ProductEntryWizardSession bootstrap={bootstrap} categories={categoryQuery.categories} categoriesLoading={categoriesLoading} categoryLoadErrorCode={categoryLoadErrorCode} categoryRequiresDeviceClassByCategory={categoryQuery.categoryRequiresDeviceClassByCategory} coordinator={coordinator} draftRuntime={draftRuntime} locale={locale} onAddNew={addNew} onLocaleChange={setLocaleOverride} onReloadEdit={reloadEdit} onRetryCategories={loadCategories} />
      </ProductEntryBrowserMediaProvider>
    </ProductEntryWorkflowProvider>
  );
}
