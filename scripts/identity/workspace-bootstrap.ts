import { pathToFileURL } from "node:url";
import type { WorkspaceBootstrapUseCase } from "../../domains/identity/application/workspace-bootstrap.use-case";
import { createIdentityCliRuntime } from "../../domains/identity/infrastructure/identity-cli-runtime";
import { parseIdentityCliArguments } from "./cli-arguments";
import { NodeIdentityCliPrompt, type IdentityCliPrompt } from "./cli-prompt";

export interface WorkspaceBootstrapCliDependencies {
  readonly useCase: WorkspaceBootstrapUseCase;
  readonly prompt: IdentityCliPrompt;
  readonly write: (message: string) => void;
}

const requiredValue = async (argumentsMap: ReadonlyMap<string, string>, key: string, label: string, prompt: IdentityCliPrompt) =>
  argumentsMap.get(key) ?? prompt.text(label);

export const runWorkspaceBootstrapCli = async (
  dependencies: WorkspaceBootstrapCliDependencies,
  argv: readonly string[],
): Promise<number> => {
  try {
    const values = parseIdentityCliArguments(argv);
    const result = await dependencies.useCase.execute({
      companyId: await requiredValue(values, "company-id", "Company ID", dependencies.prompt),
      workspaceCode: await requiredValue(values, "workspace-code", "Workspace login code", dependencies.prompt),
      workspaceDisplayName: await requiredValue(values, "workspace-name", "Workspace display name", dependencies.prompt),
      ownerUsername: await requiredValue(values, "owner-username", "Owner username", dependencies.prompt),
      ownerDisplayName: await requiredValue(values, "owner-name", "Owner display name", dependencies.prompt),
      ownerRecoveryPhone: await requiredValue(values, "owner-phone", "Owner recovery phone (E.164)", dependencies.prompt),
      defaultWhatsAppPhone: values.get("default-phone"),
      temporaryPassword: await dependencies.prompt.hidden("Temporary password"),
    });
    if (!result.ok) {
      dependencies.write(`Workspace bootstrap failed: ${result.error}`);
      return 1;
    }
    dependencies.write(`Workspace bootstrap completed for ${result.value.workspaceCode}; owner actorId ${result.value.actorId}.`);
    return 0;
  } catch (error) {
    const code = error instanceof Error ? error.message : "CliFailure";
    dependencies.write(`Workspace bootstrap failed: ${code}`);
    return 1;
  }
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  void (async () => {
    const runtime = createIdentityCliRuntime();
    try {
      process.exitCode = await runWorkspaceBootstrapCli({
        useCase: runtime.workspaceBootstrap,
        prompt: new NodeIdentityCliPrompt(),
        write: (message) => process.stdout.write(`${message}\n`),
      }, process.argv.slice(2));
    } finally {
      await runtime.close();
    }
  })();
}
