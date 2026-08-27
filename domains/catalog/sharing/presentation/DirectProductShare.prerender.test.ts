import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { DirectProductShare } from "./DirectProductShare";

describe("DirectProductShare prerender safety", () => {
  it("renders without inspecting Web Share, canShare, or Clipboard capabilities", () => {
    const originalNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      get: () => { throw new Error("NavigatorAccessedDuringPrerender"); },
    });
    try {
      const markup = renderToStaticMarkup(createElement(DirectProductShare, {
        productId: "product-a",
        locale: "en",
        canShareWholesale: false,
      }));
      assert.match(markup, /<section/);
      assert.match(markup, /Prepare share/);
    } finally {
      if (originalNavigator) Object.defineProperty(globalThis, "navigator", originalNavigator);
      else Reflect.deleteProperty(globalThis, "navigator");
    }
  });
});
