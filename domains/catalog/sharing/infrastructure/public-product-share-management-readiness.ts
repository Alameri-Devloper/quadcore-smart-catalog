import type { PublicShareManagementReadinessPort } from "../ports/public-share-management-readiness.port";
import type { createPublicProductShareLifecycleRuntime } from "./public-product-share-lifecycle-runtime";
type Runtime = ReturnType<typeof createPublicProductShareLifecycleRuntime>;
export const publicShareManagementReadiness = (runtime: Runtime): PublicShareManagementReadinessPort => ({
  async check() {
    try {
      const result = await runtime.inspectCoverage(), configuration = result.configurationReadiness;
      if (configuration.urlConstruction !== "READY") return "ServiceUnavailable";
      if (configuration.lookup !== "READY" || configuration.encryption !== "READY") return "KeyUnavailable";
      if (result.inspection.type === "IntegrityFailure") return "IntegrityFailure";
      if (result.inspection.type !== "Inspected" || !result.coverageEvaluation) return "ServiceUnavailable";
      return result.coverageEvaluation.lookup.state === "COVERED" && result.coverageEvaluation.encryption.state === "COVERED" ? "Ready" : "KeyUnavailable";
    } catch { return "ServiceUnavailable"; }
  },
});
