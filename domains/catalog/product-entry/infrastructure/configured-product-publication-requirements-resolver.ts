import type { ProductPublicationRequirementsResolver } from "../../services/product-publication-requirements-resolver.port";
import { ProductPublicationRequirements, type ProductPublicationRequirementsInput } from "../../types/product-publication-requirements.value-object";

export interface ProductPublicationRequirementsConfiguration {
  readonly workspaceId: string;
  readonly catalogId: string;
  readonly requirements: ProductPublicationRequirementsInput;
}

export class ConfiguredProductPublicationRequirementsResolver implements ProductPublicationRequirementsResolver {
  private readonly configurations: ReadonlyMap<string, ProductPublicationRequirements>;

  constructor(configurations: readonly ProductPublicationRequirementsConfiguration[]) {
    const resolved = new Map<string, ProductPublicationRequirements>();
    for (const configuration of configurations) {
      if (typeof configuration.workspaceId !== "string" || configuration.workspaceId.trim().length === 0 ||
        typeof configuration.catalogId !== "string" || configuration.catalogId.trim().length === 0) {
        throw new Error("Product publication requirements configuration scope is invalid.");
      }
      const key = `${configuration.workspaceId}\u0000${configuration.catalogId}`;
      if (resolved.has(key)) throw new Error("Duplicate Product publication requirements configuration scope.");
      resolved.set(key, ProductPublicationRequirements.create(configuration.requirements));
    }
    this.configurations = resolved;
  }

  async resolve(input: Parameters<ProductPublicationRequirementsResolver["resolve"]>[0]): Promise<ProductPublicationRequirements> {
    const configured = this.configurations.get(`${input.workspaceId.value}\u0000${input.catalogId.value}`);
    if (!configured) throw new Error("Product publication requirements are not configured for the trusted Workspace Catalog scope.");
    return configured;
  }
}

export const productPublicationRequirementsFromEnvironment = (
  value = process.env.QSC_PRODUCT_PUBLICATION_REQUIREMENTS_JSON,
): ConfiguredProductPublicationRequirementsResolver => {
  if (!value) throw new Error("QSC_PRODUCT_PUBLICATION_REQUIREMENTS_JSON is required.");
  let parsed: unknown;
  try {
    parsed = JSON.parse(value);
  } catch {
    throw new Error("QSC_PRODUCT_PUBLICATION_REQUIREMENTS_JSON is invalid.");
  }
  if (!Array.isArray(parsed)) throw new Error("QSC_PRODUCT_PUBLICATION_REQUIREMENTS_JSON is invalid.");
  return new ConfiguredProductPublicationRequirementsResolver(parsed as ProductPublicationRequirementsConfiguration[]);
};
