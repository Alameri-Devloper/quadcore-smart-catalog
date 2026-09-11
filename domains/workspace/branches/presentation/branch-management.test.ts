import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { operationalManagementCapabilitiesFixture } from "../../../identity/presentation/mock/operational-management-capabilities.fixture";
import { BranchManagementContent } from "./BranchManagementPanel";
import { initialBranchManagementState } from "./branch-management.coordinator";
import type { BranchManagementState } from "./branch-management.types";
import { branchManagementFixture as fixture } from "./mock/branch-management.fixture";
import { OperationsContent } from "./OperationsPage";
import { operationsText } from "./operations-presentation.i18n";

const actions = { loadList() {}, select() {}, create() {}, change() {}, cancel() {}, save() {}, loadDetail() {}, review() {} };
const content = (state: BranchManagementState, locale: "en" | "ar" = "en") => createElement(BranchManagementContent, { state, locale, actions });
const render = (patch: Partial<BranchManagementState> = {}, locale: "en" | "ar" = "en") => renderToStaticMarkup(content({ ...initialBranchManagementState(), ...patch }, locale));
const draft = { code: "main", displayName: "My name", sortOrder: "2", status: "Inactive" as const };
const editor = { type: "Edit" as const, branchId: "branch-one", detail: { type: "Ready" as const, value: fixture({ revision: 9 }) }, draft, reviewRequired: false };

