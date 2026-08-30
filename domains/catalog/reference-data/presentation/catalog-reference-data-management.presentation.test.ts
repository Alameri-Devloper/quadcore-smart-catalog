import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";
import { chooseDeactivationFocusTarget, resolveDynamicMutationFailure } from "./catalog-reference-dynamic-manager.behavior";
import { deactivationCopy, referenceText } from "./catalog-reference-data-management.i18n";

const presentationRoot = resolve(process.cwd(), "domains/catalog/reference-data/presentation");
const page = readFileSync(resolve(presentationRoot, "CatalogReferenceDataManagementPage.tsx"), "utf8");
const dynamic = readFileSync(resolve(presentationRoot, "catalog-reference-dynamic-manager.tsx"), "utf8");
const registry = readFileSync(resolve(presentationRoot, "catalog-reference-registry-manager.tsx"), "utf8");
const template = readFileSync(resolve(presentationRoot, "catalog-reference-template-manager.tsx"), "utf8");
const css = readFileSync(resolve(process.cwd(), "app/globals.css"), "utf8");
const packageJson = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")) as { readonly scripts: Readonly<Record<string, string>> };
const dynamicFailureImplementation = dynamic.slice(dynamic.indexOf("const fail"), dynamic.indexOf("const save"));

test("npm test wires the Task 3.21 Presentation suite through test:reference-data", () => {
  assert.match(packageJson.scripts.test, /npm run test:reference-data/);
  assert.match(packageJson.scripts["test:reference-data"], /domains\/catalog\/reference-data\/presentation\/\*\.test\.ts/);
});

