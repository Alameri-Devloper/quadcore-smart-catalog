import assert from "node:assert/strict";
import { it } from "node:test";
import { publicShareManagementAdmissionPolicyFromEnvironment as read } from "./environment-public-share-management-admission";
import { publicShareManagementAdmissionPolicyFixture as fixture } from "../mock/public-share-management-admission.fixture";
it("reads exactly the approved immutable policy", () => {
  const p = read({ QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON: JSON.stringify(fixture()) });
  assert.deepEqual(p.budgets, fixture().budgets); assert.equal(p.windowSeconds, 60);
  assert.ok(Object.isFrozen(p)); assert.ok(Object.isFrozen(p.budgets)); assert.ok(Object.isFrozen(p.budgets.Revoke));
});
for (const source of [undefined, "", "null", "[]", "{}", "{", "x".repeat(4097)]) it("rejects missing/malformed policy " + String(source?.length), () => {
  assert.throws(() => read({ QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON: source }), /^Error: PublicShareManagementAdmissionConfigurationUnavailable$/);
});
for (const key of ["version", "backend", "windowSeconds", "cleanupGraceSeconds", "lockTimeoutMs", "statementTimeoutMs", "extra"] as const) it("rejects unapproved policy field " + key, () => {
  const p = { ...fixture(), [key]: "SYNTHETIC_PRIVATE_VALUE" };
  assert.throws(() => read({ QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON: JSON.stringify(p) }), /ConfigurationUnavailable/);
});
for (const operation of ["Issue", "Copy", "Replace", "Revoke"] as const) for (const scope of ["user", "workspace"] as const) it("rejects changed " + operation + " " + scope, () => {
  const p=fixture(); p.budgets[operation][scope]++;
  assert.throws(() => read({ QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON: JSON.stringify(p) }), /ConfigurationUnavailable/);
});
