export interface ProductEntryFinalMediaOrderInput {
  readonly currentOrderedMediaIds: readonly string[];
  readonly finalMediaIds: readonly string[];
  readonly newMediaIdsInPlanOrder: readonly string[];
  readonly requestedPositions: ReadonlyMap<string, number>;
}

export type ProductEntryFinalMediaOrderInvalidCode =
  | "DuplicateMediaId"
  | "UnknownMediaId"
  | "DuplicateRequestedPosition"
  | "RequestedPositionOutOfRange"
  | "FinalMediaSetMismatch";

export type ResolveProductEntryFinalMediaOrderResult =
  | { readonly type: "Resolved"; readonly orderedMediaIds: readonly string[] }
  | { readonly type: "Invalid"; readonly code: ProductEntryFinalMediaOrderInvalidCode };

const invalid = (
  code: ProductEntryFinalMediaOrderInvalidCode,
): ResolveProductEntryFinalMediaOrderResult => Object.freeze({ type: "Invalid", code });

const hasDuplicate = (values: readonly string[]): boolean =>
  new Set(values).size !== values.length;

export const resolveProductEntryFinalMediaOrder = (
  input: ProductEntryFinalMediaOrderInput,
): ResolveProductEntryFinalMediaOrderResult => {
  if (
    hasDuplicate(input.currentOrderedMediaIds)
    || hasDuplicate(input.finalMediaIds)
    || hasDuplicate(input.newMediaIdsInPlanOrder)
  ) return invalid("DuplicateMediaId");

  const finalMediaSet = new Set(input.finalMediaIds);
  if (input.newMediaIdsInPlanOrder.some((mediaId) => !finalMediaSet.has(mediaId))) {
    return invalid("UnknownMediaId");
  }

  const requestedSlots = new Set<number>();
  for (const [mediaId, position] of input.requestedPositions) {
    if (!finalMediaSet.has(mediaId)) return invalid("UnknownMediaId");
    if (!Number.isSafeInteger(position) || position < 0 || position >= input.finalMediaIds.length) {
      return invalid("RequestedPositionOutOfRange");
    }
    if (requestedSlots.has(position)) return invalid("DuplicateRequestedPosition");
    requestedSlots.add(position);
  }

  const reconstructableSet = new Set(
    input.currentOrderedMediaIds.filter((mediaId) => finalMediaSet.has(mediaId)),
  );
  input.newMediaIdsInPlanOrder.forEach((mediaId) => reconstructableSet.add(mediaId));
  if (
    reconstructableSet.size !== finalMediaSet.size
    || [...finalMediaSet].some((mediaId) => !reconstructableSet.has(mediaId))
  ) return invalid("FinalMediaSetMismatch");

  const slots: Array<string | undefined> = Array(input.finalMediaIds.length).fill(undefined);
  const placed = new Set<string>();
  for (const [mediaId, position] of input.requestedPositions) {
    slots[position] = mediaId;
    placed.add(mediaId);
  }

  const remaining: string[] = [];
  const includeRemaining = (mediaId: string): void => {
    if (finalMediaSet.has(mediaId) && !placed.has(mediaId)) {
      remaining.push(mediaId);
      placed.add(mediaId);
    }
  };
  input.currentOrderedMediaIds.forEach(includeRemaining);
  input.newMediaIdsInPlanOrder.forEach(includeRemaining);

  let remainingIndex = 0;
  for (let slot = 0; slot < slots.length; slot += 1) {
    if (slots[slot] === undefined) slots[slot] = remaining[remainingIndex++];
  }
  const orderedMediaIds = slots.filter((mediaId): mediaId is string => mediaId !== undefined);
  if (
    orderedMediaIds.length !== input.finalMediaIds.length
    || new Set(orderedMediaIds).size !== finalMediaSet.size
    || orderedMediaIds.some((mediaId) => !finalMediaSet.has(mediaId))
  ) return invalid("FinalMediaSetMismatch");

  return Object.freeze({
    type: "Resolved",
    orderedMediaIds: Object.freeze([...orderedMediaIds]),
  });
};
