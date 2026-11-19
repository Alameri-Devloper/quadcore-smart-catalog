import type { PublicShareKeyVersionInspectionPort } from "./public-share-key-version-inspector.port";
import type { PublicProductShareGrantRepository, PublicProductShareTuple } from "./public-product-share-grant-repository.port";
import type { PublicProductShareResourcePort } from "./public-product-share-unit-of-work.port";
export interface PublicShareMainMedia {
  readonly workspaceId: string;
  readonly productId: string;
  readonly storageRootKey: string;
  readonly storageKey: string;
  readonly expectedSha256: string;
}
export interface PublicShareCurrentMainPort {
  findCurrent(tuple: PublicProductShareTuple): Promise<PublicShareMainMedia | null>;
}
export type PublicShareMediaReadResult =
  | { readonly type: "Found"; readonly bytes: Uint8Array }
  | { readonly type: "Missing" | "Unavailable" };
export interface PublicShareMediaReaderPort {
  read(input: PublicShareMainMedia & { readonly maximumBytes: number }): Promise<PublicShareMediaReadResult>;
}
export interface PublicShareReadContext {
  readonly keys: PublicShareKeyVersionInspectionPort;
  readonly grants: Pick<PublicProductShareGrantRepository, "findByDigestCandidates">;
  readonly resources: Pick<PublicProductShareResourcePort, "readCurrent">;
  readonly media: PublicShareCurrentMainPort;
}
/** One read-only REPEATABLE READ snapshot per request. No Identity actor or writes. */
export interface PublicShareReadSnapshotPort {
  execute<T>(work: (context: PublicShareReadContext) => Promise<T>): Promise<T>;
}