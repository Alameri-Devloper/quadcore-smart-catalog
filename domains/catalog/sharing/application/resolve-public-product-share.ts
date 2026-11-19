import { validatePublicShareToken } from "../domain/public-share-values";
import type { PublicShareLookupDigestPort } from "../ports/public-share-crypto.port";
import type { PublicShareAdmissionPort, PublicShareAdmissionResult, PublicShareRouteClass } from "../ports/public-share-admission.port";
import type { PublicShareReadSnapshotPort, PublicShareMediaReaderPort } from "../ports/public-share-resolution.port";
import { projectPublicShareResource, type PublicShareProjection } from "./public-share-projection";

export const PUBLIC_SHARE_MEDIA_MAXIMUM_BYTES = 8 * 1024 * 1024;
export type PublicShareResolutionFailure = { readonly ok: false; readonly error: "NotFound" | "ServiceUnavailable" | "AdmissionDenied"; readonly retryAfterSeconds?: number };
export type PublicShareResolutionResult<T> = { readonly ok: true; readonly value: T } | PublicShareResolutionFailure;
export interface PublicShareMediaHandoff { readonly projection: PublicShareProjection; readonly bytes: Uint8Array }
const missing = (): PublicShareResolutionFailure => ({ ok: false, error: "NotFound" });
const unavailable = (): PublicShareResolutionFailure => ({ ok: false, error: "ServiceUnavailable" });
const admissionFailure = (result: PublicShareAdmissionResult): PublicShareResolutionFailure =>
  result.type === "Denied" ? { ok: false, error: "AdmissionDenied",
    ...(Number.isSafeInteger(result.retryAfterSeconds) && result.retryAfterSeconds! >= 0 ? { retryAfterSeconds: result.retryAfterSeconds } : {}) } : unavailable();

/** Anonymous authority is the canonical bearer alone. Results are internal handoffs, never a public data API. */
export class ResolvePublicProductShare {
  constructor(private readonly snapshots: PublicShareReadSnapshotPort,
    private readonly lookup: PublicShareLookupDigestPort, private readonly admission: PublicShareAdmissionPort,
    private readonly reader: PublicShareMediaReaderPort) {}
  private async admit(input: Parameters<PublicShareAdmissionPort["admit"]>[0]): Promise<PublicShareAdmissionResult> {
    try { const result = await this.admission.admit(input); return result?.type === "Allowed" || result?.type === "Denied" ? result : { type: "Unavailable" }; }
    catch { return { type: "Unavailable" }; }
  }
  resolvePage(token: unknown, sourceIdentity: string): Promise<PublicShareResolutionResult<PublicShareProjection>> {
    return this.resolve(token, sourceIdentity, "Page") as Promise<PublicShareResolutionResult<PublicShareProjection>>;
  }
  resolveMedia(token: unknown, sourceIdentity: string): Promise<PublicShareResolutionResult<PublicShareMediaHandoff>> {
    return this.resolve(token, sourceIdentity, "Media") as Promise<PublicShareResolutionResult<PublicShareMediaHandoff>>;
  }
  private async resolve(token: unknown, sourceIdentity: string, routeClass: PublicShareRouteClass):
    Promise<PublicShareResolutionResult<PublicShareProjection | PublicShareMediaHandoff>> {
    if (typeof sourceIdentity !== "string" || !/^[A-Za-z0-9_.:-]{1,256}$/.test(sourceIdentity)) return unavailable();
    const source = await this.admit({ sourceIdentity, routeClass, phase: "Source" });
    if (source.type !== "Allowed") return admissionFailure(source);
    try { validatePublicShareToken(token as string); } catch { return missing(); }
    const canonical = token as string;
    try {
      const candidates = this.lookup.candidates(canonical);
      if (!candidates.ok) return unavailable();
      return await this.snapshots.execute(async context => {
        // Configuration alone cannot prove durable lookup coverage. Inspect in this
        // request's snapshot; unavailable or missing versions must not look like 404.
        const inspection = await context.keys.inspect();
        if (inspection.type !== "Inspected" || inspection.evidence.lookupVersions.some(version =>
          !Number.isSafeInteger(version) || version < 1 || !candidates.value.some(candidate => candidate.keyVersion === version))) return unavailable();
        const found = await context.grants.findByDigestCandidates(candidates.value);
        if (found.type === "NotFound") return missing();
        if (found.type !== "Found") return unavailable();
        const grant = found.grant;
        if (grant.revokedAt !== null) return missing();
        const verified = this.lookup.verify(canonical, grant.lookupDigest);
        if (!verified.ok || !verified.value) return unavailable();
        const scope = { workspaceId: grant.workspaceId, productId: grant.productId, branchId: grant.branchId };
        const resolved = await this.admit({ sourceIdentity, routeClass, phase: "Resolved", workspaceId: scope.workspaceId, grantId: grant.grantId });
        if (resolved.type !== "Allowed") return admissionFailure(resolved);
        const resource = await context.resources.readCurrent(scope);
        if (!resource) return missing();
        const selected = projectPublicShareResource(scope.workspaceId, resource);
        if (selected.type === "IntegrityFailure") return unavailable();
        if (selected.type !== "Eligible") return missing();
        const projection = selected.projection;
        const media = await context.media.findCurrent(scope);
        if (!media) return routeClass === "Media" ? missing() : { ok: true, value: projection };
        if (media.workspaceId !== scope.workspaceId || media.productId !== scope.productId) return unavailable();
        const lease = await this.admit({ sourceIdentity, routeClass, phase: "MediaRead",
          workspaceId: scope.workspaceId, grantId: grant.grantId, maximumBytes: PUBLIC_SHARE_MEDIA_MAXIMUM_BYTES });
        if (lease.type !== "Allowed") return routeClass === "Media" ? admissionFailure(lease) : { ok: true, value: projection };
        if (!lease.release) return routeClass === "Media" ? unavailable() : { ok: true, value: projection };
        let read;
        try {
          try { read = await this.reader.read({ ...media, maximumBytes: PUBLIC_SHARE_MEDIA_MAXIMUM_BYTES }); }
          finally { await lease.release(); }
        } catch { read = { type: "Unavailable" as const }; }
        if (read.type !== "Found") return routeClass === "Media" ? (read.type === "Unavailable" ? unavailable() : missing()) : { ok: true, value: projection };
        if (read.bytes.byteLength > PUBLIC_SHARE_MEDIA_MAXIMUM_BYTES) return routeClass === "Media" ? missing() : { ok: true, value: projection };
        const withImage = { ...projection, hasMainImage: true };
        return routeClass === "Media" ? { ok: true, value: { projection: withImage, bytes: read.bytes } } : { ok: true, value: withImage };
      });
    } catch { return unavailable(); }
  }
}