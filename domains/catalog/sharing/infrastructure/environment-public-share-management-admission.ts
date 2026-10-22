import type { PublicShareManagementAdmissionPolicy, PublicShareManagementOperation } from "../ports/public-share-management-admission.port";
type Environment = Readonly<{ QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON?: string }>;
const operations: readonly PublicShareManagementOperation[] = ["Issue", "Copy", "Replace", "Revoke"];
const approved = { Issue: [20, 120], Copy: [60, 600], Replace: [5, 30], Revoke: [60, 600] } as const;
const object = (value: unknown, keys: readonly string[]): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || Object.keys(value).sort().join(",") !== [...keys].sort().join(",")) throw new Error();
  return value as Record<string, unknown>;
};
/** Approval binds these values; policy changes require a reviewed coordinated rollout. */
export const publicShareManagementAdmissionPolicyFromEnvironment = (
  environment: Environment = process.env as Environment,
): PublicShareManagementAdmissionPolicy => {
  try {
    const source = environment.QSC_PUBLIC_SHARE_MANAGEMENT_ADMISSION_POLICY_JSON;
    if (!source || source.length > 4096) throw new Error();
    const value = object(JSON.parse(source), ["version", "backend", "windowSeconds", "cleanupGraceSeconds", "lockTimeoutMs", "statementTimeoutMs", "budgets"]);
    if (value.version !== 1 || value.backend !== "PostgreSQL" || value.windowSeconds !== 60
      || value.cleanupGraceSeconds !== 900 || value.lockTimeoutMs !== 250 || value.statementTimeoutMs !== 1000) throw new Error();
    const budgets = object(value.budgets, operations);
    const validated = Object.fromEntries(operations.map((operation) => {
      const budget = object(budgets[operation], ["user", "workspace"]);
      if (budget.user !== approved[operation][0] || budget.workspace !== approved[operation][1]) throw new Error();
      return [operation, Object.freeze({ user: budget.user as number, workspace: budget.workspace as number })];
    })) as PublicShareManagementAdmissionPolicy["budgets"];
    return Object.freeze({ budgets: Object.freeze(validated), windowSeconds: 60, cleanupGraceSeconds: 900,
      lockTimeoutMs: 250, statementTimeoutMs: 1000 });
  } catch { throw new Error("PublicShareManagementAdmissionConfigurationUnavailable"); }
};