describe("Branch management Presentation", () => {
  it("renders distinct loading, authorized empty, forbidden and unavailable states", () => {
    assert.match(render(), /role="status" aria-live="polite">Loading branches/);
    const empty = render({ list: { type: "Ready", value: [] } }); assert.match(empty, /No branches/); assert.match(empty, /Create Branch/);
    for (const kind of ["Forbidden", "ForbiddenForRestrictedSession", "AuthenticationRequired", "BranchServiceUnavailable", "NetworkFailure", "MalformedResponse", "UnexpectedResponse"] as const) {
      const html = render({ list: { type: "Failed", kind } });
      assert.ok(html.includes(operationsText("en", kind))); assert.match(html, /role="alert"/); assert.doesNotMatch(html, /No branches|Create Branch/);
    }
  });
  it("preserves Branches navigation when listing capability is the only hint and General management returns 403", () => {
    const value = operationalManagementCapabilitiesFixture(); value.listing.canManage = true;
    const html = renderToStaticMarkup(createElement(OperationsContent, { state: { type: "Ready", value }, sectionValues: ["branches"], locale: "en", onRetry() {},
      branchManagement: content({ ...initialBranchManagementState(), list: { type: "Failed", kind: "Forbidden" } }),
    }));
    assert.match(html, /href="\/operations\?section=branches"/); assert.match(html, /aria-current="page"/);
    assert.match(html, /Branch management is unavailable: access was denied/); assert.doesNotMatch(html, /No branches/);
  });
  it("does not mount Branch management in other Operations sections", () => {
    const value = operationalManagementCapabilitiesFixture(); value.branches.canView = value.inventory.canReceive = true;
    const html = renderToStaticMarkup(createElement(OperationsContent, { state: { type: "Ready", value }, sectionValues: ["inventory"], locale: "en", onRetry() {},
      branchManagement: content(initialBranchManagementState()),
    }));
    assert.doesNotMatch(html, /Branch Management|branch-management/); assert.match(html, /Inventory workflows/);
  });
  it("renders ordered selection buttons, bilingual status text, escaped names and isolated codes", () => {
    const html = render({ list: { type: "Ready", value: [fixture({ branchId: "z", displayName: "<script>unsafe</script>" }), fixture({ branchId: "a", code: "last", status: "Inactive" })] } });
    assert.ok(html.indexOf("main") < html.indexOf("last")); assert.match(html, /&lt;script&gt;unsafe&lt;\/script&gt;/);
    assert.doesNotMatch(html, /<script>/); assert.match(html, /<bdi dir="ltr">main<\/bdi>/); assert.match(html, />Active</); assert.match(html, />Inactive</);
    assert.match(html, /aria-pressed="false"/);
  });
  it("labels all inputs, isolates direction, locks code and excludes revision from editable controls", () => {
    const html = render({ editor });
    for (const name of ["code", "displayName", "sortOrder", "status"]) {
      const input = html.match(new RegExp(`(?:input|select)[^>]*id="([^"]*-${name})"`));
      assert.ok(input); assert.ok(html.includes(`for="${input[1]}"`));
    }
    assert.match(html, /<input(?=[^>]*name="code")(?=[^>]*dir="ltr")(?=[^>]*readOnly="")[^>]*>/);
    assert.match(html, /<input(?=[^>]*name="displayName")(?=[^>]*dir="auto")[^>]*>/);
    assert.doesNotMatch(html, /name="(?:workspaceId|branchId|revision|expectedRevision|createdAt|updatedAt)"/);
    assert.match(html, /<form noValidate=""/); assert.match(html, /type="submit"/); assert.match(html, /<fieldset/);
  });
  it("shows authoritative detail loading without a writable form", () => {
    const html = render({ editor: { ...editor, detail: { type: "Loading" }, draft: null } });
    assert.match(html, /Loading branch details/); assert.doesNotMatch(html, /<form|type="submit"/);
  });
  it("retains conflict draft next to latest server values and disables Save until review", () => {
    const html = render({ editor: { ...editor, reviewRequired: true }, failure: "Conflict" });
    assert.match(html, /value="My name"/); assert.match(html, /Latest server version/); assert.match(html, /Main branch/);
    assert.match(html, /Your draft is preserved/); assert.match(html, /I reviewed the latest version/);
    assert.match(html, /type="submit"[^>]*disabled=""/);
    assert.doesNotMatch(render({ editor }), /type="submit"[^>]*disabled=""/);
  });
  it("associates validation and duplicate-code feedback, with focusable linked error summary", () => {
    const html = render({ editor: { type: "Create", draft }, fields: { displayName: "required", sortOrder: "numberRequired" }, failure: "CodeConflict" });
    assert.match(html, /tabindex="-1" class="branch-error-summary"/);
    assert.match(html, /href="#[^"]*-displayName"/);
    for (const name of ["code", "displayName", "sortOrder"]) assert.match(html, new RegExp(`<input(?=[^>]*name="${name}")(?=[^>]*aria-invalid="true")(?=[^>]*aria-describedby="[^"]*-${name}-error")[^>]*>`));
    assert.doesNotMatch(html, /<select/);
  });
  it("marks busy writes and disables all mutation controls and branch selection", () => {
    const html = render({ pending: true, editor, list: { type: "Ready", value: [fixture()] } });
    assert.match(html, /aria-busy="true"/); assert.match(html, /<fieldset disabled=""/); assert.match(html, /Saving…/);
    assert.match(html, /type="submit"[^>]*disabled=""/); assert.match(html, /disabled="" aria-pressed="true"/);
  });
  it("uses English and Arabic for labels, errors, loading, conflict and actions in one tree", () => {
    for (const locale of ["en", "ar"] as const) {
      const html = render({ editor: { ...editor, reviewRequired: true }, failure: "Conflict", list: { type: "Ready", value: [fixture()] } }, locale);
      for (const key of ["management", "createBranch", "code", "displayName", "sortOrder", "status", "Active", "Inactive", "save", "cancel", "Conflict", "reviewBeforeRetry", "reviewed"] as const) assert.ok(html.includes(operationsText(locale, key)));
      for (const kind of ["AuthenticationRequired", "ForbiddenForRestrictedSession", "Forbidden", "OriginNotAllowed", "InvalidInput", "BranchNotFound", "Conflict", "CodeConflict", "BranchServiceUnavailable", "NetworkFailure", "MalformedResponse", "UnexpectedResponse"] as const) {
        assert.ok(render({ failure: kind, editor }, locale).includes(operationsText(locale, kind)));
      }
      assert.ok(html.includes("My name")); assert.ok(html.includes("Main branch"));
    }
  });
  it("keeps lifecycle disposal, expiry wiring and drafts out of URL/persistence and authority imports", () => {
    const files = ["branch-management.types.ts", "workspace-branch-api.client.ts", "branch-management.coordinator.ts", "BranchManagementPanel.tsx"];
    for (const file of files) {
      const source = readFileSync(`domains/workspace/branches/presentation/${file}`, "utf8");
      assert.doesNotMatch(source, /from ["'][^"']*(?:repositories|infrastructure|\/domain\/|trusted-actor-context)/);
      assert.doesNotMatch(source, /localStorage|sessionStorage|URLSearchParams|searchParams|\/api\/branches\/operational|\/api\/catalog|\.role|\.permissions|\.branchScope|\.workspaceId/);
    }
    const panel = readFileSync("domains/workspace/branches/presentation/BranchManagementPanel.tsx", "utf8");
    assert.match(panel, /coordinator\.dispose\(\)/); assert.match(panel, /snapshot\?\.lifecycle === lifecycle/); assert.match(panel, /editorHeading\.current\?\.focus/); assert.match(panel, /errorSummary\.current\?\.focus/);
    const page = readFileSync("domains/workspace/branches/presentation/OperationsPage.tsx", "utf8");
    assert.match(page, /lifecycle=\{actor\} onAuthenticationRequired=\{redirectExpired\}/);
    assert.match(page, /selected === "Branches" \? branchManagement/);
  });
  it("has responsive logical layout, native controls, 44px targets and existing visible focus", () => {
    const css = readFileSync("app/globals.css", "utf8");
    assert.match(css, /\.branch-management-grid\s*\{ display: grid; gap: 1.5rem; \}/);
    assert.match(css, /\.branch-management :is\(button, input, select\)\s*\{ min-height: 44px/);
    assert.match(css, /@media \(min-width: 768px\)\s*\{\s*\.branch-management-grid/);
    assert.match(css, /\.branch-master, \.branch-editor\s*\{ min-width: 0; overflow-wrap: anywhere/);
    assert.match(css, /border-inline-start/); assert.match(css, /:focus-visible\s*\{[^}]*outline:/);
  });
});
