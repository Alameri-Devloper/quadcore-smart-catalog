import { taskReviewVerificationCommands } from "./task-review.config";
import { TaskReviewError } from "./task-review.errors";
import type { TaskReviewVerificationResult } from "./task-review.types";
import { runVerificationCommand, skippedVerification, type VerificationExecution } from "./run-verification-command";

export async function collectVerificationEvidence(
  repositoryRoot: string,
  skippedKeys: readonly string[],
): Promise<{ readonly executions: readonly VerificationExecution[]; readonly results: readonly TaskReviewVerificationResult[] }> {
  validateSkippedVerificationCommands(skippedKeys);
  if (!skippedKeys.includes("integration-tests") && !process.env.TEST_DATABASE_URL) {
    throw new TaskReviewError("TEST_DATABASE_URL is required for integration verification.", "VerificationFailed");
  }
  const executions: VerificationExecution[] = [];
  for (const command of taskReviewVerificationCommands) {
    executions.push(
      skippedKeys.includes(command.key)
        ? skippedVerification(command, "Skipped by explicit optional-command request.")
        : await runVerificationCommand(command, repositoryRoot),
    );
  }
  return { executions, results: executions.map(({ result }) => result) };
}

export function validateSkippedVerificationCommands(skippedKeys: readonly string[]): void {
  const knownKeys = new Set(taskReviewVerificationCommands.map(({ key }) => key));
  for (const key of skippedKeys) {
    if (!knownKeys.has(key)) throw new TaskReviewError(`Unknown verification command key: ${key}`, "InvalidArguments");
    const command = taskReviewVerificationCommands.find((candidate) => candidate.key === key)!;
    if (command.required) throw new TaskReviewError(`Required verification command cannot be skipped: ${key}`, "InvalidArguments");
  }
}
