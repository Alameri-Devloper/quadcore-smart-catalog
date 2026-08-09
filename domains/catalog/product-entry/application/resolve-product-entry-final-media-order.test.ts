import assert from "node:assert/strict";
import test from "node:test";
import { resolveProductEntryFinalMediaOrder } from "./resolve-product-entry-final-media-order";

const resolve = (
  currentOrderedMediaIds: readonly string[],
  finalMediaIds: readonly string[],
  requested: readonly (readonly [string, number])[],
  newMediaIdsInPlanOrder: readonly string[] = [],
) => resolveProductEntryFinalMediaOrder({
  currentOrderedMediaIds,
  finalMediaIds,
  newMediaIdsInPlanOrder,
  requestedPositions: new Map(requested),
});

test("resolves complete final order while preserving stable unchanged Media", () => {
  const scenarios = [
    { current: ["A", "B", "C"], final: ["A", "B", "C"], requested: [["C", 1], ["B", 2]], expected: ["A", "C", "B"] },
    { current: ["A", "B", "C"], final: ["A", "B", "C"], requested: [["C", 0]], expected: ["C", "A", "B"] },
    { current: ["A", "B", "C"], final: ["A", "C"], requested: [], expected: ["A", "C"] },
    { current: ["A", "B", "C"], final: ["A", "C"], requested: [["C", 0]], expected: ["C", "A"] },
    { current: ["A", "B"], final: ["A", "B", "X"], requested: [["X", 2]], added: ["X"], expected: ["A", "B", "X"] },
    { current: ["A", "B"], final: ["A", "B", "X"], requested: [["X", 1]], added: ["X"], expected: ["A", "X", "B"] },
    { current: ["A", "B", "C"], final: ["A", "B", "C", "X"], requested: [["X", 1], ["C", 0]], added: ["X"], expected: ["C", "X", "A", "B"] },
    { current: ["A", "B", "C", "D"], final: ["A", "B", "C", "D"], requested: [["D", 0], ["B", 3]], expected: ["D", "A", "C", "B"] },
  ] as const;
  for (const scenario of scenarios) {
    assert.deepEqual(
      resolve(scenario.current, scenario.final, scenario.requested, "added" in scenario ? scenario.added : []),
      { type: "Resolved", orderedMediaIds: scenario.expected },
    );
  }
});

test("rejects duplicate, unknown, conflicting, out-of-range, and mismatched plans", () => {
  assert.deepEqual(resolve(["A", "A"], ["A"], []), { type: "Invalid", code: "DuplicateMediaId" });
  assert.deepEqual(resolve(["A"], ["A"], [["X", 0]]), { type: "Invalid", code: "UnknownMediaId" });
  assert.deepEqual(resolve(["A", "B"], ["A", "B"], [["A", 0], ["B", 0]]), { type: "Invalid", code: "DuplicateRequestedPosition" });
  assert.deepEqual(resolve(["A"], ["A"], [["A", -1]]), { type: "Invalid", code: "RequestedPositionOutOfRange" });
  assert.deepEqual(resolve(["A"], ["A"], [["A", 1]]), { type: "Invalid", code: "RequestedPositionOutOfRange" });
  assert.deepEqual(resolve(["A"], ["A", "X"], []), { type: "Invalid", code: "FinalMediaSetMismatch" });
});

test("is immutable, deterministic, and does not mutate input collections", () => {
  const current = ["A", "B", "C"];
  const final = ["A", "B", "C", "X"];
  const added = ["X"];
  const positions = new Map<string, number>([["X", 1], ["C", 0]]);
  const snapshot = { current: [...current], final: [...final], added: [...added], positions: [...positions] };
  const first = resolveProductEntryFinalMediaOrder({ currentOrderedMediaIds: current, finalMediaIds: final, newMediaIdsInPlanOrder: added, requestedPositions: positions });
  const second = resolveProductEntryFinalMediaOrder({ currentOrderedMediaIds: current, finalMediaIds: final, newMediaIdsInPlanOrder: added, requestedPositions: positions });
  assert.deepEqual(first, second);
  assert.deepEqual({ current, final, added, positions: [...positions] }, snapshot);
  assert.equal(first.type === "Resolved" && Object.isFrozen(first.orderedMediaIds), true);
});
