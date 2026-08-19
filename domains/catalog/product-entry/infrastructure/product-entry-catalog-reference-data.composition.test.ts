import assert from "node:assert/strict";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { buildSubmitProductEntryCommand } from "../presentation/product-entry-presentation.mapper";
import { ProductEntryWorkflowProvider, useProductEntryWorkflow } from "../react/product-entry-workflow-adapter";
import { createInitialProductEntryState, PRODUCT_ENTRY_STEP_IDS, type ProductEntryValues, type ProductEntryWorkflowContext } from "../product-entry.types";
import { reconcileProductEntryValues } from "../product-entry.reconciliation";
import { productEntryWorkflow } from "../product-entry.workflow";
import { validateCategory } from "../product-entry.validation";
import type { ProductEntryCatalogReferenceData } from "../ports/product-entry-catalog-reference-data.port";
import { HttpProductEntryCatalogReferenceDataClient } from "./browser/http-product-entry-catalog-reference-data.client";
import { createProductionProductEntryCatalogReferenceDataCoordinator } from "./browser/product-entry-catalog-reference-data.composition";

const fixture: ProductEntryCatalogReferenceData = {
  departments: [{ id: "department-computers", code: "computers", displayName: "Computers" }],
  categories: [
    { id: "category-laptops", code: "laptops", displayName: "Laptops", departmentId: "department-computers" },
    { id: "category-phones", code: "phones", displayName: "Phones", departmentId: "department-mobile" },
  ],
  productTypes: [
    { id: "type-ultrabook", code: "ultrabook", displayName: "Ultrabook", categoryId: "category-laptops" },
    { id: "type-phone", code: "phone", displayName: "Phone", categoryId: "category-phones" },
  ],
  brands: [{ id: "brand-live", code: "live-brand", displayName: "Live Brand" }],
  deviceClasses: [{ code: "business", labels: { en: "Business", ar: "أعمال" } }],
  conditions: [{ code: "refurbished", sortOrder: 0 }],
  supplyStatuses: [{ id: "status-live", code: "in-stock", displayName: "In stock" }],
  currencies: [{ code: "EUR", sortOrder: 0 }],
  specificationDefinitions: [{ id: "spec-memory", code: "memory", displayName: "Memory", valueType: "Number", unit: "GB" }],
  specificationTemplates: [{ id: "template-ultrabook", productTypeId: "type-ultrabook", entries: [{ specificationDefinitionId: "spec-memory", sortOrder: 0, required: true }] }],
};

const coordinator = createProductionProductEntryCatalogReferenceDataCoordinator(async () => new Response(null, { status: 503 }));

const values = (change: Partial<ProductEntryValues> = {}): ProductEntryValues => ({
  ...createInitialProductEntryState(),
  departmentId: null,
  categoryId: "category-laptops",
  productTypeId: "type-ultrabook",
  specificationValues: { "spec-memory": 16, "historical-spec": "preserved" },
  ...change,
});

const workflowContext: ProductEntryWorkflowContext = {
  companyId: "company-local",
  workspaceId: "workspace-local",
  categoryRequiresDeviceClassByCategory: { "category-laptops": false },
  deviceClassIdsByCategory: {},
  brandIdByProductModel: {},
  productModelIdsByCategory: {},
  productModelIdsByCategoryAndDeviceClass: {},
  specificationFieldIdsByCategory: {},
  specificationFieldIdsByCategoryAndDeviceClass: {},
  selectOptionValuesBySpecificationField: {},
  requiredSpecificationFieldIds: [],
  compatibleSpecificationFieldIds: [],
  compatibleDeviceClassIds: [],
  compatibleProductModelIds: [],
  referenceDepartmentIds: fixture.departments.map(({ id }) => id),
  referenceCategoryDepartmentById: Object.fromEntries(fixture.categories.map(({ id, departmentId }) => [id, departmentId])),
  referenceProductTypeCategoryById: Object.fromEntries(fixture.productTypes.map(({ id, categoryId }) => [id, categoryId])),
  referenceBrandIds: fixture.brands.map(({ id }) => id),
  referenceDeviceClassCodes: [],
  referenceConditionCodes: fixture.conditions.map(({ code }) => code),
  referenceSupplyStatusIds: fixture.supplyStatuses.map(({ id }) => id),
  referenceCurrencyCodes: fixture.currencies.map(({ code }) => code),
  referenceSpecificationResolutionsByProductType: Object.fromEntries(
    fixture.productTypes.map(({ id }) => [id, coordinator.specificationResolution(fixture, id)]),
  ),
};

