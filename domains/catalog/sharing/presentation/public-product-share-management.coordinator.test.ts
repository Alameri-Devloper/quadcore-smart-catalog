import assert from "node:assert/strict";
import { it } from "node:test";
import { managementLink, deferredManagementResult } from "../mock/public-share-management.fixture";
import { emptyPublicShareManagementState, PublicShareManagementCoordinator } from "./public-product-share-management.coordinator";
import type { PublicShareManagementClientPort } from "./public-product-share-management.types";
const context = { productId: "p", branchId: "b", canRetrieve: true, canRevoke: true };
const fixture = (execute: PublicShareManagementClientPort["execute"]) => {
  let copies = 0; const states: unknown[] = [];
  const coordinator = new PublicShareManagementCoordinator({ execute }, { writeText: async () => { copies++; } }, context, (state) => states.push(state));
  return { coordinator, states, copies: () => copies };
};
it("construction/cancellation/context disposal never retrieve a URL", () => {
  let calls = 0; const f = fixture(async () => { calls++; return managementLink(); });
  f.coordinator.cancel(); f.coordinator.clear(); f.coordinator.dispose(); assert.equal(calls, 0); assert.equal(f.copies(), 0);
});
it("explicit Copy retrieves once and clipboard failure preserves manual fallback only", async () => {
  const operations: string[] = [];
  const coordinator = new PublicShareManagementCoordinator({ execute: async (operation) => { operations.push(operation); return managementLink(); } }, { writeText: async () => { throw new Error("Denied"); } }, context, () => undefined);
  await coordinator.run("copy"); assert.deepEqual(operations, ["copy"]); assert.equal(coordinator.getState().message, "ClipboardDenied"); assert.ok(coordinator.getState().url);
  coordinator.clear(); assert.deepEqual(coordinator.getState(), emptyPublicShareManagementState);
});
for (const lifecycle of ["clear", "dispose"] as const) it("ignores late network result after " + lifecycle, async () => {
  const pending = deferredManagementResult(), f = fixture(async () => pending.promise);
  const work = f.coordinator.run("copy"); f.coordinator[lifecycle](); pending.resolve(managementLink()); await work;
  assert.deepEqual(f.coordinator.getState(), emptyPublicShareManagementState); assert.equal(f.copies(), 0);
});
it("deduplicates in-flight interactions and ignores old-context response over a newer result", async () => {
  const first = deferredManagementResult(); let calls = 0;
  const f = fixture(async () => ++calls === 1 ? first.promise : managementLink("Created"));
  const old = f.coordinator.run("copy"); await f.coordinator.run("issue"); assert.equal(calls, 1);
  f.coordinator.clear(); await f.coordinator.run("issue"); first.resolve(managementLink()); await old;
  assert.equal(f.coordinator.getState().message, "Created"); assert.equal(f.copies(), 0);
});
it("requires explicit confirmation, echoes expected current identity and never replays ambiguous Replace", async () => {
  const operations: string[] = [];
  const f = fixture(async (operation, input) => {
    operations.push(operation); if (operation === "replace") { assert.equal(input.grantId, "synthetic-grant"); throw new Error("Network response lost"); }
    return managementLink();
  });
  await f.coordinator.run("replace", "forged"); assert.deepEqual(operations, []);
  await f.coordinator.run("copy"); f.coordinator.confirm("replace"); assert.equal(f.coordinator.getState().url, undefined);
  await f.coordinator.accept(); await f.coordinator.accept(); assert.deepEqual(operations, ["copy", "replace"]);
  assert.equal(f.coordinator.getState().message, "ServiceUnavailable"); assert.equal(f.coordinator.getState().url, undefined);
});
it("permission denial clears previously retrieved URL and Copy does not fall back to Issue", async () => {
  let calls = 0; const f = fixture(async () => ++calls === 1 ? managementLink() : { ok: false, error: "PermissionDenied" });
  await f.coordinator.run("copy"); assert.ok(f.coordinator.getState().url); await f.coordinator.run("copy");
  assert.equal(f.coordinator.getState().url, undefined); assert.equal(calls, 2);
});
it("known-grant Revoke works without retrieval permission or product/branch and clears URL state", async () => {
  const operations: string[] = [];
  const coordinator = new PublicShareManagementCoordinator({ execute: async (operation, input) => { operations.push(operation); assert.equal(input.grantId, "known"); return { ok: true, type: "Revoked", grantId: "known" }; } },
    { writeText: async () => { throw new Error("NoClipboardExpected"); } }, { productId: "", canRetrieve: false, canRevoke: true }, () => undefined);
  await coordinator.run("copy"); coordinator.confirm("revoke", "known"); await coordinator.accept();
  assert.deepEqual(operations, ["revoke"]); assert.deepEqual(coordinator.getState(), { busy: false, message: "Revoked" });
});
it("a disposed old instance cannot publish after clipboard resolution", async () => {
  let resolve!: () => void; const clipboard = new Promise<void>((done) => { resolve = done; }); const states: unknown[] = [];
  const coordinator = new PublicShareManagementCoordinator({ execute: async () => managementLink() }, { writeText: () => clipboard }, context, (state) => states.push(state));
  const work = coordinator.run("copy"); await Promise.resolve(); coordinator.dispose(); const count = states.length; resolve(); await work;
  assert.equal(states.length, count); assert.deepEqual(coordinator.getState(), emptyPublicShareManagementState);
});
