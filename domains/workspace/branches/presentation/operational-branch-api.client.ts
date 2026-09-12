import { OPERATIONAL_BRANCH_PURPOSES, type OperationalBranchFailure, type OperationalBranchPort, type OperationalBranchPurpose, type OperationalBranchResult, type OperationalBranchView } from "./operational-branch-selector.types";

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("InvalidResponse");
  return value as JsonObject;
};
const own = (value: JsonObject, key: string): unknown => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error("InvalidResponse");
  return value[key];
};
const text = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error("InvalidResponse");
  return value;
};
export const reconstructOperationalBranches = (value: unknown): readonly OperationalBranchView[] => {
  if (!Array.isArray(value)) throw new Error("InvalidResponse");
  const ids = new Set<string>();
  return Object.freeze(value.map((entry): OperationalBranchView => {
    const item = object(entry), branchId = text(own(item, "branchId")), status = own(item, "status");
    if ((status !== "Active" && status !== "Inactive") || ids.has(branchId)) throw new Error("InvalidResponse");
    ids.add(branchId);
    return Object.freeze({ branchId, code: text(own(item, "code")), displayName: text(own(item, "displayName")), status });
  }));
};
const errors: Readonly<Record<string, readonly [number, OperationalBranchFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  InvalidInput: [400, "InvalidInput"], Forbidden: [403, "Forbidden"], BranchServiceUnavailable: [503, "BranchServiceUnavailable"],
};

export class OperationalBranchApiClient implements OperationalBranchPort {
  constructor(private readonly fetchPort: FetchPort = fetch) {}
  async list(purpose: OperationalBranchPurpose, signal?: AbortSignal): Promise<OperationalBranchResult> {
    if (!OPERATIONAL_BRANCH_PURPOSES.includes(purpose)) return { ok: false, kind: "InvalidInput" };
    let response: Response;
    try {
      response = await this.fetchPort(`/api/branches/operational?purpose=${encodeURIComponent(purpose)}`, {
        method: "GET", credentials: "same-origin", cache: "no-store", signal, headers: { accept: "application/json" },
      });
    } catch { return { ok: false, kind: "NetworkFailure" }; }
    let body: JsonObject, type: string;
    try { body = object(await response.json()); type = text(own(body, "type")); }
    catch { return { ok: false, kind: "MalformedResponse" }; }
    if (!response.ok) {
      const error = Object.prototype.hasOwnProperty.call(errors, type) ? errors[type] : undefined;
      return { ok: false, kind: error?.[0] === response.status ? error[1] : "UnexpectedResponse" };
    }
    if (response.status !== 200) return { ok: false, kind: "UnexpectedResponse" };
    try {
      if (type !== "Success") throw new Error("InvalidResponse");
      return { ok: true, value: reconstructOperationalBranches(own(body, "value")) };
    } catch { return { ok: false, kind: "MalformedResponse" }; }
  }
}