const DirtyProbe = () => createElement("span", null, useProductEntryWorkflow().isDirty ? "dirty" : "clean");

test("production composition loads active Workspace reference data through the HTTP client", async () => {
  let request: { input: RequestInfo | URL; init?: RequestInit } | undefined;
  const coordinator = createProductionProductEntryCatalogReferenceDataCoordinator(async (input, init) => {
    request = { input, init };
    return Response.json({ type: "Success", value: fixture });
  });

  assert.ok(coordinator.port instanceof HttpProductEntryCatalogReferenceDataClient);
  assert.deepEqual(await coordinator.load(), { type: "Available", value: fixture });
  assert.equal(request?.input, "/api/catalog/reference-data");
  assert.equal(request?.init?.method, "GET");
  assert.equal(request?.init?.body, undefined);
  assert.deepEqual(request?.init?.headers, { accept: "application/json" });
});

test("live hierarchy, registry choices, brands, supply statuses, and template are coordinated without mock fallback", () => {
  const coordinator = createProductionProductEntryCatalogReferenceDataCoordinator(async () => new Response(null, { status: 503 }));
  assert.deepEqual(coordinator.categoriesForDepartment(fixture, "department-computers").map(({ id }) => id), ["category-laptops"]);
  assert.deepEqual(coordinator.productTypesForCategory(fixture, "category-laptops").map(({ id }) => id), ["type-ultrabook"]);
  assert.deepEqual(coordinator.brandOptions(fixture).map(({ id }) => id), ["brand-live"]);
  assert.deepEqual(fixture.conditions.map(({ code }) => code), ["refurbished"]);
  assert.deepEqual(fixture.currencies.map(({ code }) => code), ["EUR"]);
  assert.deepEqual(fixture.supplyStatuses.map(({ id }) => id), ["status-live"]);
  assert.deepEqual(coordinator.specificationResolution(fixture, "type-ultrabook"), {
    status: "resolved",
    templateId: "template-ultrabook",
    fields: [{ specificationFieldId: "spec-memory", code: "memory", label: "Memory", fieldType: "number", required: true, sortOrder: 0, options: [], guidance: { unitLabel: "GB" } }],
  });
});

test("Department and Category changes clear incompatible descendants", () => {
  const coordinator = createProductionProductEntryCatalogReferenceDataCoordinator(async () => new Response(null, { status: 503 }));
  const selected = { departmentId: "department-computers", categoryId: "category-laptops", productTypeId: "type-ultrabook" };
  assert.deepEqual(coordinator.reconcileHierarchy(fixture, selected, { departmentId: "department-mobile" }), {
    departmentId: "department-mobile", categoryId: null, productTypeId: null,
  });
  assert.deepEqual(coordinator.reconcileHierarchy(fixture, selected, { categoryId: "category-phones" }), {
    departmentId: "department-computers", categoryId: null, productTypeId: null,
  });
});

test("unavailable production API returns a safe unavailable state with no legacy values", async () => {
  const coordinator = createProductionProductEntryCatalogReferenceDataCoordinator(async () => new Response(null, { status: 503 }));
  assert.deepEqual(await coordinator.load(), { type: "Unavailable" });
});

test("Edit hydration derives Department from the trusted active Category and preserves historical values", () => {
  const initial = values();
  const result = coordinator.hydrateInitialValues(fixture, initial, true);

  assert.equal(result.type, "Compatible");
  assert.equal(result.values.departmentId, "department-computers");
  assert.equal(result.values.categoryId, initial.categoryId);
  assert.equal(result.values.productTypeId, initial.productTypeId);
  assert.deepEqual(result.values.specificationValues, initial.specificationValues);
});

test("hydrated Edit values are the workflow baseline and therefore are not dirty", () => {
  const hydrated = coordinator.hydrateInitialValues(fixture, values(), true).values;
  // eslint-disable-next-line react/no-children-prop -- the generic Provider's type requires children in createElement props.
  const markup = renderToStaticMarkup(createElement(
    ProductEntryWorkflowProvider,
    {
      context: workflowContext,
      createInitialValues: () => hydrated,
      initialStep: PRODUCT_ENTRY_STEP_IDS.entryMethod,
      workflow: productEntryWorkflow,
      children: createElement(DirtyProbe),
    },
  ));

  assert.match(markup, />clean</);
});

