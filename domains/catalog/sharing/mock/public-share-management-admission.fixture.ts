import type { PublicShareManagementAdmissionInput, PublicShareManagementAdmissionResult } from "../ports/public-share-management-admission.port";
/** Explicit unit-test double; production always uses PostgreSQL. */
export const publicShareManagementAdmissionFixture = (result: PublicShareManagementAdmissionResult = { type: "Allowed" }) => {
  const calls: PublicShareManagementAdmissionInput[] = [];
  return { calls, admit: async (input: PublicShareManagementAdmissionInput) => { calls.push(input); return result; } };
};
export const publicShareManagementAdmissionPolicyFixture = () => ({
  version: 1, backend: "PostgreSQL", windowSeconds: 60, cleanupGraceSeconds: 900, lockTimeoutMs: 250, statementTimeoutMs: 1000,
  budgets: { Issue: { user: 20, workspace: 120 }, Copy: { user: 60, workspace: 600 }, Replace: { user: 5, workspace: 30 }, Revoke: { user: 60, workspace: 600 } },
});