test("deactivation uses exact historical-safe English wording and descendant warning", () => {
  const copy = deactivationCopy("en", "Phones", true);
  assert.match(copy, /It will no longer be available for new selections/); assert.match(copy, /Existing Products keep their historical reference/); assert.match(copy, /This does not delete the record/); assert.match(copy, /Active descendants/);
});
test("Arabic system labels and deactivation explanation are present", () => {
  assert.equal(referenceText("ar", "title"), "البيانات المرجعية للكتالوج"); assert.match(deactivationCopy("ar", "هواتف", false), /لا يحذف السجل/);
});
test("English and Arabic shell direction remains one shared component tree", () => {
  assert.equal(referenceText("en", "title"), "Catalog reference data"); assert.match(page, /PresentationShell/); assert.doesNotMatch(page, /displayNameAr|displayNameEn/);
});
test("semantic section navigation identifies the current allow-listed section", () => {
  assert.match(page, /<nav className="reference-section-nav"/); assert.match(page, /aria-current=/); assert.match(page, /CATALOG_REFERENCE_SECTIONS\.map/);
});
test("read-only mode derives controls from management response mode", () => {
  assert.match(page, /access\.type === "Management"/); assert.match(dynamic, /management \?/); assert.match(registry, /management \?/); assert.match(template, /management \?/);
});
test("stable code is a create input and an edit-time definition value", () => {
  assert.match(dynamic, /draft\.mode === "create" \? <FormField/); assert.match(dynamic, /<dl className="labeled-value"><dt>\{referenceText\(locale, "code"\)\}/);
});
test("Category and Product Type existing forms expose parent as read-only text", () => {
  assert.match(dynamic, /parent \? <dl className="labeled-value"/); assert.doesNotMatch(dynamic, /name="departmentId"|name="categoryId"/);
});
test("Device Class section has no mutation manager", () => {
  assert.match(page, /DeviceClasses access=/); assert.doesNotMatch(page, /kind="device-classes"/);
});
test("Condition and Currency controls expose enablement and order, not creation", () => {
  assert.match(registry, /type="checkbox"/); assert.match(registry, /type="number"/); assert.doesNotMatch(registry, /create\(/);
});
test("currency precision is rendered read-only and preserves N.A.", () => {
  assert.match(registry, /minorUnitDigits/); assert.equal(referenceText("en", "notApplicable"), "N.A.");
});
test("template warning is exact and inactive entries disable Save", () => {
  assert.equal(referenceText("en", "templateWarning"), "Template changes affect future/default Product Entry behavior only. Existing Product specification values are not changed."); assert.match(template, /disabled=\{invalidHistorical \|\| conflict\}/);
});
test("edit conflicts preserve local drafts and retain explicit current-version review", () => {
  assert.deepEqual(resolveDynamicMutationFailure("Conflict", "edit"), { refreshAuthoritativeState: true, conflictRecovery: "review-edit" });
  assert.match(dynamic, /notice\.conflictRecovery === "review-edit"/); assert.match(dynamic, /reviewCurrent/); assert.match(template, /setConflict\(true\)/);
});
test("status conflicts refresh server truth without exposing edit-draft review", () => {
  assert.deepEqual(resolveDynamicMutationFailure("Conflict", "status"), { refreshAuthoritativeState: true, conflictRecovery: "retry-status" });
  assert.equal(referenceText("en", "statusConflict"), "The record status changed on the server. Review the refreshed status, then retry Activate or Deactivate explicitly if still needed.");
  assert.match(referenceText("ar", "statusConflict"), /الحالة المحدّثة/);
  assert.match(dynamic, /if \(policy\.refreshAuthoritativeState\) await onReload\(\)/);
  assert.doesNotMatch(dynamic, /conflictRecovery === "retry-status"[\s\S]{0,120}reviewCurrent/);
});
test("successful status actions replace stale conflict UI and never replay a mutation", () => {
  assert.match(dynamic, /setNotice\(\{ kind: "success", text: referenceText\(locale, status === "Active" \? "activated" : "deactivated"\) \}\)/);
  assert.doesNotMatch(dynamicFailureImplementation, /catalogReferenceDataManagementClient\.update|changeStatus|save\(\)/);
});
test("safe unavailable state provides retry and no mock fallback", () => {
  assert.match(page, /referenceText\(locale, "retry"\)/); assert.doesNotMatch(page + dynamic + registry + template, /mock|fixture/i);
});
test("not-found behavior refreshes server state without disclosing tenant identity", () => {
  assert.equal(resolveDynamicMutationFailure("NotFound", "edit").refreshAuthoritativeState, true); assert.doesNotMatch(page + dynamic, /workspaceId|actorId|permissions/);
});
test("deactivation confirmation uses the native modal top layer and blocks background pointer interaction", () => {
  assert.match(dynamic, /<dialog/); assert.match(dynamic, /role="alertdialog"/); assert.match(dynamic, /aria-modal="true"/); assert.match(dynamic, /dialog\.showModal\(\)/);
  assert.match(css, /\.reference-confirmation::backdrop/); assert.match(css, /\.reference-confirmation\[open\] \{ display: grid; \}/);
});
test("only the explicit Deactivate opening action captures the focus origin", () => {
  assert.match(dynamic, /onClick=\{\(event\) => \{ actionOrigin\.current = event\.currentTarget; setConfirming\(record\); \}\}/);
  assert.equal(dynamic.match(/actionOrigin\.current\s*=/g)?.length, 1);
  assert.doesNotMatch(dynamic, /<button[^>]*ref=\{\(node\)[^>]*actionOrigin/);
});
test("multiple Deactivate controls cannot overwrite the connected captured opener", () => {
  let capturedFocuses = 0; let unrelatedFocuses = 0;
  const captured = { isConnected: true, focus: () => { capturedFocuses += 1; } };
  const unrelated = { isConnected: true, focus: () => { unrelatedFocuses += 1; } };
  chooseDeactivationFocusTarget(captured, unrelated, null, null)?.focus();
  assert.equal(capturedFocuses, 1); assert.equal(unrelatedFocuses, 0);
});
test("Cancel and native Escape restore focus through the exact captured opener", () => {
  assert.match(dynamic, /onCancel=\{\(event\) => \{ event\.preventDefault\(\); closeConfirmation\(confirming\.id\); \}\}/);
  assert.match(dynamic, /onClick=\{\(\) => closeConfirmation\(confirming\.id\)\}/);
  assert.match(dynamic, /chooseDeactivationFocusTarget\([\s\S]{0,100}actionOrigin\.current/);
  assert.match(dynamic, /cancelConfirmation\.current\?\.focus/);
});
test("post-mutation focus selects the exact replacement action instead of a detached opener", () => {
  let detachedFocuses = 0; let replacementFocuses = 0;
  const detached = { isConnected: false, focus: () => { detachedFocuses += 1; } };
  const replacement = { isConnected: true, focus: () => { replacementFocuses += 1; } };
  chooseDeactivationFocusTarget(detached, replacement, null, null)?.focus();
  assert.equal(detachedFocuses, 0); assert.equal(replacementFocuses, 1);
  assert.match(dynamic, /document\.getElementById\(statusActionId\(kind, recordId\)\)/);
  assert.match(dynamic, /await onReload\(\);\s*if \(status === "Inactive"\) closeConfirmation\(record\.id\)/);
});
test("mobile-first cards become adjacent panes only at wider breakpoints", () => {
  assert.match(css, /\.reference-hierarchy \{ display: grid; gap: 1rem; \}/); assert.match(css, /@media \(min-width: 900px\)[\s\S]*\.reference-hierarchy \{ grid-template-columns: repeat\(3/);
});
test("keyboard and touch controls have native buttons, labels, focus hooks, and minimum targets", () => {
  assert.match(dynamic, /<button/); assert.match(dynamic, /FormField/); assert.match(css, /min-height: 44px/); assert.match(css, /:focus-visible/);
});
test("dynamic status actions never use a hard-delete action label", () => {
  assert.doesNotMatch(dynamic, /referenceText\(locale, "delete"\)|>Delete<|>حذف</);
});
