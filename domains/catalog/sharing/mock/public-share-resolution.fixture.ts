import type { PublicShareKeyVersionInspectionResult } from "../ports/public-share-key-version-inspector.port";
import { publicShareMemoryFixture, publicShareResource } from "./public-share-lifecycle.fixture";
import { ResolvePublicProductShare } from "../application/resolve-public-product-share";
import type { PublicShareAdmissionPort, PublicShareAdmissionResult } from "../ports/public-share-admission.port";
import type { PublicShareReadSnapshotPort, PublicShareMediaReaderPort, PublicShareMainMedia } from "../ports/public-share-resolution.port";
import type { PublicProductShareLookupResult, PublicProductShareTuple } from "../ports/public-product-share-grant-repository.port";

export const publicShareResolutionFixture = async () => {
  const memory = publicShareMemoryFixture(), issued = await memory.lifecycle.issue(memory.command);
  if (!issued.ok) throw Error("SyntheticIssueFailed");
  const token = issued.value.url.split("/").at(-1)!;
  const state = {
    resource: publicShareResource(), snapshots: 0, lookups: 0, reads: 0, releases: 0,
    lookupResult: undefined as PublicProductShareLookupResult | undefined,
    keyInspection: undefined as PublicShareKeyVersionInspectionResult | undefined,
    media: null as PublicShareMainMedia | null,
    readResult: { type: "Found", bytes: new Uint8Array([82,73,70,70,4,0,0,0,87,69,66,80]) } as Awaited<ReturnType<PublicShareMediaReaderPort["read"]>>,
    readFailure: false, databaseFailure: false, releaseFailure: false,
    admissions: [] as Parameters<PublicShareAdmissionPort["admit"]>[0][],
    decisions: {} as Partial<Record<"Source" | "Resolved" | "MediaRead", PublicShareAdmissionResult>>,
    scopeQueries: [] as PublicProductShareTuple[],
  };
  const admission: PublicShareAdmissionPort = { admit: async input => {
    state.admissions.push(input);
    return state.decisions[input.phase] ?? { type: "Allowed", ...(input.phase === "MediaRead" ? { release: async () => {
      state.releases++; if (state.releaseFailure) throw Error("SyntheticLeaseFailure");
    } } : {}) };
  } };
  const snapshots: PublicShareReadSnapshotPort = { execute: async work => {
    state.snapshots++;
    if (state.databaseFailure) throw Error("SyntheticDatabaseFailure");
    return work({
      keys: { inspect: async () => state.keyInspection ?? { type: "Inspected", evidence: {
        lookupVersions: memory.grants().filter(g => g.revokedAt === null).map(g => g.lookupDigest.keyVersion), encryptionVersions: [],
        inspectedAt: new Date("2026-10-22"), source: "PostgreSqlPublicProductShareGrants", scope: "ServiceWide", consistency: "StatementSnapshot",
      } } },
      grants: { findByDigestCandidates: async candidates => {
        state.lookups++;
        return state.lookupResult ?? (() => {
          const grant = memory.grants().find(g => candidates.some(c => c.keyVersion === g.lookupDigest.keyVersion && c.value === g.lookupDigest.value));
          return grant ? { type: "Found" as const, grant } : { type: "NotFound" as const };
        })();
      } },
      resources: { readCurrent: async tuple => { state.scopeQueries.push(tuple); return state.resource; } },
      media: { findCurrent: async () => state.media },
    });
  } };
  const reader: PublicShareMediaReaderPort = { read: async () => { state.reads++; if (state.readFailure) throw Error("SyntheticReaderFailure"); return state.readResult; } };
  return { state, memory, token, admission, snapshots, reader, resolver: new ResolvePublicProductShare(snapshots, memory.runtime.lookupDigest, admission, reader),
    withImage: () => { state.media = { workspaceId: "p4-workspace", productId: "p4-product", storageRootKey: "synthetic-root", storageKey: "synthetic-key", expectedSha256: "a".repeat(64) }; } };
};