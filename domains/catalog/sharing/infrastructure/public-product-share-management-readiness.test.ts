import assert from "node:assert/strict";
import { it } from "node:test";
import { publicShareMemoryFixture } from "../mock/public-share-lifecycle.fixture";
import { publicShareManagementReadiness } from "./public-product-share-management-readiness";
import type { createPublicProductShareLifecycleRuntime } from "./public-product-share-lifecycle-runtime";
import type { PublicShareKeyVersionInspectionResult } from "../ports/public-share-key-version-inspector.port";
const f = publicShareMemoryFixture();
const inspection: PublicShareKeyVersionInspectionResult = { type: "Inspected", evidence: { lookupVersions: [1], encryptionVersions: [2], inspectedAt: new Date(), source: "PostgreSqlPublicProductShareGrants", scope: "ServiceWide", consistency: "StatementSnapshot" } };
const evidence = () => ({ configurationReadiness: f.runtime.readiness, inspection, coverageEvaluation: f.runtime.evaluateCoverage({ lookupVersions: [1], encryptionVersions: [2] }) });
type Runtime = ReturnType<typeof createPublicProductShareLifecycleRuntime>;
it("composes real configured keys with complete inspection without certifying durable coverage", async () => {
  const result = evidence(); assert.equal(result.coverageEvaluation.durableCoverage, "UNCHECKED");
  assert.equal(await publicShareManagementReadiness({ lifecycle: f.lifecycle, inspectCoverage: async () => result }).check(), "Ready");
});
for (const type of ["Unavailable", "IntegrityFailure"] as const) it("does not turn failed inspection into empty success: " + type, async () => {
  const runtime: Runtime = { lifecycle: f.lifecycle, inspectCoverage: async () => ({ ...evidence(), inspection: { type }, coverageEvaluation: null }) };
  assert.equal(await publicShareManagementReadiness(runtime).check(), type === "Unavailable" ? "ServiceUnavailable" : "IntegrityFailure");
});
it("requires lookup/encryption coverage, origin and configuration; handles service exceptions", async () => {
  const missing = { ...evidence(), coverageEvaluation: f.runtime.evaluateCoverage({ lookupVersions: [9], encryptionVersions: [2] }) };
  assert.equal(await publicShareManagementReadiness({ lifecycle: f.lifecycle, inspectCoverage: async () => missing }).check(), "KeyUnavailable");
  for (const capability of ["lookup", "encryption", "urlConstruction"] as const) {
    const result = { ...evidence(), configurationReadiness: { ...f.runtime.readiness, [capability]: "UNAVAILABLE" as const } };
    assert.equal(await publicShareManagementReadiness({ lifecycle: f.lifecycle, inspectCoverage: async () => result }).check(), capability === "urlConstruction" ? "ServiceUnavailable" : "KeyUnavailable");
  }
  assert.equal(await publicShareManagementReadiness({ lifecycle: f.lifecycle, inspectCoverage: async () => { throw new Error("PRIVATE"); } }).check(), "ServiceUnavailable");
});
