import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { WorkspaceBootstrapUseCase } from "../../domains/identity/application/workspace-bootstrap.use-case";
import type { EmergencyOwnerPasswordResetUseCase } from "../../domains/identity/application/password-reset.use-cases";
import { parseIdentityCliArguments } from "./cli-arguments";
import type { IdentityCliPrompt } from "./cli-prompt";
import { runOwnerResetPasswordCli } from "./owner-reset-password";
import { runWorkspaceBootstrapCli } from "./workspace-bootstrap";

class FakePrompt implements IdentityCliPrompt {
  hiddenCalls = 0;
  constructor(private readonly hiddenValue: string) {}
  async text(): Promise<string> { throw new Error("UnexpectedTextPrompt"); }
  async hidden(): Promise<string> { this.hiddenCalls += 1; return this.hiddenValue; }
}

describe("Identity CLI adapters", () => {
  it("parses non-secret arguments and rejects password arguments", () => {
    assert.equal(parseIdentityCliArguments(["--workspace-code", "store-01"]).get("workspace-code"), "store-01");
    assert.equal(parseIdentityCliArguments(["--owner-username=owner"]).get("owner-username"), "owner");
    assert.throws(() => parseIdentityCliArguments(["--password", "plaintext"]), /PasswordArgumentForbidden/);
  });

  it("maps Workspace bootstrap input while keeping the password in the hidden prompt", async () => {
    const prompt = new FakePrompt("Temporary hidden 123");
    const writes: string[] = [];
    let receivedValue = "";
    const useCase = {
      execute: async (command: { temporaryPassword: string }) => {
        receivedValue = command.temporaryPassword;
        return { ok: true, value: { workspaceCode: "store-01", actorId: "actor-1" } } as const;
      },
    } as unknown as WorkspaceBootstrapUseCase;
    const exitCode = await runWorkspaceBootstrapCli({ useCase, prompt, write: (message) => writes.push(message) }, [
      "--company-id", "company-a",
      "--workspace-code", "store-01",
      "--workspace-name", "Store One",
      "--owner-username", "owner",
      "--owner-name", "Owner",
      "--owner-phone", "+967711234567",
    ]);
    assert.equal(exitCode, 0);
    assert.equal(prompt.hiddenCalls, 1);
    assert.equal(receivedValue, "Temporary hidden 123");
    assert.equal(writes.join(" ").includes(receivedValue), false);
  });

  it("maps emergency reset without accepting a shell password", async () => {
    const prompt = new FakePrompt("Emergency hidden 123");
    const writes: string[] = [];
    const useCase = {
      execute: async () => ({ ok: true, value: { actorId: "owner-1" } } as const),
    } as unknown as EmergencyOwnerPasswordResetUseCase;
    assert.equal(await runOwnerResetPasswordCli({ useCase, prompt, write: (message) => writes.push(message) }, [
      "--workspace-code", "store-01",
      "--owner-username", "owner",
    ]), 0);
    assert.equal(prompt.hiddenCalls, 1);
    assert.equal(writes.join(" ").includes("Emergency hidden 123"), false);
    assert.equal(await runOwnerResetPasswordCli({ useCase, prompt, write: () => undefined }, ["--new-password", "plaintext"]), 1);
  });
});
