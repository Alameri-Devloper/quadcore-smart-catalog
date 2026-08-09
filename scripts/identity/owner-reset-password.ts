import { pathToFileURL } from "node:url";
import type { EmergencyOwnerPasswordResetUseCase } from "../../domains/identity/application/password-reset.use-cases";
import { createIdentityCliRuntime } from "../../domains/identity/infrastructure/identity-cli-runtime";
import { parseIdentityCliArguments } from "./cli-arguments";
import { NodeIdentityCliPrompt, type IdentityCliPrompt } from "./cli-prompt";

export interface OwnerResetPasswordCliDependencies {
  readonly useCase: EmergencyOwnerPasswordResetUseCase;
  readonly prompt: IdentityCliPrompt;
  readonly write: (message: string) => void;
}

export const runOwnerResetPasswordCli = async (
  dependencies: OwnerResetPasswordCliDependencies,
  argv: readonly string[],
): Promise<number> => {
  try {
    const values = parseIdentityCliArguments(argv);
    const workspaceCode = values.get("workspace-code") ?? await dependencies.prompt.text("Workspace login code");
    const ownerUsername = values.get("owner-username") ?? await dependencies.prompt.text("Owner username");
    const result = await dependencies.useCase.execute({
      workspaceCode,
      ownerUsername,
      newTemporaryPassword: await dependencies.prompt.hidden("New temporary password"),
    });
    if (!result.ok) {
      dependencies.write(`Emergency Owner password reset failed: ${result.error}`);
      return 1;
    }
    dependencies.write(`Emergency Owner password reset completed for actorId ${result.value.actorId}.`);
    return 0;
  } catch (error) {
    const code = error instanceof Error ? error.message : "CliFailure";
    dependencies.write(`Emergency Owner password reset failed: ${code}`);
    return 1;
  }
};

const isMain = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;
if (isMain) {
  void (async () => {
    const runtime = createIdentityCliRuntime();
    try {
      process.exitCode = await runOwnerResetPasswordCli({
        useCase: runtime.emergencyOwnerPasswordReset,
        prompt: new NodeIdentityCliPrompt(),
        write: (message) => process.stdout.write(`${message}\n`),
      }, process.argv.slice(2));
    } finally {
      await runtime.close();
    }
  })();
}
