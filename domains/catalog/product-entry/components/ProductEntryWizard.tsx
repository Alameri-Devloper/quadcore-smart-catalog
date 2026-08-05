"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
import { PRODUCT_ENTRY_DEVELOPMENT_SCOPE } from "../product-entry.development-config";
import {
  ProductEntryCategoryService,
  type ProductEntryCategoryQueryResult,
} from "../services/product-entry-category.service";
import {
  ProductEntryDeviceClassService,
  type ProductEntryDeviceClassOption,
} from "../services/product-entry-device-class.service";
import {
  ProductEntryProductModelService,
  type ProductEntryProductModelContext,
  type ProductEntryProductModelOption,
} from "../services/product-entry-product-model.service";
import {
  ProductEntrySpecificationsService,
  type ProductEntrySpecificationsResolution,
} from "../services/product-entry-specifications.service";
import { ProductIdentityCard } from "./ProductIdentityCard";
import { ProductEntryIdentityService } from "../services/product-entry-identity.service";
import { ProductEntryReviewService } from "../services/product-entry-review.service";

const EMPTY_CATEGORY_QUERY: ProductEntryCategoryQueryResult = {
  categories: [],
  categoryRequiresDeviceClassByCategory: {},
  deviceClassIdsByCategory: {},
  brandIdByProductModel: {},
  productModelIdsByCategory: {},
  productModelIdsByCategoryAndDeviceClass: {},
  specificationFieldIdsByCategory: {},
  specificationFieldIdsByCategoryAndDeviceClass: {},
  selectOptionValuesBySpecificationField: {},
};

const createDevelopmentWorkflowContext = (
  categoryQuery: ProductEntryCategoryQueryResult,
): ProductEntryWorkflowContext => ({
  companyId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
  workspaceId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId,
  categoryRequiresDeviceClassByCategory: categoryQuery.categoryRequiresDeviceClassByCategory,
  deviceClassIdsByCategory: categoryQuery.deviceClassIdsByCategory,
  brandIdByProductModel: categoryQuery.brandIdByProductModel,
  productModelIdsByCategory: categoryQuery.productModelIdsByCategory,
  productModelIdsByCategoryAndDeviceClass: categoryQuery.productModelIdsByCategoryAndDeviceClass,
  specificationFieldIdsByCategory: categoryQuery.specificationFieldIdsByCategory,
  specificationFieldIdsByCategoryAndDeviceClass: categoryQuery.specificationFieldIdsByCategoryAndDeviceClass,
  selectOptionValuesBySpecificationField: categoryQuery.selectOptionValuesBySpecificationField,
  compatibleDeviceClassIds: [],
  compatibleProductModelIds: [],
  compatibleSpecificationFieldIds: [],
  requiredSpecificationFieldIds: [],
  resolvedProductModelBrandId: undefined,
});

interface ProductEntryWizardSessionProps {
  categories: ProductEntryCategoryQueryResult["categories"];
  categoryRequiresDeviceClassByCategory: ProductEntryCategoryQueryResult["categoryRequiresDeviceClassByCategory"];
  categoryLoadError: string | null;
  categoriesLoading: boolean;
  onRetryCategories: () => void;
}

