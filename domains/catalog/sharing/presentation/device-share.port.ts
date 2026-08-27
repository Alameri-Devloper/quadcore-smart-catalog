export type DeviceShareOutcome = "Shared" | "Copied" | "Cancelled" | "Unsupported" | "Failed";

export interface DeviceShareContent {
  readonly title: string;
  readonly text: string;
  readonly file?: File;
}

export interface DeviceSharePort {
  share(content: DeviceShareContent): Promise<DeviceShareOutcome>;
}
