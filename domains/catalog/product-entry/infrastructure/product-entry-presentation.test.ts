import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import test from "node:test";
import { createElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import type { SubmitProductEntryCommand } from "../application/product-entry-command";
import type { ProductEntryLocalDraftIdentity, ProductEntryLocalDraftMediaDescriptor } from "../drafts/product-entry-local-draft.types";
import { computeProductEntryMediaHash } from "./browser/product-entry-media-hash";
import { ProductEntryMediaFileRegistry } from "./browser/product-entry-media-file.registry";
import type { ProductEntryHashWorkerLike } from "./browser/worker-product-entry-media-hashing.adapter";
import { WorkerProductEntryMediaHashingAdapter } from "./browser/worker-product-entry-media-hashing.adapter";
import { HttpProductEntryMediaClient, HttpProductEntrySubmissionClient, HttpProductEntryTrustedClientContextAdapter } from "./browser/http-product-entry-clients";
import { buildProductEntryLocalDraftSaveInput, buildSubmitProductEntryCommand } from "../presentation/product-entry-presentation.mapper";
import { productEntryPresentationReducer } from "../presentation/product-entry-presentation.reducer";
import { ProductEntryTwoPhaseSaveCoordinator } from "../presentation/product-entry-save.coordinator";
import { ProductEntryAddNewTransition } from "../presentation/product-entry-add-new.transition";
import { formatProductEntryWesternNumber, PRODUCT_ENTRY_PRESENTATION_DIRECTION, PRODUCT_ENTRY_PRESENTATION_TEXT, resolveProductEntryReferenceDataLoadError } from "../presentation/product-entry-i18n";
import type { ProductEntryMediaClient, ProductEntryMediaStatusView, ProductEntryProductSaveReceipt, ProductEntrySubmissionClient, ProductEntryTrustedClientContext } from "../presentation/product-entry-presentation.types";
import { createInitialProductEntryState, PRODUCT_ENTRY_STEP_IDS, type ProductEntryWorkflowContext } from "../product-entry.types";
import { productEntryWorkflow } from "../product-entry.workflow";
import { ProductEntryWorkflowProvider } from "../react/product-entry-workflow-adapter";
import { ProductEntryBrowserMediaProvider } from "../react/product-entry-media-adapter";
import { ProductImagesStep } from "../components/steps/ProductImagesStep";
import { CommercialDetailsStep } from "../components/steps/CommercialDetailsStep";
import { CategoryStep } from "../components/steps/CategoryStep";
import { DeviceClassStep } from "../components/steps/DeviceClassStep";
import { ProductModelStep } from "../components/steps/ProductModelStep";
import { SpecificationsStep } from "../components/steps/SpecificationsStep";
import { ProductReviewStep } from "../components/steps/ProductReviewStep";
import { ProductEntryProgress } from "../components/ProductEntryProgress";
import { ProductEntryExitDialog } from "../components/ProductEntryExitDialog";
import { ProductEntryRecoveryDialog } from "../components/ProductEntryRecoveryDialog";
import { ProductEntryRevisionConflictDialog } from "../components/ProductEntryRevisionConflictDialog";
import { ProductEntryImagesService } from "../services/product-entry-images.service";
import type { ProductEntryReviewViewModel } from "../services/product-entry-review.service";
import type { ProductEntryMediaHashWorkerRequest, ProductEntryMediaHashWorkerResponse } from "./browser/product-entry-media-hash-worker.messages";

const receipt: ProductEntryProductSaveReceipt = {
  submissionId: "submission-1", productId: "product-1", productRevision: 2,
  idempotentReplay: false, outcome: "SavedAsDraft", lifecycleState: "Draft",
};
const status = (overrides: Partial<ProductEntryMediaStatusView> = {}): ProductEntryMediaStatusView => ({
  submissionId: receipt.submissionId, submissionStatus: "ProductSaved", productId: receipt.productId,
  workflowStatus: null, plannedOperationIds: ["operation-1"], requiredSourceOperationIds: ["operation-1"],
  retryableOperationIds: [], requiresNewSourceOperationIds: [], operations: [], canReplaceSource: false, ...overrides,
});
const command = (media = true): SubmitProductEntryCommand => ({
  submissionId: receipt.submissionId,
  mode: "Create",
  draft: { catalogId: "catalog-1", commercialDetails: {} },
  mediaOperations: media ? [{
    operationId: "operation-1", operationType: "Add", sequence: 0, mediaId: null,
    requestedDisplayOrder: 0, selectedAsCover: true,
    expectedSourceSha256: "a".repeat(64), expectedSourceByteLength: 3, finalOrder: 0,
  }] : [],
});

test("two-phase retry preserves submission ID and never repeats Product save for Media retry", async () => {
  let phaseOneCalls = 0;
  let statusCalls = 0;
  let uploadCalls = 0;
  const submission: ProductEntrySubmissionClient = {
    async submit(input) {
      phaseOneCalls += 1;
      assert.equal(input.submissionId, "submission-1");
      return { type: "Accepted", receipt };
    },
  };
  const media: ProductEntryMediaClient = {
    async getStatus() { statusCalls += 1; return { type: "Found", status: status() }; },
    async upload(_submissionId, sources) {
      uploadCalls += 1;
      assert.deepEqual(sources.map((source) => source.operationId), ["operation-1"]);
      return { type: "Completed", status: status({ submissionStatus: "Completed", workflowStatus: "Completed", requiredSourceOperationIds: [] }), idempotentReplay: false, resumed: true };
    },
  };
  const coordinator = new ProductEntryTwoPhaseSaveCoordinator(submission, media);
  const first = await coordinator.save(command(), () => ({ type: "Missing", operationIds: ["operation-1"] }));
  assert.equal(first.type, "MediaRequiresSources");
  const file = new File(["abc"], "a.jpg", { type: "image/jpeg" });
  const retried = await coordinator.retryMedia(() => ({ type: "Ready", sources: [{ operationId: "operation-1", file, sha256: "a".repeat(64), byteLength: 3 }] }));
  assert.equal(retried.type, "Completed");
  assert.equal(phaseOneCalls, 1);
  assert.equal(statusCalls, 2);
  assert.equal(uploadCalls, 1);
});

test("no-media save skips Phase 2 and completed replay uploads zero files", async () => {
  let mediaCalls = 0;
  const submission: ProductEntrySubmissionClient = { async submit() { return { type: "Accepted", receipt }; } };
  const media: ProductEntryMediaClient = {
    async getStatus() { mediaCalls += 1; return { type: "Found", status: status({ submissionStatus: "Completed", workflowStatus: "Completed", requiredSourceOperationIds: [] }) }; },
    async upload() { mediaCalls += 1; throw new Error("must not upload"); },
  };
  const withoutMedia = new ProductEntryTwoPhaseSaveCoordinator(submission, media);
  assert.equal((await withoutMedia.save(command(false), () => ({ type: "Ready", sources: [] }))).type, "Completed");
  assert.equal(mediaCalls, 0);
  const replay = new ProductEntryTwoPhaseSaveCoordinator(submission, media);
  assert.equal((await replay.save(command(), () => ({ type: "Missing", operationIds: ["operation-1"] }))).type, "Completed");
  assert.equal(mediaCalls, 1);
});

test("retained staging retry permits zero-file upload and replacement source resumes without repeating Product save", async () => {
  let suppliedCount = -1;
  const submission: ProductEntrySubmissionClient = { async submit() { return { type: "Accepted", receipt }; } };
  const retained: ProductEntryMediaClient = {
    async getStatus() { return { type: "Found", status: status({ requiredSourceOperationIds: [], retryableOperationIds: ["operation-1"] }) }; },
    async upload(_id, sources) { suppliedCount = sources.length; return { type: "PartiallyCompleted", status: status({ requiredSourceOperationIds: [] }), idempotentReplay: false, resumed: true }; },
  };
  const result = await new ProductEntryTwoPhaseSaveCoordinator(submission, retained).save(command(), () => ({ type: "Ready", sources: [] }));
  assert.equal(result.type, "MediaPartiallyCompleted");
  assert.equal(suppliedCount, 0);

  const newSource: ProductEntryMediaClient = {
    async getStatus() { return { type: "Found", status: status({ requiredSourceOperationIds: ["operation-1"], requiresNewSourceOperationIds: ["operation-1"], canReplaceSource: true }) }; },
    async upload(_id, sources) {
      assert.equal(sources[0]?.operationId, "operation-1");
      return { type: "Completed", status: status({ submissionStatus: "Completed", workflowStatus: "Completed", requiredSourceOperationIds: [] }), idempotentReplay: true, resumed: true };
    },
  };
  const file = new File(["new"], "new.png", { type: "image/png" });
  const unavailable = await new ProductEntryTwoPhaseSaveCoordinator(submission, newSource).save(command(), (_ids, replacements) => {
    assert.deepEqual(replacements, ["operation-1"]);
    return { type: "Ready", sources: [{ operationId: "operation-1", file, sha256: "b".repeat(64), byteLength: 3 }] };
  });
  assert.equal(unavailable.type, "Completed");
});

test("Product revision conflict and Product/Media outcomes remain explicit reducer states", () => {
  const conflict = productEntryPresentationReducer({ type: "Editing", revalidationRequired: false }, {
    type: "ShowRevisionConflict", productId: "product-1", baseRevision: 1, currentRevision: 2, source: "PhaseOne",
  });
  assert.deepEqual(conflict, { type: "RevisionConflict", productId: "product-1", baseRevision: 1, currentRevision: 2, source: "PhaseOne" });
  const partial = productEntryPresentationReducer(conflict, { type: "MediaPartial", receipt, status: null, code: "MEDIA_PARTIALLY_COMPLETED" });
  assert.equal(partial.type, "MediaPartiallyCompleted");
  assert.equal(partial.receipt.productId, "product-1");
});

test("Add New preserves the current session on establishment failure and cleans only after success", async () => {
  const transition = new ProductEntryAddNewTransition();
  const events: string[] = [];
  const identity = (submissionId: string) => ({ mode: "Create" as const, workspaceId: "workspace-1", actorId: "actor-1", submissionId });
  const rejected = await transition.execute({
    establishNextSession: async () => { events.push("establish-failed"); return { type: "Rejected", code: "SubmissionIdAllocationFailed" }; },
    afterEstablished: () => events.push("cleanup"),
  });
  assert.deepEqual(rejected, { type: "Rejected", code: "SubmissionIdAllocationFailed" });
  assert.deepEqual(events, ["establish-failed"]);

  let release!: (result: { type: "Started"; identity: ReturnType<typeof identity> }) => void;
  const pendingIdentity = new Promise<{ type: "Started"; identity: ReturnType<typeof identity> }>((resolve) => { release = resolve; });
  const first = transition.execute({
    establishNextSession: () => pendingIdentity,
    afterEstablished: (next) => events.push(`cleanup:${next.submissionId}`),
  });
  assert.deepEqual(
    await transition.execute({ establishNextSession: async () => ({ type: "Started", identity: identity("forbidden") }), afterEstablished: () => events.push("parallel-cleanup") }),
    { type: "AlreadyInProgress" },
  );
  release({ type: "Started", identity: identity("submission-2") });
  assert.deepEqual(await first, { type: "Started", identity: identity("submission-2") });
  assert.deepEqual(events, ["establish-failed", "cleanup:submission-2"]);
});

test("Arabic and English presentation contracts use RTL/LTR and Western digits", () => {
  assert.equal(PRODUCT_ENTRY_PRESENTATION_DIRECTION.ar, "rtl");
  assert.equal(PRODUCT_ENTRY_PRESENTATION_DIRECTION.en, "ltr");
  assert.equal(PRODUCT_ENTRY_PRESENTATION_TEXT.ar.saveProduct, "حفظ المنتج");
  assert.equal(formatProductEntryWesternNumber(1234.5, "ar"), "1234.5");
});

test("actual Product Images and Commercial Details component output is centralized and bilingual", () => {
  const context: ProductEntryWorkflowContext = {
    companyId: "company-1", workspaceId: "workspace-1",
    categoryRequiresDeviceClassByCategory: {}, deviceClassIdsByCategory: {},
    brandIdByProductModel: {}, productModelIdsByCategory: {}, productModelIdsByCategoryAndDeviceClass: {},
    specificationFieldIdsByCategory: {}, specificationFieldIdsByCategoryAndDeviceClass: {},
    selectOptionValuesBySpecificationField: {}, requiredSpecificationFieldIds: [], compatibleSpecificationFieldIds: [],
    compatibleDeviceClassIds: [], compatibleProductModelIds: [],
  };
  const renderStep = (
    step: typeof PRODUCT_ENTRY_STEP_IDS.images | typeof PRODUCT_ENTRY_STEP_IDS.commercialDetails,
    child: ReactNode,
  ) => renderToStaticMarkup(createElement(ProductEntryWorkflowProvider, {
    context,
    createInitialValues: createInitialProductEntryState,
    initialStep: step,
    workflow: productEntryWorkflow,
    ...{ children: child },
  }));
  const imagesArabic = renderStep(PRODUCT_ENTRY_STEP_IDS.images,
    createElement(ProductEntryBrowserMediaProvider, null, createElement(ProductImagesStep, { locale: "ar" })));
  assert.match(imagesArabic, /صور المنتج/);
  assert.match(imagesArabic, /إضافة صور/);
  assert.doesNotMatch(imagesArabic, />Add images</);
  const commercialArabic = renderStep(PRODUCT_ENTRY_STEP_IDS.commercialDetails,
    createElement(CommercialDetailsStep, { locale: "ar" }));
  assert.match(commercialArabic, /إضافة التفاصيل التجارية/);
  assert.match(commercialArabic, /سعر التجزئة/);
  assert.doesNotMatch(commercialArabic, />Retail Price</);
  const imagesEnglish = renderStep(PRODUCT_ENTRY_STEP_IDS.images,
    createElement(ProductEntryBrowserMediaProvider, null, createElement(ProductImagesStep, { locale: "en" })));
  assert.match(imagesEnglish, /Product media/);
});

test("every reference-data failure renders localized component output", () => {
  const context: ProductEntryWorkflowContext = {
    companyId: "company-1", workspaceId: "workspace-1",
    categoryRequiresDeviceClassByCategory: { "category-1": true }, deviceClassIdsByCategory: { "category-1": ["device-class-1"] },
    brandIdByProductModel: { "model-1": "brand-1" }, productModelIdsByCategory: { "category-1": ["model-1"] },
    productModelIdsByCategoryAndDeviceClass: { "category-1": { "device-class-1": ["model-1"] } },
    specificationFieldIdsByCategory: {}, specificationFieldIdsByCategoryAndDeviceClass: {},
    selectOptionValuesBySpecificationField: {}, requiredSpecificationFieldIds: [], compatibleSpecificationFieldIds: [],
    compatibleDeviceClassIds: [], compatibleProductModelIds: [],
  };
  const createReferenceDataTestValues = () => ({
    ...createInitialProductEntryState(),
    categoryId: "category-1",
    deviceClassId: "device-class-1",
    brandId: "brand-1",
    productModelId: "model-1",
  });
  const render = (step: (typeof PRODUCT_ENTRY_STEP_IDS)[keyof typeof PRODUCT_ENTRY_STEP_IDS], child: ReactNode) =>
    renderToStaticMarkup(createElement(ProductEntryWorkflowProvider, {
      context, createInitialValues: createReferenceDataTestValues, initialStep: step, workflow: productEntryWorkflow,
      ...{ children: child },
    }));
  const scenarios = [
    { code: "ProductClassificationsLoadFailed" as const, step: PRODUCT_ENTRY_STEP_IDS.category, component: (message: string, locale: "en" | "ar") => createElement(CategoryStep, { categories: [], loadError: message, loading: false, locale, onRetry: () => undefined }) },
    { code: "DeviceTypesLoadFailed" as const, step: PRODUCT_ENTRY_STEP_IDS.deviceClass, component: (message: string, locale: "en" | "ar") => createElement(DeviceClassStep, { deviceClasses: [], loadError: message, loading: false, locale, onRetry: () => undefined }) },
    { code: "ProductModelsLoadFailed" as const, step: PRODUCT_ENTRY_STEP_IDS.productModel, component: (message: string, locale: "en" | "ar") => createElement(ProductModelStep, { contextLabel: "", contextValid: true, loadError: message, loading: false, locale, onRetry: () => undefined, productModels: [] }) },
    { code: "SpecificationFieldsLoadFailed" as const, step: PRODUCT_ENTRY_STEP_IDS.specifications, component: (message: string, locale: "en" | "ar") => createElement(SpecificationsStep, { loadError: message, loading: false, locale, onRetry: () => undefined, resolution: null }) },
  ];
  for (const scenario of scenarios) {
    const english = resolveProductEntryReferenceDataLoadError(scenario.code, PRODUCT_ENTRY_PRESENTATION_TEXT.en);
    const arabic = resolveProductEntryReferenceDataLoadError(scenario.code, PRODUCT_ENTRY_PRESENTATION_TEXT.ar);
    const englishOutput = render(scenario.step, scenario.component(english, "en"));
    const arabicOutput = render(scenario.step, scenario.component(arabic, "ar"));
    assert.match(englishOutput, new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.match(arabicOutput, new RegExp(arabic));
    assert.doesNotMatch(arabicOutput, new RegExp(english.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  }
});

test("major accessibility labels render in both Arabic and English", () => {
  const context: ProductEntryWorkflowContext = {
    companyId: "company-1", workspaceId: "workspace-1", categoryRequiresDeviceClassByCategory: {}, deviceClassIdsByCategory: {},
    brandIdByProductModel: {}, productModelIdsByCategory: {}, productModelIdsByCategoryAndDeviceClass: {},
    specificationFieldIdsByCategory: {}, specificationFieldIdsByCategoryAndDeviceClass: {}, selectOptionValuesBySpecificationField: {},
    requiredSpecificationFieldIds: [], compatibleSpecificationFieldIds: [], compatibleDeviceClassIds: [], compatibleProductModelIds: [],
  };
  const review: ProductEntryReviewViewModel = {
    overallStatus: "Ready to Save", overallExplanation: "Ready", readyToSave: true,
    customerStatus: "Ready for Customer", customerExplanation: "Ready", blockingErrors: [], warnings: [],
    identity: { values: [], editStepId: PRODUCT_ENTRY_STEP_IDS.category },
    specifications: { requiredCompleted: 0, requiredTotal: 0, optionalCompleted: 0, optionalTotal: 0, values: [], missing: [] },
    commercial: { values: [] }, images: { count: 0, mainStatus: "Not selected", values: [] },
    quality: { score: 100, maximum: 100, label: "Ready", policyVersion: "1", categories: [] },
  };
  const imageValues = () => ({
    ...createInitialProductEntryState(),
    images: [{
      id: "existing-a", operationId: null, operationType: null, mediaId: "media-a",
      originalIsPrimary: true, originalSortOrder: 0, reorderOperationId: null, setCoverOperationId: null,
      isPrimary: true, sortOrder: 0, fileName: null, mimeType: null, sizeBytes: null,
      expectedSourceSha256: null, expectedSourceByteLength: null, sourceAvailability: "NotRequired" as const,
      hashStatus: "NotRequired" as const, sourceErrorCode: null,
    }],
  });
  const renderWorkflow = (step: (typeof PRODUCT_ENTRY_STEP_IDS)[keyof typeof PRODUCT_ENTRY_STEP_IDS], child: ReactNode, values = createInitialProductEntryState) =>
    renderToStaticMarkup(createElement(ProductEntryWorkflowProvider, { context, createInitialValues: values, initialStep: step, workflow: productEntryWorkflow, ...{ children: child } }));
  for (const locale of ["en", "ar"] as const) {
    const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
    const reviewOutput = renderWorkflow(PRODUCT_ENTRY_STEP_IDS.review, createElement(ProductReviewStep, { locale, review }));
    assert.match(reviewOutput, new RegExp(`aria-label="${text.productReviewStatus}"`));
    const progressOutput = renderWorkflow(PRODUCT_ENTRY_STEP_IDS.entryMethod, createElement(ProductEntryProgress, { locale }));
    assert.match(progressOutput, new RegExp(`aria-label="${text.productEntryProgress}"`));
    const mediaOutput = renderWorkflow(PRODUCT_ENTRY_STEP_IDS.images,
      createElement(ProductEntryBrowserMediaProvider, null, createElement(ProductImagesStep, { locale })), imageValues);
    assert.match(mediaOutput, new RegExp(text.mediaControlsFor));
    const exitOutput = renderToStaticMarkup(createElement(ProductEntryExitDialog, { locale, onContinueEditing: () => undefined, onDiscardChanges: () => undefined }));
    assert.match(exitOutput, new RegExp(text.leaveProductEntry.replace("?", "\\?")));
    const conflictOutput = renderToStaticMarkup(createElement(ProductEntryRevisionConflictDialog, { baseRevision: 1, currentRevision: 2, locale, canReviewLocal: false, onCancel: () => undefined, onDiscardAndReload: () => undefined }));
    assert.match(conflictOutput, new RegExp(text.revisionConflict));
    const recoveryOutput = renderToStaticMarkup(createElement(ProductEntryRecoveryDialog, { locale, updatedAt: 0, onRestore: () => undefined, onDiscard: () => undefined, onContinue: () => undefined }));
    assert.match(recoveryOutput, new RegExp(text.localDraftFound));
  }
});

test("Product Entry Presentation source contains no known hardcoded English literals", () => {
  const roots = [
    "domains/catalog/product-entry/components", "domains/catalog/product-entry/presentation", "domains/catalog/product-entry/react",
    "app/products/new", "app/products/[productId]/edit",
  ].map((path) => join(process.cwd(), path));
  const files = (directory: string): string[] => readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) return files(path);
    return /\.(ts|tsx)$/.test(entry.name) && !entry.name.includes(".test.") && entry.name !== "product-entry-i18n.ts" ? [path] : [];
  });
  const forbidden = [
    "Device types could not be loaded. Try again.",
    "Product models could not be loaded. Try again.",
    "Product specification fields could not be loaded. Try again.",
    "Product classifications could not be loaded. Try again.",
    'aria-label="Product review status"',
  ];
  for (const path of roots.flatMap(files)) {
    const source = readFileSync(path, "utf8");
    forbidden.forEach((literal) => assert.equal(source.includes(literal), false, `${literal} remains in ${path}`));
  }
});

test("source replacement is bilingual, responsive, and never persists raw browser file data", () => {
  assert.equal(PRODUCT_ENTRY_PRESENTATION_TEXT.en.chooseReplacementFile, "Choose replacement file");
  assert.equal(PRODUCT_ENTRY_PRESENTATION_TEXT.ar.chooseReplacementFile, "اختيار ملف بديل");
  const paths = [
    "domains/catalog/product-entry/components/ProductEntryWizard.tsx",
    "domains/catalog/product-entry/react/product-entry-media-adapter.tsx",
    "domains/catalog/product-entry/infrastructure/browser/product-entry-media-file.registry.ts",
    "domains/catalog/product-entry/infrastructure/browser/http-product-entry-clients.ts",
  ].map((path) => join(process.cwd(), path));
  const combined = paths.map((path) => readFileSync(path, "utf8")).join("\n");
  assert.doesNotMatch(combined, /(?:localStorage|sessionStorage)\s*\.\s*setItem/);
  assert.doesNotMatch(combined, /indexedDB\s*\.\s*open/);
  assert.doesNotMatch(combined, /(?:btoa|base64)\s*\(/i);
  assert.match(combined, /grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3/);
  assert.match(combined, /min-h-11 w-full/);
  assert.match(combined, /type="file"/);
});

test("Media service maps source and metadata operations deterministically with stable IDs", () => {
  const allocated = ["add-1", "add-2", "reorder-1", "remove-1"];
  const service = new ProductEntryImagesService(() => allocated.shift() ?? "fallback");
  let images = service.add([], [
    { fileName: "a.jpg", mimeType: "image/jpeg", byteLength: 3 },
    { fileName: "b.png", mimeType: "image/png", byteLength: 4 },
  ]);
  assert.deepEqual(images.map((image) => image.operationId), ["add-1", "add-2"]);
  images = service.move(images, "operation:add-2", -1);
  images = service.setPrimary(images, "operation:add-2");
  const descriptors = service.toLocalDraftDescriptors(images);
  assert.deepEqual(descriptors.map((item) => [item.operationId, item.finalOrder, item.selectedAsCover]), [
    ["add-2", 0, true], ["add-1", 1, false],
  ]);
  assert.equal(descriptors.filter((item) => item.selectedAsCover).length, 1);

  const existing = service.createExisting([{ mediaId: "media-1", displayOrder: 0, isMain: true }]);
  const reordered = service.move([...existing, ...images], "media:media-1", 1);
  const changed = reordered.find((image) => image.mediaId === "media-1")!;
  assert.equal(changed.operationType, null);
  assert.equal(changed.sourceAvailability, "NotRequired");
  assert.equal(changed.reorderOperationId, "reorder-1");
  assert.equal(service.toLocalDraftDescriptors(reordered).find((item) => item.operationId === "reorder-1")?.operationType, "Reorder");
  const removed = service.remove(reordered, changed.id);
  assert.equal(removed.find((image) => image.mediaId === "media-1")?.operationType, "Remove");
});

test("existing Media order and cover changes are zero-file operations and reversal removes the operation", () => {
  const allocated = ["reorder-a", "reorder-b", "cover-b"];
  const service = new ProductEntryImagesService(() => allocated.shift() ?? "unexpected");
  const original = service.createExisting([
    { mediaId: "a", displayOrder: 0, isMain: true },
    { mediaId: "b", displayOrder: 1, isMain: false },
  ]);
  const moved = service.move(original, "media:b", -1);
  const covered = service.setPrimary(moved, "media:b");
  const descriptors = service.toLocalDraftDescriptors(covered);
  assert.deepEqual(descriptors.map((item) => item.operationType), ["Reorder", "Reorder", "SetCover"]);
  assert.equal(descriptors.every((item) => item.sourceAvailability === "NotRequired"), true);
  assert.equal(descriptors.every((item) => item.expectedSourceSha256 === null), true);
  const restoredCover = service.setPrimary(covered, "media:a");
  const restoredOrder = service.move(restoredCover, "media:b", 1);
  assert.deepEqual(service.toLocalDraftDescriptors(restoredOrder), []);
});

test("restored Add/Replace descriptors require reselection and local draft payload contains no File or object URL", () => {
  const service = new ProductEntryImagesService(() => "unused");
  const descriptor: ProductEntryLocalDraftMediaDescriptor = {
    operationId: "operation-1", operationType: "Add", sequence: 0, mediaId: null,
    requestedDisplayOrder: 0, selectedAsCover: true, expectedSourceSha256: "a".repeat(64),
    expectedSourceByteLength: 3, finalOrder: 0, fileName: "a.jpg", mimeType: "image/jpeg",
    sourceAvailability: "RequiresReselection",
  };
  const images = service.restore([], [descriptor]);
  assert.equal(images[0].sourceAvailability, "RequiresReselection");
  const context: ProductEntryTrustedClientContext = { companyId: "company-1", workspaceId: "workspace-1", actorId: "actor-1", catalogId: "catalog-1", locale: "en" };
  const identity: ProductEntryLocalDraftIdentity = { mode: "Create", workspaceId: context.workspaceId, actorId: context.actorId, submissionId: "submission-1" };
  const input = buildProductEntryLocalDraftSaveInput(identity, { ...createInitialProductEntryState(), images }, context, service);
  const serialized = JSON.stringify(input);
  assert.doesNotMatch(serialized, /blob:|arraybuffer|filesystem:/i);
  assert.equal(Object.values(input).some((value) => value instanceof File), false);
  const mismatch = service.applyHash(images, "operation-1", "b".repeat(64), 3);
  assert.equal(mismatch.matchedPersistedSource, false);
  assert.equal(mismatch.images[0].sourceErrorCode, "MEDIA_RESELECTED_SOURCE_MISMATCH");
});

test("restored Reorder and SetCover descriptors remain zero-file and preserve stable operation IDs", () => {
  const service = new ProductEntryImagesService(() => "unused");
  const server = service.createExisting([
    { mediaId: "a", displayOrder: 0, isMain: true },
    { mediaId: "b", displayOrder: 1, isMain: false },
  ]);
  const descriptors: ProductEntryLocalDraftMediaDescriptor[] = [
    { operationId: "reorder-b", operationType: "Reorder", sequence: 0, mediaId: "b", requestedDisplayOrder: 0, selectedAsCover: false, expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: 0, fileName: null, mimeType: null, sourceAvailability: "NotRequired" },
    { operationId: "reorder-a", operationType: "Reorder", sequence: 1, mediaId: "a", requestedDisplayOrder: 1, selectedAsCover: false, expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: 1, fileName: null, mimeType: null, sourceAvailability: "NotRequired" },
    { operationId: "cover-b", operationType: "SetCover", sequence: 2, mediaId: "b", requestedDisplayOrder: null, selectedAsCover: true, expectedSourceSha256: null, expectedSourceByteLength: null, finalOrder: null, fileName: null, mimeType: null, sourceAvailability: "NotRequired" },
  ];
  const restored = service.restore(server, descriptors);
  assert.deepEqual(service.toLocalDraftDescriptors(restored), descriptors);
  assert.equal(restored.every((image) => image.sourceAvailability === "NotRequired"), true);
  assert.equal(restored.every((image) => image.hashStatus === "NotRequired"), true);
});

test("in-memory Media registry revokes replaced, removed and cleared object URLs", () => {
  const revoked: string[] = [];
  let number = 0;
  const registry = new ProductEntryMediaFileRegistry({
    createObjectURL: () => `blob:preview-${++number}`,
    revokeObjectURL: (url) => revoked.push(url),
  });
  const first = new File(["abc"], "a.jpg", { type: "image/jpeg" });
  const second = new File(["def"], "b.jpg", { type: "image/jpeg" });
  assert.equal(registry.select("operation-1", first).type, "Selected");
  registry.select("operation-1", second);
  assert.deepEqual(revoked, ["blob:preview-1"]);
  registry.select("operation-2", first);
  registry.remove("operation-1");
  registry.clear();
  assert.deepEqual(revoked, ["blob:preview-1", "blob:preview-2", "blob:preview-3"]);
});

test("native Web Crypto hash is lowercase SHA-256 with byte length", async () => {
  const result = await computeProductEntryMediaHash(new File(["abc"], "a.jpg", { type: "image/jpeg" }));
  assert.equal(result.sha256, "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
  assert.equal(result.byteLength, 3);
  assert.match(result.sha256, /^[a-f0-9]{64}$/);
});

class FakeHashWorker implements ProductEntryHashWorkerLike {
  readonly requests: ProductEntryMediaHashWorkerRequest[] = [];
  readonly listeners = new Set<(event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void>();
  readonly failureListeners = new Map<"error" | "messageerror", Set<(event: Event) => void>>([
    ["error", new Set()], ["messageerror", new Set()],
  ]);
  terminated = false;
  throwOnPost = false;
  postMessage(message: ProductEntryMediaHashWorkerRequest): void {
    if (this.throwOnPost) throw new Error("post failed");
    this.requests.push(message);
  }
  addEventListener(type: "message", listener: (event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void): void;
  addEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  addEventListener(type: "message" | "error" | "messageerror", listener: ((event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void) | ((event: Event) => void)): void {
    if (type === "message") this.listeners.add(listener as (event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void);
    else this.failureListeners.get(type)!.add(listener as (event: Event) => void);
  }
  removeEventListener(type: "message", listener: (event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void): void;
  removeEventListener(type: "error" | "messageerror", listener: (event: Event) => void): void;
  removeEventListener(type: "message" | "error" | "messageerror", listener: ((event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void) | ((event: Event) => void)): void {
    if (type === "message") this.listeners.delete(listener as (event: MessageEvent<ProductEntryMediaHashWorkerResponse>) => void);
    else this.failureListeners.get(type)!.delete(listener as (event: Event) => void);
  }
  terminate(): void { this.terminated = true; }
  emit(response: ProductEntryMediaHashWorkerResponse): void { this.listeners.forEach((listener) => listener({ data: response } as MessageEvent<ProductEntryMediaHashWorkerResponse>)); }
  fail(type: "error" | "messageerror"): void { this.failureListeners.get(type)!.forEach((listener) => listener(new Event(type))); }
}

test("hash adapter ignores stale results and disposal cancels pending work", async () => {
  const worker = new FakeHashWorker();
  let request = 0;
  const adapter = new WorkerProductEntryMediaHashingAdapter({ maximumConcurrency: 1, workerFactory: () => worker, requestIdFactory: () => `request-${++request}` });
  const first = adapter.hash("operation-1", new File(["a"], "a.jpg", { type: "image/jpeg" }));
  const second = adapter.hash("operation-1", new File(["b"], "b.jpg", { type: "image/jpeg" }));
  assert.equal((await first).type, "Rejected");
  worker.emit({ type: "Hashed", requestId: "request-1", operationId: "operation-1", sha256: "a".repeat(64), byteLength: 1 });
  worker.emit({ type: "Hashed", requestId: "request-2", operationId: "operation-1", sha256: "b".repeat(64), byteLength: 1 });
  const result = await second;
  assert.deepEqual(result, { type: "Hashed", operationId: "operation-1", sha256: "b".repeat(64), byteLength: 1 });
  const pending = adapter.hash("operation-2", new File(["c"], "c.jpg", { type: "image/jpeg" }));
  adapter.dispose();
  assert.deepEqual(await pending, { type: "Rejected", operationId: "operation-2", code: "MEDIA_HASH_CANCELLED" });
  assert.equal(worker.terminated, true);
  const unavailable = new WorkerProductEntryMediaHashingAdapter({ workerFactory: () => { throw new Error("unsupported"); } });
  assert.deepEqual(await unavailable.hash("operation-3", new File(["d"], "d.jpg", { type: "image/jpeg" })), { type: "Rejected", operationId: "operation-3", code: "MEDIA_HASH_UNAVAILABLE" });
});

for (const terminalEvent of ["error", "messageerror"] as const) {
  test(`hash adapter terminally rejects active and queued work after Worker ${terminalEvent}`, async () => {
    const worker = new FakeHashWorker();
    let request = 0;
    const adapter = new WorkerProductEntryMediaHashingAdapter({
      maximumConcurrency: 1,
      workerFactory: () => worker,
      requestIdFactory: () => `terminal-${++request}`,
    });
    const active = adapter.hash("active", new File(["a"], "a.jpg", { type: "image/jpeg" }));
    const queued = adapter.hash("queued", new File(["b"], "b.jpg", { type: "image/jpeg" }));
    worker.fail(terminalEvent);
    assert.deepEqual(await active, { type: "Rejected", operationId: "active", code: "MEDIA_HASH_FAILED" });
    assert.deepEqual(await queued, { type: "Rejected", operationId: "queued", code: "MEDIA_HASH_FAILED" });
    assert.equal(worker.terminated, true);
    assert.equal(worker.listeners.size, 0);
    assert.equal(worker.failureListeners.get("error")!.size, 0);
    assert.equal(worker.failureListeners.get("messageerror")!.size, 0);
    assert.deepEqual(
      await adapter.hash("later", new File(["c"], "c.jpg", { type: "image/jpeg" })),
      { type: "Rejected", operationId: "later", code: "MEDIA_HASH_FAILED" },
    );
    worker.emit({ type: "Hashed", requestId: "terminal-1", operationId: "active", sha256: "a".repeat(64), byteLength: 1 });
  });
}

test("hash adapter treats postMessage failure as terminal and disposal stays cancelled", async () => {
  const worker = new FakeHashWorker();
  worker.throwOnPost = true;
  const adapter = new WorkerProductEntryMediaHashingAdapter({ workerFactory: () => worker, requestIdFactory: () => "post" });
  assert.deepEqual(
    await adapter.hash("post", new File(["a"], "a.jpg", { type: "image/jpeg" })),
    { type: "Rejected", operationId: "post", code: "MEDIA_HASH_FAILED" },
  );
  const disposableWorker = new FakeHashWorker();
  const disposable = new WorkerProductEntryMediaHashingAdapter({ workerFactory: () => disposableWorker });
  disposable.dispose();
  assert.deepEqual(
    await disposable.hash("disposed", new File(["a"], "a.jpg", { type: "image/jpeg" })),
    { type: "Rejected", operationId: "disposed", code: "MEDIA_HASH_CANCELLED" },
  );
});

test("HTTP Media uses exact source:<operationId> fields and uploads only required sources", async () => {
  let fields: string[] = [];
  const client = new HttpProductEntryMediaClient(async (_input, init) => {
    fields = [...(init?.body as FormData).keys()];
    return new Response(JSON.stringify({ type: "Completed", submissionId: "submission-1", submissionStatus: "Completed", idempotentReplay: false, resumed: false, workflow: { status: "Completed" } }), { status: 200, headers: { "content-type": "application/json" } });
  });
  const file = new File(["abc"], "a.jpg", { type: "image/jpeg" });
  await client.upload("submission-1", [{ operationId: "required-id", file, sha256: "a".repeat(64), byteLength: 3 }]);
  assert.deepEqual(fields, ["source:required-id"]);
});

test("browser requests do not send Workspace or actor as business authority", async () => {
  let contextUrl = "";
  const contextClient = new HttpProductEntryTrustedClientContextAdapter(async (input) => {
    contextUrl = String(input);
    return new Response(JSON.stringify({ type: "Available", context: { companyId: "company-1", workspaceId: "workspace-1", actorId: "actor-1", catalogId: "catalog-1", locale: "en" } }), { status: 200, headers: { "content-type": "application/json" } });
  });
  assert.equal((await contextClient.resolve()).type, "Available");
  assert.equal(contextUrl, "/api/catalog/product-entry-client-context");
  let body = "";
  const submission = new HttpProductEntrySubmissionClient(async (_input, init) => {
    body = String(init?.body);
    return new Response(JSON.stringify({ type: "Accepted", submissionId: "submission-1", productId: "product-1", productRevision: 1, idempotentReplay: false, productSaveResult: { outcome: "SavedAsDraft", lifecycleState: "Draft" } }), { status: 201, headers: { "content-type": "application/json" } });
  });
  const trusted: ProductEntryTrustedClientContext = { companyId: "company-1", workspaceId: "workspace-secret", actorId: "actor-secret", catalogId: "catalog-1", locale: "en" };
  const identity: ProductEntryLocalDraftIdentity = { mode: "Create", workspaceId: trusted.workspaceId, actorId: trusted.actorId, submissionId: "submission-1" };
  const request = buildSubmitProductEntryCommand(identity, createInitialProductEntryState(), trusted);
  await submission.submit(request);
  assert.doesNotMatch(body, /workspace-secret|actor-secret|workspaceId|actorId/);
  assert.doesNotMatch(body, /referencePurchaseCost|purchaseCost/i);
});
