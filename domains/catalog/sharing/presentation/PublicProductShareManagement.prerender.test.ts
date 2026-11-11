import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { it } from "node:test";
import { Children, createElement, isValidElement, type ReactNode } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicProductShareManagement, PublicProductShareManagementPanel } from "./PublicProductShareManagement";
import { emptyPublicShareManagementState } from "./public-product-share-management.coordinator";
const noop = () => undefined;
const props = { id: "public-share-test", locale: "en" as const, branchId: "b", canRetrieve: true, canRevoke: true, known: "", state: emptyPublicShareManagementState,
  onKnown: noop, onIssue: noop, onCopy: noop, onReview: noop, onAccept: noop, onCancel: noop, onHide: noop };
it("panel mounts no browser/URL retrieval during prerender and no unauthorized controls", () => {
  const original = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, get: () => { throw new Error("NavigatorReadWithoutInteraction"); } });
  try { assert.equal(renderToStaticMarkup(createElement(PublicProductShareManagement, { productId: "p", locale: "en" })), ""); }
  finally { if (original) Object.defineProperty(globalThis, "navigator", original); else Reflect.deleteProperty(globalThis, "navigator"); }
  assert.equal(renderToStaticMarkup(createElement(PublicProductShareManagementPanel, { ...props, canRetrieve: false, canRevoke: false })), "");
});
for (const locale of ["ar", "en"] as const) it("accessible localized inline structure: " + locale, () => {
  const markup = renderToStaticMarkup(createElement(PublicProductShareManagementPanel, { ...props, locale }));
  assert.match(markup, new RegExp('lang="' + locale + '"')); assert.match(markup, new RegExp('dir="' + (locale === "ar" ? "rtl" : "ltr") + '"'));
  assert.match(markup, /aria-labelledby="public-share-test-title"/); assert.match(markup, /<h2/); assert.match(markup, /role="status"/); assert.match(markup, /aria-live="polite"/);
  assert.match(markup, /for="public-share-test-grant"/); assert.doesNotMatch(markup, /<a|\/share\//);
  if (locale === "ar") assert.match(markup, /رابط مشاركة المنتج العام/);
});
it("known-grant revoke remains available without branch or product-view retrieval hints", () => {
  const markup = renderToStaticMarkup(createElement(PublicProductShareManagementPanel, { ...props, branchId: undefined, canRetrieve: false, known: "known" }));
  assert.match(markup, /Revoke a known grant/); assert.doesNotMatch(markup, /Copy current link|Issue \/ reuse/);
});
it("confirmation and manual copy are labeled native controls with escaped LTR URL", () => {
  const confirmation = renderToStaticMarkup(createElement(PublicProductShareManagementPanel, { ...props, state: { busy: false, message: "Idle", confirmation: { operation: "replace", grantId: "known" } } }));
  assert.match(confirmation, /<fieldset/); assert.match(confirmation, /<legend/); assert.match(confirmation, /Cancel action/); assert.match(confirmation, /Confirm/);
  const manual = renderToStaticMarkup(createElement(PublicProductShareManagementPanel, { ...props, state: { busy: false, message: "ClipboardDenied", url: "https://example.test/share/" + "A".repeat(43) } }));
  assert.match(manual, /textarea[^>]*readOnly=""[^>]*dir="ltr"/); assert.match(manual, /Automatic copy failed/); assert.match(manual, /Hide link/); assert.doesNotMatch(manual, /<a/);
});

it("management text-entry boundaries meet non-text contrast against their surface", () => {
  const stylesheet = readFileSync("app/globals.css", "utf8");
  const rule = stylesheet.match(/\.public-share-management textarea, \.public-share-management input\s*\{([^}]+)\}/)?.[1];
  assert.ok(rule, "Management text-entry rule must be present");
  const border = rule.match(/border:\s*1px solid\s+([^;]+);/)?.[1].trim();
  const surface = stylesheet.match(/--surface:\s*(#[a-f0-9]{6})/i)?.[1];
  const resolve = (value: string | undefined): string => {
    assert.ok(value, "Contrast color must be defined");
    const variable = value.match(/^var\(--([a-z-]+)\)$/)?.[1];
    const color = variable ? stylesheet.match(new RegExp("--" + variable + ":\\s*(#[a-f0-9]{6})", "i"))?.[1] : value;
    assert.ok(color && /^#[a-f0-9]{6}$/i.test(color), "Use a measurable solid boundary color");
    return color;
  };
  const luminance = (color: string): number => {
    const channels = [1, 3, 5].map((offset) => Number.parseInt(color.slice(offset, offset + 2), 16) / 255)
      .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4);
    return channels[0] * 0.2126 + channels[1] * 0.7152 + channels[2] * 0.0722;
  };
  const values = [luminance(resolve(border)), luminance(resolve(surface))].sort((left, right) => right - left);
  const ratio = (values[0] + 0.05) / (values[1] + 0.05);
  assert.ok(ratio >= 3, "The input and manual-copy boundary must reach at least 3:1 against the surface");
});
it("Issue and Copy identify their invoking control for focus restoration", () => {
  const calls: { operation: string; trigger: HTMLButtonElement }[] = [];
  const tree = PublicProductShareManagementPanel({ ...props,
    onIssue: (trigger) => calls.push({ operation: "issue", trigger }),
    onCopy: (trigger) => calls.push({ operation: "copy", trigger }),
  });
  type Click = (event: { currentTarget: HTMLButtonElement }) => void;
  const findClick = (node: ReactNode, label: string): Click | undefined => {
    if (!isValidElement<{ children?: ReactNode; onClick?: Click }>(node)) return undefined;
    if (node.type === "button" && node.props.children === label) return node.props.onClick;
    for (const child of Children.toArray(node.props.children)) {
      const found = findClick(child, label);
      if (found) return found;
    }
    return undefined;
  };
  const trigger = {} as HTMLButtonElement;
  for (const label of ["Issue / reuse", "Copy current link"]) {
    const click = findClick(tree, label);
    assert.ok(click, "Expected the labelled management action");
    click({ currentTarget: trigger });
  }
  assert.deepEqual(calls.map((call) => call.operation), ["issue", "copy"]);
  assert.ok(calls.every((call) => call.trigger === trigger));
});