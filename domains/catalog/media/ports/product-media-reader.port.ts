export type ProductMediaReadResult =
  | { readonly type: "Found"; readonly bytes: Uint8Array }
  | { readonly type: "Unavailable" };

export interface ProductMediaReaderPort {
  read(input: {
    readonly workspaceId: string;
    readonly productId: string;
    readonly storageRootKey: string;
    readonly storageKey: string;
    readonly expectedSha256: string;
    readonly maximumBytes: number;
  }): Promise<ProductMediaReadResult>;
}
