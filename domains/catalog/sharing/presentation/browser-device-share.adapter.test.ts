import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { BrowserDeviceShareAdapter } from "./browser-device-share.adapter";

const content = { title: "Product", text: "Sales text" };

describe("BrowserDeviceShareAdapter", () => {
  it("shares text when navigator.share is available", async () => {
    let shared: ShareData | undefined;
    const result = await new BrowserDeviceShareAdapter(() => ({ share: async (data) => { shared = data; } })).share(content);
    assert.equal(result, "Shared"); assert.deepEqual(shared, content);
  });

  it("shares file and text only when canShare accepts files", async () => {
    const file = { name: "product.webp", type: "image/webp" } as File;
    let shared: ShareData | undefined;
    const adapter = new BrowserDeviceShareAdapter(() => ({ canShare: (data) => Boolean(data.files?.length), share: async (data) => { shared = data; } }));
    assert.equal(await adapter.share({ ...content, file }), "Shared"); assert.deepEqual(shared?.files, [file]);
  });

  it("falls back to text when files are unsupported or canShare rejects", async () => {
    const file = {} as File;
    for (const canShare of [() => false, () => { throw new Error("unsupported"); }]) {
      let shared: ShareData | undefined;
      const result = await new BrowserDeviceShareAdapter(() => ({ canShare, share: async (data) => { shared = data; } })).share({ ...content, file });
      assert.equal(result, "Shared"); assert.equal(shared?.files, undefined);
    }
  });

  it("models AbortError as neutral cancellation", async () => {
    const result = await new BrowserDeviceShareAdapter(() => ({ share: async () => { throw { name: "AbortError" }; } })).share(content);
    assert.equal(result, "Cancelled");
  });

  it("copies when Web Share is unavailable and exposes manual fallback when Clipboard fails", async () => {
    let copied = "";
    assert.equal(await new BrowserDeviceShareAdapter(() => ({ clipboard: { writeText: async (text) => { copied = text; } } })).share(content), "Copied");
    assert.equal(copied, content.text);
    assert.equal(await new BrowserDeviceShareAdapter(() => ({})).share(content), "Unsupported");
    assert.equal(await new BrowserDeviceShareAdapter(() => ({ clipboard: { writeText: async () => { throw new Error("denied"); } } })).share(content), "Unsupported");
  });

  it("returns Failed for non-cancellation native share failures", async () => {
    assert.equal(await new BrowserDeviceShareAdapter(() => ({ share: async () => { throw new Error("failed"); } })).share(content), "Failed");
  });

  it("resolves browser capabilities lazily only for the explicit share interaction", async () => {
    let resolutions = 0;
    const adapter = new BrowserDeviceShareAdapter(() => { resolutions += 1; return undefined; });
    assert.equal(resolutions, 0);
    assert.equal(await adapter.share(content), "Unsupported");
    assert.equal(resolutions, 1);
  });
});
