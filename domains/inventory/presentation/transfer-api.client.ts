import { reconstructInventoryRead, type FetchPort } from "./inventory-api.client";
import type { InventoryAvailability, InventoryFailure, InventoryQuantityView } from "./inventory.types";
import type { TransferCommand, TransferMutationView, TransferPort, TransferResult } from "./transfer.types";

type JsonObject = Record<string, unknown>;
const invalid = (): never => { throw new Error("InvalidResponse"); };
const object = (value: unknown): JsonObject => value && typeof value === "object" && !Array.isArray(value) ? value as JsonObject : invalid();
const own = (value: JsonObject, key: string): unknown => Object.prototype.hasOwnProperty.call(value, key) ? value[key] : invalid();
const has = (value: JsonObject, key: string): boolean => Object.prototype.hasOwnProperty.call(value, key);
const text = (value: unknown): string => typeof value === "string" && value.length > 0 ? value : invalid();
const availability = (value: unknown): InventoryAvailability => value === "InStock" || value === "OutOfStock" ? value : invalid();

export const reconstructTransferMutation = (value: unknown, command: TransferCommand): TransferMutationView => {
  const row = object(value), operationId = text(own(row, "operationId")), transferId = text(own(row, "transferId"));
  if (operationId !== command.operationId || own(row, "status") !== "Succeeded") invalid();
  const balanceKeys = ["sourceBalance", "destinationBalance"] as const;
  const availabilityKeys = ["sourceAvailability", "destinationAvailability"] as const;
  const balances = balanceKeys.map(key => has(row, key)), availabilities = availabilityKeys.map(key => has(row, key));
  if (balances.some(Boolean) && (!balances.every(Boolean) || availabilities.some(Boolean))) invalid();
  if (availabilities.some(Boolean) && (!availabilities.every(Boolean) || balances.some(Boolean))) invalid();
  const minimum = { operationId, status: "Succeeded" as const, transferId };
  if (balances.every(Boolean)) {
    const sourceBalance = reconstructInventoryRead(own(row, "sourceBalance"), { branchId: command.sourceBranchId, productId: command.productId });
    const destinationBalance = reconstructInventoryRead(own(row, "destinationBalance"), { branchId: command.destinationBranchId, productId: command.productId });
    if (!("quantities" in sourceBalance) || !("quantities" in destinationBalance)) invalid();
    return Object.freeze({ ...minimum, sourceBalance: sourceBalance as InventoryQuantityView, destinationBalance: destinationBalance as InventoryQuantityView });
  }
  if (availabilities.every(Boolean)) return Object.freeze({ ...minimum,
    sourceAvailability: availability(own(row, "sourceAvailability")), destinationAvailability: availability(own(row, "destinationAvailability")) });
  return Object.freeze(minimum);
};

const errors: Readonly<Record<string, readonly [number, InventoryFailure]>> = {
  AuthenticationRequired: [401, "AuthenticationRequired"], ForbiddenForRestrictedSession: [403, "ForbiddenForRestrictedSession"],
  OriginNotAllowed: [403, "OriginNotAllowed"], Forbidden: [403, "Forbidden"], BranchNotFound: [404, "BranchNotFound"],
  ProductNotFound: [404, "ProductNotFound"], BranchInactive: [400, "BranchInactive"], ProductArchived: [400, "ProductArchived"],
  InvalidQuantity: [400, "InvalidQuantity"], InvalidInput: [400, "InvalidInput"], InsufficientAvailableStock: [400, "InsufficientAvailableStock"],
  InventoryConflict: [409, "InventoryConflict"], IdempotencyConflict: [409, "IdempotencyConflict"],
  InventoryServiceUnavailable: [503, "InventoryServiceUnavailable"],
};

export class TransferApiClient implements TransferPort {
  constructor(private readonly fetchPort: FetchPort = fetch) {}
  async transfer(command: TransferCommand, signal?: AbortSignal): Promise<TransferResult<TransferMutationView>> {
    const fetchPort = this.fetchPort;
    const body: TransferCommand = {
      operationId: command.operationId, sourceBranchId: command.sourceBranchId, destinationBranchId: command.destinationBranchId,
      productId: command.productId, quantity: command.quantity, ...(command.reasonCode !== undefined ? { reasonCode: command.reasonCode } : {}),
    };
    let response: Response;
    try {
      response = await fetchPort("/api/inventory/transfers", {
        method: "POST", credentials: "same-origin", cache: "no-store", signal,
        headers: { accept: "application/json", "content-type": "application/json" }, body: JSON.stringify(body),
      });
    } catch { return { ok: false, kind: "NetworkFailure" }; }
    let envelope: JsonObject, type: unknown;
    try { envelope = object(await response.json()); type = own(envelope, "type"); if (typeof type !== "string") invalid(); }
    catch { return { ok: false, kind: "MalformedResponse" }; }
    if (!response.ok) {
      const mapped = typeof type === "string" && Object.prototype.hasOwnProperty.call(errors, type) ? errors[type] : undefined;
      return { ok: false, kind: mapped?.[0] === response.status ? mapped[1] : "UnexpectedResponse" };
    }
    if (response.status !== 200 || type !== "Success") return { ok: false, kind: "UnexpectedResponse" };
    try { return { ok: true, value: reconstructTransferMutation(own(envelope, "value"), command) }; }
    catch { return { ok: false, kind: "MalformedResponse" }; }
  }
}
