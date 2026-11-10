import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { CATALOG_THEME_INITIALIZER, parseCatalogThemeMode, resolveCatalogTheme } from "./catalog-theme";
import { runInNewContext } from "node:vm";

describe("Staff Catalog theme preference contract", () => {
  it("defaults to SYSTEM for missing, corrupt and foreign preferences", () => {
    for (const value of [null, undefined, "", "dark", "GREEN", {}, "SYSTEM"]) assert.equal(parseCatalogThemeMode(value), "SYSTEM");
  });
  it("follows the OS only under SYSTEM", () => {
    for (const os of [true, false]) {
      assert.equal(resolveCatalogTheme("LIGHT", os), "light");
      assert.equal(resolveCatalogTheme("DARK", os), "dark");
      assert.equal(resolveCatalogTheme("SYSTEM", os), os ? "dark" : "light");
    }
  });
  for (const value of [null, "SYSTEM", "LIGHT", "DARK", "corrupt"]) for (const os of [true, false]) {
    it("initial paint agrees with the hydrated contract: " + value + "/" + os, () => {
      const dataset: Record<string,string> = {};
      runInNewContext(CATALOG_THEME_INITIALIZER, { document: { currentScript: { parentElement: { dataset } } }, localStorage: { getItem: () => value }, matchMedia: () => ({ matches: os }) });
      assert.equal(dataset.catalogTheme, resolveCatalogTheme(parseCatalogThemeMode(value), os));
    });
  }
  it("initializes safely when browser storage is denied", () => {
    const dataset: Record<string,string> = {};
    runInNewContext(CATALOG_THEME_INITIALIZER, { document: { currentScript: { parentElement: { dataset } } }, localStorage: { getItem: () => { throw Error("blocked"); } }, matchMedia: () => ({ matches: true }) });
    assert.equal(dataset.catalogTheme, "dark");
  });
});
