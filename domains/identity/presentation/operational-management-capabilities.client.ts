import type {
  OperationalManagementCapabilitiesView,
  OperationalManagementCapabilityResult,
} from "./operational-management-capabilities.types";

type FetchPort = (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
type JsonObject = Record<string, unknown>;

const object = (value: unknown): JsonObject => {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("InvalidCapabilityResponse");
  return value as JsonObject;
};

const own = (value: JsonObject, key: string): unknown => {
  if (!Object.prototype.hasOwnProperty.call(value, key)) throw new Error("InvalidCapabilityResponse");
  return value[key];
};

const boolean = (value: JsonObject, key: string): boolean => {
  const field = own(value, key);
  if (typeof field !== "boolean") throw new Error("InvalidCapabilityResponse");
  return field;
};

/** A1 returns a bare object. Reconstruct, rather than retaining transport objects. */
export const parseOperationalManagementCapabilities = (payload: unknown): OperationalManagementCapabilitiesView | null => {
  try {
    const value = object(payload);
    const branches = object(own(value, "branches"));
    const listing = object(own(value, "listing"));
    const inventory = object(own(value, "inventory"));
    const pricing = object(own(value, "pricing"));
    const referenceCost = object(own(value, "referenceCost"));
    return Object.freeze({
      branches: Object.freeze({ canView: boolean(branches, "canView"), canManage: boolean(branches, "canManage") }),
      listing: Object.freeze({ canManage: boolean(listing, "canManage") }),
      inventory: Object.freeze({
        canViewAvailability: boolean(inventory, "canViewAvailability"),
        canViewQuantities: boolean(inventory, "canViewQuantities"),
        canReceive: boolean(inventory, "canReceive"),
        canIssue: boolean(inventory, "canIssue"),
        canReserve: boolean(inventory, "canReserve"),
        canTransfer: boolean(inventory, "canTransfer"),
        canManageDamage: boolean(inventory, "canManageDamage"),
        canAdjust: boolean(inventory, "canAdjust"),
      }),
      pricing: Object.freeze({
        canView: boolean(pricing, "canView"),
        canViewWholesale: boolean(pricing, "canViewWholesale"),
        canManageWorkspace: boolean(pricing, "canManageWorkspace"),
        canManageBranchOverrides: boolean(pricing, "canManageBranchOverrides"),
      }),
      referenceCost: Object.freeze({
        canView: boolean(referenceCost, "canView"),
        canManageWorkspace: boolean(referenceCost, "canManageWorkspace"),
        canManageBranchOverrides: boolean(referenceCost, "canManageBranchOverrides"),
      }),
    });
  } catch { return null; }
};

const failure = (status: number, payload: unknown): OperationalManagementCapabilityResult => {
  if (status === 401) return { ok: false, kind: "AuthenticationRequired" };
  const code = payload && typeof payload === "object" && "type" in payload ? payload.type : null;
  if (status === 403) return { ok: false, kind: code === "ForbiddenForRestrictedSession" ? code : "Forbidden" };
  if (status === 400 && code === "InvalidQuery") return { ok: false, kind: code };
  if (status === 503 && code === "OperationalManagementCapabilityServiceUnavailable") return { ok: false, kind: code };
  return { ok: false, kind: "Unavailable" };
};

export class OperationalManagementCapabilitiesClient {
  constructor(private readonly fetchPort: FetchPort = fetch) {}

  async load(signal?: AbortSignal): Promise<OperationalManagementCapabilityResult> {
    try {
      const response = await this.fetchPort("/api/operations/capabilities", {
        method: "GET",
        credentials: "same-origin",
        cache: "no-store",
        headers: { accept: "application/json" },
        signal,
      });
      const payload: unknown = await response.json().catch(() => null);
      if (response.status !== 200) return failure(response.status, payload);
      const value = parseOperationalManagementCapabilities(payload);
      return value ? { ok: true, value } : { ok: false, kind: "Unavailable" };
    } catch { return { ok: false, kind: "Unavailable" }; }
  }
}
