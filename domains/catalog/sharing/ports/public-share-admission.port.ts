export type PublicShareRouteClass = "Page" | "Media";
export type PublicShareAdmissionResult =
  | { readonly type: "Allowed"; readonly release?: () => Promise<void> }
  | { readonly type: "Denied"; readonly retryAfterSeconds?: number }
  | { readonly type: "Unavailable" };
/** Infrastructure owns atomic global/source/route/resolved budgets and media leases.
 * Source identity is supplied by trusted server composition, never a bearer or arbitrary forwarded header.
 * MediaRead requires a bounded byte/concurrent-read reservation and an idempotent release. */
export interface PublicShareAdmissionPort {
  admit(input: {
    readonly routeClass: PublicShareRouteClass;
    readonly phase: "Source" | "Resolved" | "MediaRead";
    readonly sourceIdentity: string;
    readonly workspaceId?: string;
    readonly grantId?: string;
    readonly maximumBytes?: number;
  }): Promise<PublicShareAdmissionResult>;
}
export const unavailablePublicShareAdmission: PublicShareAdmissionPort = Object.freeze({
  admit: async () => ({ type: "Unavailable" as const }),
});