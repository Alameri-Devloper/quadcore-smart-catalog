import type { TrustedActorContext } from "../../../shared/auth/trusted-actor-context";
import type { PermissionCode } from "../../identity/domain/permission";

export type ReservationManagementAction = "Release" | "Fulfill";

const reservationPermission = "inventory.reserve" satisfies PermissionCode;
const noActions = Object.freeze([]) as readonly never[];
const reservationActions = Object.freeze(["Release", "Fulfill"] as const);

export const permittedReservationManagementActions = (
  context: TrustedActorContext,
): readonly ReservationManagementAction[] => context.permissions.includes(reservationPermission)
  ? reservationActions
  : noActions;