function ProductEntryWizardSession({ categories, categoryRequiresDeviceClassByCategory, categoryLoadError, categoriesLoading, onRetryCategories }: ProductEntryWizardSessionProps) {
  const router = useRouter();
  const workflow = useProductEntryWorkflow();
  const [showCloseDialog, setShowCloseDialog] = useState(false);
  const [deviceClassResult, setDeviceClassResult] = useState<{
    categoryId: string;
    options: ProductEntryDeviceClassOption[];
  } | null>(null);
  const [deviceClassError, setDeviceClassError] = useState<{
    categoryId: string;
    message: string;
  } | null>(null);
  const [productModelResult, setProductModelResult] = useState<{
    contextKey: string;
    options: ProductEntryProductModelOption[];
  } | null>(null);
  const [productModelError, setProductModelError] = useState<{
    contextKey: string;
    message: string;
  } | null>(null);
  const [specificationsResult, setSpecificationsResult] = useState<{
    contextKey: string;
    resolution: ProductEntrySpecificationsResolution;
  } | null>(null);
  const [specificationsError, setSpecificationsError] = useState<{
    contextKey: string;
    message: string;
  } | null>(null);
  const selectedCategoryId = workflow.values.categoryId;
  const currentStepId = workflow.currentStepId;
  const validateCurrentStep = workflow.validateCurrentStep;
  const selectedCategory = categories.find((category) => category.id === selectedCategoryId);

  const loadDeviceClasses = useCallback(() => {
    if (!selectedCategoryId) return;
    setDeviceClassError(null);
    void ProductEntryDeviceClassService.getCompatibleDeviceClasses({
      categoryId: selectedCategoryId,
      companyId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
      workspaceId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId,
    })
      .then((options) => setDeviceClassResult({ categoryId: selectedCategoryId, options }))
      .catch(() => setDeviceClassError({ categoryId: selectedCategoryId, message: "Device types could not be loaded. Try again." }));
  }, [selectedCategoryId]);

  useEffect(() => {
    if (!selectedCategoryId) return;
    void ProductEntryDeviceClassService.getCompatibleDeviceClasses({
      categoryId: selectedCategoryId,
      companyId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
      workspaceId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId,
    })
      .then((options) => setDeviceClassResult({ categoryId: selectedCategoryId, options }))
      .catch(() => setDeviceClassError({ categoryId: selectedCategoryId, message: "Device types could not be loaded. Try again." }));
  }, [selectedCategoryId]);
  const deviceClasses = useMemo(
    () => deviceClassResult?.categoryId === selectedCategoryId
      ? deviceClassResult.options
      : [],
    [deviceClassResult, selectedCategoryId],
  );
  const deviceClassesLoading = Boolean(selectedCategoryId) &&
    deviceClassResult?.categoryId !== selectedCategoryId &&
    deviceClassError?.categoryId !== selectedCategoryId;
  const activeDeviceClassError = deviceClassError?.categoryId === selectedCategoryId
    ? deviceClassError.message
    : null;
  const deviceClassSelectionValid = Boolean(
    workflow.values.deviceClassId &&
    deviceClasses.some((option) => option.id === workflow.values.deviceClassId),
  );
  const categoryRequiresDeviceClass = Boolean(
    selectedCategoryId &&
      categoryRequiresDeviceClassByCategory[selectedCategoryId],
  );
  const productModelContext = useMemo<ProductEntryProductModelContext>(() => ({
    companyId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
    workspaceId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId,
    departmentId: workflow.values.departmentId,
    categoryId: workflow.values.categoryId,
    deviceClassId: workflow.values.deviceClassId,
    categoryRequiresDeviceClass,
  }), [categoryRequiresDeviceClass, workflow.values.categoryId, workflow.values.departmentId, workflow.values.deviceClassId]);
  const productModelContextValid = Boolean(
    productModelContext.departmentId &&
    productModelContext.categoryId &&
    (!productModelContext.categoryRequiresDeviceClass || productModelContext.deviceClassId),
  );
  const productModelContextKey = JSON.stringify(productModelContext);
  const loadProductModels = useCallback(() => {
    if (!productModelContextValid) return;
    setProductModelError(null);
    void ProductEntryProductModelService.getAvailableProductModels(productModelContext)
      .then((options) => setProductModelResult({ contextKey: productModelContextKey, options }))
      .catch(() => setProductModelError({ contextKey: productModelContextKey, message: "Product models could not be loaded. Try again." }));
  }, [productModelContext, productModelContextKey, productModelContextValid]);

  useEffect(() => {
    if (!productModelContextValid) return;
    void ProductEntryProductModelService.getAvailableProductModels(productModelContext)
      .then((options) => setProductModelResult({ contextKey: productModelContextKey, options }))
      .catch(() => setProductModelError({ contextKey: productModelContextKey, message: "Product models could not be loaded. Try again." }));
  }, [productModelContext, productModelContextKey, productModelContextValid]);
  const productModels = useMemo(
    () => productModelResult?.contextKey === productModelContextKey
      ? productModelResult.options
      : [],
    [productModelContextKey, productModelResult],
  );
  const productModelsLoading = productModelContextValid &&
    productModelResult?.contextKey !== productModelContextKey &&
    productModelError?.contextKey !== productModelContextKey;
  const activeProductModelError = productModelError?.contextKey === productModelContextKey
    ? productModelError.message
    : null;
  const selectedDeviceClass = deviceClasses.find(
    (deviceClass) => deviceClass.id === workflow.values.deviceClassId,
  );
  const selectedProductModel = productModels.find(
    (productModel) =>
      productModel.productModelId === workflow.values.productModelId &&
      productModel.brandId === workflow.values.brandId,
  );
  const productModelContextLabel = [selectedDeviceClass?.name, selectedCategory?.name]
    .filter(Boolean)
    .join(" · ");
  const specificationsContext = useMemo(() => ({
    companyId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
    workspaceId: PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId,
    categoryId: workflow.values.categoryId,
    deviceClassId: workflow.values.deviceClassId,
    categoryRequiresDeviceClass,
  }), [categoryRequiresDeviceClass, workflow.values.categoryId, workflow.values.deviceClassId]);
  const specificationsContextKey = JSON.stringify(specificationsContext);
  const loadSpecifications = useCallback(() => {
    setSpecificationsError(null);
    void ProductEntrySpecificationsService.resolve(specificationsContext)
      .then((resolution) => setSpecificationsResult({ contextKey: specificationsContextKey, resolution }))
      .catch(() => setSpecificationsError({ contextKey: specificationsContextKey, message: "Product specification fields could not be loaded. Try again." }));
  }, [specificationsContext, specificationsContextKey]);

  useEffect(() => {
    void ProductEntrySpecificationsService.resolve(specificationsContext)
      .then((resolution) => setSpecificationsResult({ contextKey: specificationsContextKey, resolution }))
      .catch(() => setSpecificationsError({ contextKey: specificationsContextKey, message: "Product specification fields could not be loaded. Try again." }));
  }, [specificationsContext, specificationsContextKey]);
  const specificationsResolution = specificationsResult?.contextKey === specificationsContextKey
    ? specificationsResult.resolution
    : null;
  const specificationsLoading = specificationsResult?.contextKey !== specificationsContextKey &&
    specificationsError?.contextKey !== specificationsContextKey;
  const activeSpecificationsError = specificationsError?.contextKey === specificationsContextKey
    ? specificationsError.message
    : null;

  useEffect(() => {
    if (
      currentStepId !== PRODUCT_ENTRY_STEP_IDS.deviceClass ||
      deviceClassesLoading ||
      activeDeviceClassError
    ) return;
    void validateCurrentStep();
  }, [activeDeviceClassError, currentStepId, deviceClassesLoading, deviceClasses, validateCurrentStep]);

  useEffect(() => {
    if (
      currentStepId !== PRODUCT_ENTRY_STEP_IDS.productModel ||
      !productModelContextValid ||
      productModelsLoading ||
      activeProductModelError
    ) return;
    void validateCurrentStep();
  }, [activeProductModelError, currentStepId, productModelContextValid, productModels, productModelsLoading, validateCurrentStep]);

  useEffect(() => {
    if (
      currentStepId !== PRODUCT_ENTRY_STEP_IDS.specifications ||
      specificationsLoading ||
      activeSpecificationsError
    ) return;
    void validateCurrentStep();
  }, [activeSpecificationsError, currentStepId, specificationsLoading, specificationsResolution, validateCurrentStep, workflow.values.specificationValues]);

  useEffect(() => {
    if (currentStepId !== PRODUCT_ENTRY_STEP_IDS.commercialDetails) return;
    void validateCurrentStep();
  }, [
    currentStepId,
    validateCurrentStep,
    workflow.values.productName,
    workflow.values.productCode,
    workflow.values.retailPrice,
    workflow.values.wholesalePrice,
    workflow.values.currency,
    workflow.values.quantity,
    workflow.values.condition,
    workflow.values.availabilityStatus,
    workflow.values.isFeatured,
    workflow.values.isActive,
  ]);

  const leave = useCallback(() => {
    router.push("/");
  }, [router]);
  const productIdentity = ProductEntryIdentityService.createViewModel({
    values: workflow.values,
    steps: workflow.visibleSteps,
    categoryName: selectedCategory?.name,
    deviceClassName: selectedDeviceClass?.name,
    brandName: selectedProductModel?.brandName,
    productModelName: selectedProductModel?.name,
    specificationsResolution,
    draftSaved: false,
    identityError: Boolean(
      categoryLoadError || activeDeviceClassError || activeProductModelError,
    ),
  });
  const review = ProductEntryReviewService.createViewModel({
    values: workflow.values,
    steps: workflow.visibleSteps,
    specificationsResolution,
    categoryRequiresDeviceClass,
    names: {
      department: selectedCategory?.departmentName,
      category: selectedCategory?.name,
      deviceClass: selectedDeviceClass?.name,
      brand: selectedProductModel?.brandName,
      productModel: selectedProductModel?.name,
    },
  });

  if (workflow.isCompleted) {
    return (
      <ProductEntryCompletion
        onReturnToReview={() => workflow.goToStep(PRODUCT_ENTRY_STEP_IDS.review)}
        onEditProduct={() => workflow.goToStep(PRODUCT_ENTRY_STEP_IDS.category)}
        onHome={() => leave()}
      />
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 sm:py-10">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <ProductEntryWizardHeader
          onClose={() => {
            const started = workflow.completedSteps.length > 0 || workflow.isDirty || workflow.currentStepId !== PRODUCT_ENTRY_STEP_IDS.entryMethod;
            if (started) setShowCloseDialog(true); else leave();
          }}
          onHome={() => {
            const started = workflow.completedSteps.length > 0 || workflow.isDirty || workflow.currentStepId !== PRODUCT_ENTRY_STEP_IDS.entryMethod;
            if (started) setShowCloseDialog(true); else leave();
          }}
        />
        <ProductEntryProgress />
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_18rem] lg:items-start">
          <div className="order-2 min-w-0 lg:order-1">
            <ProductEntryStepContent categories={categories} categoryLoadError={categoryLoadError} categoriesLoading={categoriesLoading} onRetryCategories={onRetryCategories} deviceClasses={deviceClasses} deviceClassLoadError={activeDeviceClassError} deviceClassesLoading={deviceClassesLoading} onRetryDeviceClasses={loadDeviceClasses} productModels={productModels} productModelContextLabel={productModelContextLabel} productModelContextValid={productModelContextValid} productModelLoadError={activeProductModelError} productModelsLoading={productModelsLoading} onRetryProductModels={loadProductModels} specificationsLoadError={activeSpecificationsError} specificationsLoading={specificationsLoading} specificationsResolution={specificationsResolution} onRetrySpecifications={loadSpecifications} review={review} />
          </div>
          <div className="order-1 lg:order-2">
            <ProductIdentityCard identity={productIdentity} />
          </div>
        </div>
        <ProductEntryNavigation deviceClassSelectionValid={deviceClassSelectionValid} reviewReadyToSave={review.readyToSave} />
      </div>
      {showCloseDialog ? (
        <ProductEntryExitDialog
          onContinueEditing={() => setShowCloseDialog(false)}
          onDiscardChanges={leave}
        />
      ) : null}
    </main>
  );
}

