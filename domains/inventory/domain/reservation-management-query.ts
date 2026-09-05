import { createHash } from "node:crypto";

export const ACTIONABLE_RESERVATION_STATUSES = Object.freeze(["Active", "PartiallyFulfilled"] as const);
export const RESERVATION_PAGE_SIZE_DEFAULT = 24;
export const RESERVATION_PAGE_SIZE_MAX = 60;

export interface ReservationCursorPosition {
  readonly updatedAt: Date;
  readonly reservationId: string;
}

interface ReservationCursorPayload {
  readonly version: 1;
  readonly fingerprint: string;
  readonly updatedAt: string;
  readonly reservationId: string;
}

export const validateInventoryIdentifier = (value: string): string => {
  if (value !== value.trim() || value.length < 1 || value.length > 160 || /[\u0000-\u001f\u007f]/u.test(value)) throw new Error("InvalidIdentifier");
  return value;
};

export const reservationQueryFingerprint = (branchId: string, productId: string): string => createHash("sha256").update(JSON.stringify({
  version: 1,
  purpose: "ActionableReservations",
  branchId,
  productId,
  statuses: ACTIONABLE_RESERVATION_STATUSES,
  order: "UpdatedAtDescReservationIdDesc",
})).digest("hex");

const canonicalTimestamp = (value: string): Date => {
  if (!/^(?:[0-9]{4}|[+-][0-9]{6})-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}\.[0-9]{3}Z$/u.test(value)) throw new Error("InvalidCursor");
  const timestamp = new Date(value);
  if (!Number.isFinite(timestamp.getTime()) || timestamp.toISOString() !== value) throw new Error("InvalidCursor");
  return timestamp;
};

export const encodeReservationCursor = (fingerprint: string, position: ReservationCursorPosition): string => {
  const reservationId = validateInventoryIdentifier(position.reservationId);
  const updatedAt = position.updatedAt.toISOString();
  const payload: ReservationCursorPayload = { version: 1, fingerprint, updatedAt, reservationId };
  return Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
};

export const decodeReservationCursor = (value: string, expectedFingerprint: string): ReservationCursorPosition => {
  try {
    if (!/^[A-Za-z0-9_-]{1,2048}$/u.test(value)) throw new Error("InvalidCursor");
    const decoded = JSON.parse(Buffer.from(value, "base64url").toString("utf8")) as Partial<ReservationCursorPayload>;
    if (!decoded || typeof decoded !== "object" || Array.isArray(decoded)) throw new Error("InvalidCursor");
    if (Buffer.from(JSON.stringify(decoded), "utf8").toString("base64url") !== value) throw new Error("InvalidCursor");
    if (Object.keys(decoded).sort().join(",") !== "fingerprint,reservationId,updatedAt,version") throw new Error("InvalidCursor");
    if (decoded.version !== 1 || decoded.fingerprint !== expectedFingerprint || typeof decoded.updatedAt !== "string" || typeof decoded.reservationId !== "string") throw new Error("InvalidCursor");
    return Object.freeze({ updatedAt: canonicalTimestamp(decoded.updatedAt), reservationId: validateInventoryIdentifier(decoded.reservationId) });
  } catch {
    throw new Error("InvalidCursor");
  }
};
