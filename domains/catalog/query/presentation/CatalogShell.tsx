"use client";

import Image from "next/image";
import { useSyncExternalStore, type ComponentProps } from "react";
import { PresentationShell } from "../../../identity/presentation/components/presentation-shell";
import { CATALOG_THEME_INITIALIZER, catalogServerThemeSnapshot, catalogThemeSnapshot, parseCatalogThemeMode, selectCatalogTheme, subscribeCatalogTheme } from "./catalog-theme";
import "./catalog-brand.css";

type CatalogShellProps = Pick<ComponentProps<typeof PresentationShell>, "actor" | "i18n" | "children">;

export function CatalogShell({ actor, i18n, children }: CatalogShellProps) {
  const snapshot = useSyncExternalStore(subscribeCatalogTheme, catalogThemeSnapshot, catalogServerThemeSnapshot);
  const [mode, appearance] = snapshot.split(":");
  const arabic = i18n.locale === "ar";
  return <div className="staff-catalog-theme" data-catalog-theme={appearance} suppressHydrationWarning>
    <script dangerouslySetInnerHTML={{ __html: CATALOG_THEME_INITIALIZER }} />
    <PresentationShell actor={actor} i18n={i18n}
      brandContent={<><Image className="catalog-official-logo" src="/brand/quadcore-logo.png" alt="Quadcore Technology" width={84} height={84} unoptimized priority /><span className="catalog-brand-name">Quadcore Technology<small>{arabic ? "الكتالوج الذكي" : "SMART CATALOG"}</small></span></>}
      headerControls={<label className="catalog-theme-control"><span>{arabic ? "المظهر" : "Appearance"}</span><select aria-label={arabic ? "مظهر الكتالوج" : "Catalog appearance"} value={mode} onChange={event => selectCatalogTheme(parseCatalogThemeMode(event.target.value))}><option value="SYSTEM">{arabic ? "النظام" : "System"}</option><option value="LIGHT">{arabic ? "فاتح" : "Light"}</option><option value="DARK">{arabic ? "داكن" : "Dark"}</option></select></label>}>
      {children}
    </PresentationShell>
  </div>;
}
