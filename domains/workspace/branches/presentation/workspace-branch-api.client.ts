import type { BranchManagementFailure, BranchManagementResult, BranchManagementView, CreateBranchInput, UpdateBranchInput, WorkspaceBranchPort } from "./branch-management.types";

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;
const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("InvalidResponse");
  return value as JsonObject;
};
const field = (value: JsonObject, key: string): unknown => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error("InvalidResponse");
  return value[key];
};
const text = (value: unknown): string => {
  if (typeof value !== "string" || !value.trim()) throw new Error("InvalidResponse");
  return value;
};
const integer = (value: unknown, minimum: number): number => {
  if (!Number.isSafeInteger(value) || (value as number) < minimum) throw new Error("InvalidResponse");
  return value as number;
};
const timestamp = (value: unknown): string => {
  const result = text(value), date = new Date(result);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== result) throw new Error("InvalidResponse");
  return result;
};

export const reconstructBranchManagementView = (value: unknown): BranchManagementView => {
  const item = object(value);
  const status = field(item, "status"), code = text(field(item, "code")), displayName = text(field(item, "displayName"));
  const sortOrder = integer(field(item, "sortOrder"), 0);
  const createdAt = timestamp(field(item, "createdAt")), updatedAt = timestamp(field(item, "updatedAt"));
  if ((status !== "Active" && status !== "Inactive") || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/u.test(code)
    || code.length > 64 || displayName.length > 160 || sortOrder > 1_000_000 || createdAt > updatedAt) throw new Error("InvalidResponse");
  return Object.freeze({ branchId: text(field(item, "branchId")), code, displayName, status, sortOrder,
    revision: integer(field(item, "revision"), 1), createdAt, updatedAt });
};

const failures: Readonly<Record<string, readonly [number, BranchManagementFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  Forbidden: [403, "Forbidden"], OriginNotAllowed: [403, "OriginNotAllowed"], InvalidInput: [400, "InvalidInput"],
  NotFound: [404, "BranchNotFound"], Conflict: [409, "Conflict"], CodeConflict: [409, "CodeConflict"],
  BranchServiceUnavailable: [503, "BranchServiceUnavailable"],
};

export class WorkspaceBranchApiClient implements WorkspaceBranchPort {
  constructor(private readonly fetchPort: FetchPort = fetch) {}

  private async request<T>(path: string, method: "GET" | "POST" | "PATCH", parse: (value: unknown) => T, signal?: AbortSignal, input?: CreateBranchInput | UpdateBranchInput): Promise<BranchManagementResult<T>> {
    const fetchPort = this.fetchPort;
    let response: Response;
    try {
      response = await fetchPort(path, { method, credentials: "same-origin", cache: "no-store", signal,
        headers: { accept: "application/json", ...(input ? { "content-type": "application/json" } : {}) },
        ...(input ? { body: JSON.stringify(input) } : {}) });
    } catch { return { ok: false, kind: "NetworkFailure" }; }
    let body: JsonObject;
    try { body = object(await response.json()); field(body, "type"); }
    catch { return { ok: false, kind: "MalformedResponse" }; }
    if (!response.ok) {
      const entry = typeof body.type === "string" && Object.prototype.hasOwnProperty.call(failures, body.type) ? failures[body.type] : undefined;
      return { ok: false, kind: entry?.[0] === response.status ? entry[1] : "UnexpectedResponse" };
    }
    if (response.status !== (method === "POST" ? 201 : 200)) return { ok: false, kind: "UnexpectedResponse" };
    try {
      if (body.type !== "Success") throw new Error("InvalidResponse");
      return { ok: true, value: parse(field(body, "value")) };
    } catch { return { ok: false, kind: "MalformedResponse" }; }
  }

  list(signal?: AbortSignal) {
    return this.request("/api/branches", "GET", (value) => {
      if (!Array.isArray(value)) throw new Error("InvalidResponse");
      const items = value.map(reconstructBranchManagementView);
      if (new Set(items.map(({ branchId }) => branchId)).size !== items.length) throw new Error("InvalidResponse");
      return Object.freeze(items);
    }, signal);
  }
  private detail(path: string, method: "GET" | "PATCH", branchId: string, signal?: AbortSignal, input?: UpdateBranchInput) {
    // Reserved/static paths and URL dot segments must never become detail requests.
    if (!branchId.trim() || ["operational", ".", ".."].includes(branchId)) {
      return Promise.resolve<BranchManagementResult<BranchManagementView>>({ ok: false, kind: "InvalidInput" });
    }
    return this.request(path, method, (value) => {
      const branch = reconstructBranchManagementView(value);
      if (branch.branchId !== branchId) throw new Error("InvalidResponse");
      return branch;
    }, signal, input);
  }
  get(branchId: string, signal?: AbortSignal) {
    return this.detail(`/api/branches/${encodeURIComponent(branchId)}`, "GET", branchId, signal);
  }
  create(input: CreateBranchInput, signal?: AbortSignal) {
    return this.request("/api/branches", "POST", reconstructBranchManagementView, signal,
      { code: input.code, displayName: input.displayName, sortOrder: input.sortOrder });
  }
  update(branchId: string, input: UpdateBranchInput, signal?: AbortSignal) {
    return this.detail(`/api/branches/${encodeURIComponent(branchId)}`, "PATCH", branchId, signal,
      { expectedRevision: input.expectedRevision, displayName: input.displayName, sortOrder: input.sortOrder, status: input.status });
  }
}
