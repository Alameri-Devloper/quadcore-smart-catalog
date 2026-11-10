"use client";

import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

export interface CatalogChoice {
  readonly value: string;
  readonly label: string;
  readonly disabled?: boolean;
}

export function CatalogChoiceMenu({ id, label, value, options, onChange, trigger, iconOnly = false, className = "" }: {
  readonly id: string;
  readonly label: string;
  readonly value: string;
  readonly options: readonly CatalogChoice[];
  readonly onChange: (value: string) => void;
  readonly trigger?: ReactNode;
  readonly iconOnly?: boolean;
  readonly className?: string;
}) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null), button = useRef<HTMLButtonElement>(null);
  const initialFocus = useRef<"selected" | "first" | "last">("selected");
  const selected = options.find(option => option.value === value);
  const close = (restoreFocus: boolean) => {
    setOpen(false);
    if (restoreFocus) button.current?.focus();
  };
  useEffect(() => {
    if (!open) return;
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)') ?? []);
    const target = initialFocus.current === "last" ? items.at(-1) : initialFocus.current === "first" ? items[0] : items.find(item => item.getAttribute("aria-checked") === "true") ?? items[0];
    target?.focus();
    const outside = (event: PointerEvent) => {
      if (event.target instanceof Node && !root.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", outside);
    return () => document.removeEventListener("pointerdown", outside);
  }, [open]);

  const menuKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); close(true); return; }
    if (event.key === "Tab") { close(true); return; }
    if (!["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const items = Array.from(root.current?.querySelectorAll<HTMLButtonElement>('[role="menuitemradio"]:not(:disabled)') ?? []);
    if (!items.length) return;
    const index = items.findIndex(item => item === document.activeElement);
    const next = event.key === "Home" ? 0 : event.key === "End" ? items.length - 1 : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[next]?.focus();
  };

  return <div ref={root} className={("catalog-choice-menu " + className).trim()} onBlur={event => {
    if (event.relatedTarget instanceof Node && !event.currentTarget.contains(event.relatedTarget)) setOpen(false);
  }}>
    <button ref={button} id={id} type="button" className={"catalog-choice-trigger" + (iconOnly ? " catalog-choice-trigger--icon" : "")}
      aria-label={iconOnly ? label : undefined} aria-haspopup="menu" aria-expanded={open} aria-controls={open ? id + "-menu" : undefined}
      onClick={() => { initialFocus.current = "selected"; setOpen(value => !value); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") { event.preventDefault(); initialFocus.current = event.key === "ArrowUp" ? "last" : "first"; setOpen(true); }
        if (event.key === "Escape") close(false);
      }}>
      <span className="catalog-choice-trigger__value">{trigger ?? selected?.label ?? label}</span>
      {!iconOnly ? <svg className="catalog-choice-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" focusable="false"><path d="m6 9 6 6 6-6" /></svg> : null}
    </button>
    {open ? <div id={id + "-menu"} className="catalog-choice-options-menu" role="menu" aria-label={label} onKeyDown={menuKey}>
      {options.map(option => <button key={option.value} type="button" role="menuitemradio" tabIndex={-1}
        aria-checked={option.value === value} disabled={option.disabled} onClick={() => { onChange(option.value); close(true); }}>
        <span>{option.label}</span><span className="catalog-choice-check" aria-hidden="true">{option.value === value ? "✓" : ""}</span>
      </button>)}
    </div> : null}
  </div>;
}

export const CatalogLanguageIcon = () => <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true" focusable="false">
  <circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 4 6 4 9s-1 6-4 9c-3-3-4-6-4-9s1-6 4-9Z" />
</svg>;
