import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, it } from "node:test";
import { translate } from "./identity-i18n";

const root = resolve(process.cwd(), "domains/identity/presentation");
const shell = readFileSync(resolve(root, "components/presentation-shell.tsx"), "utf8");

describe("Operations authenticated shell integration", () => {
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

  it("links the real route using shared capability state without making a request", () => {
    assert.equal(existsSync(resolve(process.cwd(), "app/operations/page.tsx")), true);
    assert.match(shell, /href="\/operations"/);
    assert.match(shell, /operationalManagementNavigationStatus\(capabilities.state\) === "Available"/);
    assert.match(shell, /useOperationalManagementCapabilities\(\)/);
    assert.doesNotMatch(shell, /operational-management-capabilities\.client/);
  });

  it("mounts the provider only after existing authenticated, restricted and Owner gates", () => {
    const guard = readFileSync(resolve(root, "components/auth-guard.tsx"), "utf8");
    assert.match(guard, /if \(ownerOnly && actor.role !== "Owner"\)/);
    assert.match(guard, /router.replace\("\/change-password"\)/);
    assert.match(guard, /if \(state.type === "Restricted"\) return <>\{children\(actor\)\}<\/>/);
    assert.match(guard, /const redirectExpired = useSessionExpiryRedirect\(\)/);
    assert.match(guard, /<OperationalManagementCapabilitiesProvider lifecycle=\{actor\} onAuthenticationRequired=\{redirectExpired\}>/);
    assert.match(guard, /expired=1/);
    assert.match(guard, /safeReturnPath/);
  });

  it("binds one effect-owned coordinator to the opaque lifecycle, disposes it and masks earlier snapshots", () => {
    const provider = readFileSync(resolve(root, "operational-management-capabilities.context.tsx"), "utf8");
    assert.equal((provider.match(/mountOperationalManagementCapabilities\(new/g) ?? []).length, 1);
    assert.match(provider, /useEffect\(\(\) =>/);
    assert.match(provider, /coordinator.dispose\(\)/);
    assert.match(provider, /\[lifecycle, onAuthenticationRequired\]/);
    assert.match(provider, /snapshot\?\.lifecycle === lifecycle \? snapshot.state : loading/);
    assert.match(provider, /mounted.current.coordinator.refresh\(\)/);
    assert.doesNotMatch(provider, /localStorage|sessionStorage|\.role|branchScope|workspaceId|permissions/);
  });

  it("keeps production capability files inside the Presentation boundary without authority or browser persistence", () => {
    for (const file of ["operational-management-capabilities.types.ts", "operational-management-capabilities.client.ts", "operational-management-capabilities.coordinator.ts"]) {
      const source = readFileSync(resolve(root, file), "utf8");
      assert.doesNotMatch(source, /TrustedActorContext|workspaceId|branchScope|localStorage|sessionStorage|\.role\b|\.permissions\b|allowedActions/);
      for (const match of source.matchAll(/from\s+["']([^"']+)["']/g)) assert.equal(match[1], "./operational-management-capabilities.types");
    }
  });
});
