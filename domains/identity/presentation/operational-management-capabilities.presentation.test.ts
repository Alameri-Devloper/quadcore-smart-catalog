import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { translate } from "./identity-i18n";

const root = resolve(process.cwd(), "domains/identity/presentation");
const shell = readFileSync(resolve(root, "components/presentation-shell.tsx"), "utf8");

describe("P1.1 shell navigation deferral", () => {
  it("provides the exact English and Arabic navigation labels", () => {
    assert.equal(translate("en", "operations"), "Operations");
    assert.equal(translate("ar", "operations"), "العمليات");
  });

  it("preserves existing destinations, language, logout, direction and skip-link behavior", () => {
    for (const path of ["/catalog", "/catalog/reference-data", "/members"]) assert.ok(shell.includes(`href="${path}"`));
    assert.match(shell, /actor\?\.role === "Owner"/);
    assert.match(shell, /onClick=\{logout\}/);
    assert.match(shell, /i18n\.setLocale/);
    assert.match(shell, /dir=\{i18n\.dir\}/);
    assert.match(shell, /href="#main-content"/);
    assert.match(shell, /isLogoutSafelyConfirmed/);
  });

  it("adds neither a broken Operations link nor a placeholder route", () => {
    assert.equal(existsSync(resolve(process.cwd(), "app/operations/page.tsx")), false);
    assert.doesNotMatch(shell, /href=["']\/operations["']/);
    assert.doesNotMatch(shell, /operational-management-capabilities\.client/);
  });

  it("keeps production capability files inside the Presentation boundary without authority or browser persistence", () => {
    for (const file of ["operational-management-capabilities.types.ts", "operational-management-capabilities.client.ts", "operational-management-capabilities.coordinator.ts"]) {
      const source = readFileSync(resolve(root, file), "utf8");
      assert.doesNotMatch(source, /TrustedActorContext|workspaceId|branchScope|localStorage|sessionStorage|\.role\b|\.permissions\b|allowedActions/);
      for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) assert.equal(match[1], "./operational-management-capabilities.types");
    }
  });
});
