export const CATALOG_THEME_STORAGE_KEY = "qsc.staff.catalog.theme.v1";
export type CatalogThemeMode = "SYSTEM" | "LIGHT" | "DARK";
export const parseCatalogThemeMode = (value: unknown): CatalogThemeMode =>
  value === "LIGHT" || value === "DARK" ? value : "SYSTEM";
export const resolveCatalogTheme = (mode: CatalogThemeMode, systemDark: boolean): "light" | "dark" =>
  mode === "DARK" || (mode === "SYSTEM" && systemDark) ? "dark" : "light";

const changeEvent = "qsc:staff-catalog-theme";
let memoryPreference: CatalogThemeMode | undefined;
const preference = (): CatalogThemeMode => {
  if (memoryPreference !== undefined) return memoryPreference;
  try { return parseCatalogThemeMode(window.localStorage.getItem(CATALOG_THEME_STORAGE_KEY)); }
  catch { return "SYSTEM"; }
};
export const catalogThemeSnapshot = (): string => {
  const mode = preference();
  return mode + ":" + resolveCatalogTheme(mode, window.matchMedia("(prefers-color-scheme: dark)").matches);
};
export const catalogServerThemeSnapshot = (): string => "SYSTEM:light";
export const selectCatalogTheme = (mode: CatalogThemeMode): void => {
  memoryPreference = mode;
  try { window.localStorage.setItem(CATALOG_THEME_STORAGE_KEY, mode); } catch { /* The choice still works for this visit. */ }
  window.dispatchEvent(new Event(changeEvent));
};
export const subscribeCatalogTheme = (notify: () => void): (() => void) => {
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const storage = (event: StorageEvent) => {
    if (event.key === null || event.key === CATALOG_THEME_STORAGE_KEY) { memoryPreference = undefined; notify(); }
  };
  media.addEventListener("change", notify);
  window.addEventListener(changeEvent, notify);
  window.addEventListener("storage", storage);
  return () => {
    media.removeEventListener("change", notify);
    window.removeEventListener(changeEvent, notify);
    window.removeEventListener("storage", storage);
  };
};

// Runs inside the scoped wrapper before its header is parsed; only a non-sensitive preference is read.
export const CATALOG_THEME_INITIALIZER = `(function(){var r=document.currentScript.parentElement,m;try{m=localStorage.getItem("qsc.staff.catalog.theme.v1")}catch(e){}r.dataset.catalogTheme=m==="DARK"||(m!=="LIGHT"&&matchMedia("(prefers-color-scheme: dark)").matches)?"dark":"light";})();`;