test("hydrated Edit hierarchy validates and submission does not add Department to the Product command", async () => {
  const hydrated = coordinator.hydrateInitialValues(fixture, values(), true).values;
  const validation = await validateCategory({ context: workflowContext, values: hydrated, stepId: PRODUCT_ENTRY_STEP_IDS.category });
  const command = buildSubmitProductEntryCommand(
    { mode: "Edit", workspaceId: "workspace-local", actorId: "actor-local", submissionId: "submission-local", productId: "product-local", baseProductRevision: 3 },
    hydrated,
    { companyId: "company-local", workspaceId: "workspace-local", actorId: "actor-local", catalogId: "catalog-local", locale: "en" },
  );

  assert.equal(validation.valid, true);
  assert.ok(command.draft.classification);
  assert.equal(Object.hasOwn(command.draft.classification, "departmentId"), false);
});

test("incompatible Product Type is preserved and produces an explicit reclassification state", () => {
  const result = coordinator.hydrateInitialValues(fixture, values({ productTypeId: "type-phone" }), true);

  assert.deepEqual(result, {
    type: "ReclassificationRequired",
    reason: "ProductTypeCategoryMismatch",
    values: values({ departmentId: "department-computers", productTypeId: "type-phone" }),
  });
});

test("missing or inactive Category is preserved without deriving or replacing Department", () => {
  const initial = values({ categoryId: "category-inactive", productTypeId: "type-inactive" });
  const result = coordinator.hydrateInitialValues(fixture, initial, true);

  assert.equal(result.type, "ReclassificationRequired");
  assert.equal(result.type === "ReclassificationRequired" && result.reason, "CategoryUnavailable");
  assert.strictEqual(result.values, initial);
});

test("missing or inactive Product Type is preserved with the active Category-derived Department", () => {
  const initial = values({ productTypeId: "type-inactive" });
  const result = coordinator.hydrateInitialValues(fixture, initial, true);

  assert.equal(result.type, "ReclassificationRequired");
  assert.equal(result.type === "ReclassificationRequired" && result.reason, "ProductTypeUnavailable");
  assert.equal(result.values.departmentId, "department-computers");
  assert.equal(result.values.productTypeId, "type-inactive");
});

test("Create choices come only from the scoped active reference-data response", () => {
  assert.deepEqual(coordinator.categoriesForDepartment(fixture, "department-computers").map(({ id }) => id), ["category-laptops"]);
  assert.deepEqual(coordinator.productTypesForCategory(fixture, "category-laptops").map(({ id }) => id), ["type-ultrabook"]);
  assert.equal(coordinator.categoriesForDepartment(fixture, "department-computers").some(({ id }) => id === "category-inactive"), false);
});

test("valid local draft Department remains unchanged", () => {
  const initial = values({ departmentId: "department-computers" });
  const result = coordinator.hydrateInitialValues(fixture, initial, false);

  assert.equal(result.type, "Compatible");
  assert.deepEqual(result.values, initial);
});

test("legacy local draft with a missing Department derives it through the same policy", () => {
  const result = coordinator.hydrateInitialValues(fixture, values(), false);

  assert.equal(result.type, "Compatible");
  assert.equal(result.values.departmentId, "department-computers");
});

test("foreign Workspace Category cannot be resolved by the scoped active response", () => {
  const initial = values({ categoryId: "category-foreign", productTypeId: "type-foreign" });
  const result = coordinator.hydrateInitialValues(fixture, initial, true);

  assert.equal(result.type, "ReclassificationRequired");
  assert.equal(result.type === "ReclassificationRequired" && result.reason, "CategoryUnavailable");
  assert.strictEqual(result.values, initial);
});

test("reference-context refresh does not reinterpret hydration as a user change or rewrite historical values", () => {
  const historical = values({
    departmentId: null,
    categoryId: "category-inactive",
    productTypeId: "type-inactive",
  });
  const reconciled = reconcileProductEntryValues({
    previousValues: historical,
    nextValues: historical,
    context: workflowContext,
    activeStepIds: Object.values(PRODUCT_ENTRY_STEP_IDS),
  });

  assert.equal(reconciled.categoryId, "category-inactive");
  assert.equal(reconciled.productTypeId, "type-inactive");
  assert.strictEqual(reconciled.specificationValues, historical.specificationValues);
});
