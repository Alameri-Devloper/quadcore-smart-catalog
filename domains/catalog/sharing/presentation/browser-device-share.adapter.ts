import type { DeviceShareContent, DeviceShareOutcome, DeviceSharePort } from "./device-share.port";

interface BrowserNavigator {
  readonly share?: (data: ShareData) => Promise<void>;
  readonly canShare?: (data: ShareData) => boolean;
  readonly clipboard?: { readonly writeText: (text: string) => Promise<void> };
}

type BrowserNavigatorResolver = () => BrowserNavigator | undefined;

export const resolveBrowserNavigator = (): BrowserNavigator | undefined => typeof navigator === "undefined" ? undefined : navigator;

export class BrowserDeviceShareAdapter implements DeviceSharePort {
  constructor(private readonly resolveBrowser: BrowserNavigatorResolver = resolveBrowserNavigator) {}

  async share(content: DeviceShareContent): Promise<DeviceShareOutcome> {
    const browser = this.resolveBrowser();
    if (!browser?.share) return this.copy(browser, content.text);
    const textOnly: ShareData = { title: content.title, text: content.text };
    let data = textOnly;
    if (content.file) {
      try {
        const withFile: ShareData = { ...textOnly, files: [content.file] };
        if (browser.canShare?.(withFile)) data = withFile;
      } catch { data = textOnly; }
    }
    try {
      await browser.share(data);
      return "Shared";
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return "Cancelled";
      if (typeof error === "object" && error !== null && "name" in error && error.name === "AbortError") return "Cancelled";
      return "Failed";
    }
  }

  private async copy(browser: BrowserNavigator | undefined, text: string): Promise<DeviceShareOutcome> {
    if (!browser?.clipboard?.writeText) return "Unsupported";
    try { await browser.clipboard.writeText(text); return "Copied"; }
    catch { return "Unsupported"; }
  }
}