export interface ProductEntryInitialContext {
  categoryId?: string;
  departmentId?: string;
  deviceClassId?: string;
  productModelId?: string;
  brandId?: string;
}

interface ProductEntryWizardProps {
  initialContext?: ProductEntryInitialContext;
}

export function ProductEntryWizard({ initialContext }: ProductEntryWizardProps) {
  const [categoryQuery, setCategoryQuery] = useState(EMPTY_CATEGORY_QUERY);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryLoadError, setCategoryLoadError] = useState<string | null>(null);
  const loadCategories = useCallback(() => {
    setCategoriesLoading(true);
    setCategoryLoadError(null);
    void ProductEntryCategoryService.getAvailableCategories(
      PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
      PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId,
    )
      .then(setCategoryQuery)
      .catch(() => setCategoryLoadError("Product types could not be loaded. Try again."))
      .finally(() => setCategoriesLoading(false));
  }, []);
  useEffect(() => {
    void ProductEntryCategoryService.getAvailableCategories(
      PRODUCT_ENTRY_DEVELOPMENT_SCOPE.companyId,
      PRODUCT_ENTRY_DEVELOPMENT_SCOPE.workspaceId,
    )
      .then(setCategoryQuery)
      .catch(() => setCategoryLoadError("Product types could not be loaded. Try again."))
      .finally(() => setCategoriesLoading(false));
  }, []);
  const workflowContext = useMemo(
    () => createDevelopmentWorkflowContext(categoryQuery),
    [categoryQuery],
  );
  const createInitialValues = useCallback(() => ({
    ...createInitialProductEntryState(),
    categoryId: initialContext?.categoryId ?? null,
    departmentId: initialContext?.departmentId ?? null,
    deviceClassId: initialContext?.deviceClassId ?? null,
    productModelId: initialContext?.productModelId ?? null,
    brandId: initialContext?.brandId ?? null,
  }), [initialContext]);

  return (
    <ProductEntryWorkflowProvider
      context={workflowContext}
      createInitialValues={createInitialValues}
      initialStep={PRODUCT_ENTRY_STEP_IDS.entryMethod}
      workflow={productEntryWorkflow}
    >
      <ProductEntryWizardSession categories={categoryQuery.categories} categoryRequiresDeviceClassByCategory={categoryQuery.categoryRequiresDeviceClassByCategory} categoryLoadError={categoryLoadError} categoriesLoading={categoriesLoading} onRetryCategories={loadCategories} />
    </ProductEntryWorkflowProvider>
  );
}
