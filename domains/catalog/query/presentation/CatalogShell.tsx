"use client";

import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSyncExternalStore, type ComponentProps } from "react";
import { PresentationShell } from "../../../identity/presentation/components/presentation-shell";
import { CatalogChoiceMenu, CatalogLanguageIcon } from "./catalog-choice-menu";
import { CATALOG_THEME_INITIALIZER, catalogServerThemeSnapshot, catalogThemeSnapshot, parseCatalogThemeMode, selectCatalogTheme, subscribeCatalogTheme } from "./catalog-theme";
import "./catalog-brand.css";

type CatalogShellProps = Pick<ComponentProps<typeof PresentationShell>, "actor" | "i18n" | "children">;

export function CatalogShell({ actor, i18n, children }: CatalogShellProps) {
  const pathname = usePathname();
  const snapshot = useSyncExternalStore(subscribeCatalogTheme, catalogThemeSnapshot, catalogServerThemeSnapshot);
  const [mode, appearance] = snapshot.split(":");
  const arabic = i18n.locale === "ar";
  const activePath = pathname?.startsWith("/catalog/reference-data") ? "/catalog/reference-data" : pathname?.startsWith("/catalog") ? "/catalog" : pathname ?? undefined;
  return <div className="staff-catalog-theme" data-catalog-theme={appearance} suppressHydrationWarning>
    <script dangerouslySetInnerHTML={{ __html: CATALOG_THEME_INITIALIZER }} />
    <PresentationShell actor={actor} i18n={i18n}
      catalogLabel={arabic ? "كتالوج المبيعات" : "Sales catalog"} navigationLabel={arabic ? "التنقل الرئيسي" : "Main navigation"} activePath={activePath}
      brandContent={<><span className="catalog-logo-frame"><Image className="catalog-official-logo" src="/brand/quadcore-logo.png" alt="Quadcore Technology" width={84} height={84} unoptimized priority /></span><span className="catalog-brand-name">Quadcore Technology</span></>}
      languageControl={<CatalogChoiceMenu id="catalog-language" className="catalog-language" label={arabic ? "اللغة" : "Language"} value={i18n.locale}
        trigger={<CatalogLanguageIcon />} iconOnly options={[{ value: "ar", label: "العربية" }, { value: "en", label: "English" }]}
        onChange={value => i18n.setLocale(value === "ar" ? "ar" : "en")} />}
      headerControls={<CatalogChoiceMenu id="catalog-appearance" className="catalog-appearance" label={arabic ? "المظهر" : "Appearance"} trigger={arabic ? "المظهر" : "Appearance"} value={mode}
        options={[{ value: "SYSTEM", label: arabic ? "النظام" : "System" }, { value: "LIGHT", label: arabic ? "فاتح" : "Light" }, { value: "DARK", label: arabic ? "داكن" : "Dark" }]}
        onChange={value => selectCatalogTheme(parseCatalogThemeMode(value))} />}>
      {children}
    </PresentationShell>
  </div>;
}
