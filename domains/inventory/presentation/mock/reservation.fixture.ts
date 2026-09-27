import type { ReservationManagementView, ReservationMutationView, ReservationPageView, ReservationStatus } from "../reservation.types";

export const reservationFixture = (overrides: Partial<ReservationManagementView> = {}): ReservationManagementView => ({
  reservationId: "reservation-one", branchId: "branch-main", productId: "product-one", status: "Active", quantity: "5", remainingQuantity: "5",
  createdAt: "2026-09-26T10:00:00.000Z", updatedAt: "2026-09-26T10:00:00.000Z", allowedActions: ["Release", "Fulfill"], ...overrides,
});
export const reservationPageFixture = (overrides: Partial<ReservationPageView> = {}): ReservationPageView => ({
  items: [reservationFixture()], nextCursor: "cursor_next", ...overrides,
});
export const reservationMutationFixture = (overrides: Partial<ReservationMutationView> = {}): ReservationMutationView => ({
  operationId: "operation-0001", status: "Succeeded", reservationId: "reservation-one", reservationStatus: "Active", remainingQuantity: "5", ...overrides,
});
export const reservationStatusFixture = (status: ReservationStatus) => reservationFixture({ status,
  allowedActions: status === "Active" || status === "PartiallyFulfilled" ? ["Release", "Fulfill"] : [] });
