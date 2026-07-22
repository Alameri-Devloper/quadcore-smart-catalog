import { spawn } from "node:child_process";
import { calculateSha256 } from "./calculate-sha256";
import type { TaskReviewCommandConfig, TaskReviewVerificationResult } from "./task-review.types";

export interface VerificationExecution {
  readonly result: TaskReviewVerificationResult;
  readonly stdout: string;
  readonly stderr: string;
  readonly combined: string;
}

function platformCommand(command: string): string {
  return process.platform === "win32" ? command : command.replace(/\.cmd$/, "");
}

function spawnSpecification(command: TaskReviewCommandConfig): { executable: string; args: readonly string[] } {
  if (process.platform === "win32" && command.command.endsWith(".cmd")) {
    // Node cannot execute Windows batch launchers directly without a command interpreter.
    // The executable and arguments still come exclusively from trusted TypeScript configuration.
    return {
      executable: process.env.ComSpec || "cmd.exe",
      args: ["/d", "/s", "/c", command.command, ...command.args],
    };
  }
  return { executable: platformCommand(command.command), args: command.args };
}

export function skippedVerification(command: TaskReviewCommandConfig, reason: string): VerificationExecution {
  const now = new Date().toISOString();
  return {
    stdout: "",
    stderr: "",
    combined: "",
    result: {
      key: command.key,
      command: platformCommand(command.command),
      args: command.args,
      required: command.required,
      skipped: true,
      skipReason: reason,
      startedAt: now,
      endedAt: now,
      durationMs: 0,
      exitCode: null,
      signal: null,
      termination: "Exited",
      rawOutputHashes: {
        stdoutSha256: calculateSha256(""),
        stderrSha256: calculateSha256(""),
        combinedSha256: calculateSha256(""),
      },
      bundledEvidence: { path: null, sanitizedSha256: calculateSha256(""), redactionCount: 0 },
    },
  };
}

export async function runVerificationCommand(
  command: TaskReviewCommandConfig,
  repositoryRoot: string,
): Promise<VerificationExecution> {
  const startedAt = new Date();
  const started = performance.now();
  let stdout = "";
  let stderr = "";
  let combined = "";
  return await new Promise((resolve) => {
    const specification = spawnSpecification(command);
    const child = spawn(specification.executable, specification.args, {
      cwd: repositoryRoot,
      env: process.env,
      shell: false,
      windowsHide: true,
      detached: process.platform !== "win32",
    });
    const append = (channel: "stdout" | "stderr", data: Buffer) => {
      const text = data.toString("utf8");
      if (channel === "stdout") stdout += text;
      else stderr += text;
      combined += text;
    };
    child.stdout?.on("data", (data: Buffer) => append("stdout", data));
    child.stderr?.on("data", (data: Buffer) => append("stderr", data));
    let timedOut = false;
    let settled = false;
    let spawnFailed = false;
    const finish = (exitCode: number | null, signal: NodeJS.Signals | null) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      const endedAt = new Date();
      const termination = spawnFailed ? "SpawnFailed" : timedOut ? "TimedOut" : signal ? "Signaled" : "Exited";
      resolve({
        stdout,
        stderr,
        combined,
        result: {
          key: command.key,
          command: platformCommand(command.command),
          args: command.args,
          required: command.required,
          skipped: false,
          skipReason: null,
          startedAt: startedAt.toISOString(),
          endedAt: endedAt.toISOString(),
          durationMs: Math.round(performance.now() - started),
          exitCode,
          signal,
          termination,
          rawOutputHashes: {
            stdoutSha256: calculateSha256(stdout),
            stderrSha256: calculateSha256(stderr),
            combinedSha256: calculateSha256(combined),
          },
          bundledEvidence: { path: `verification/${command.key}.txt`, sanitizedSha256: "", redactionCount: 0 },
        },
      });
    };
    const timer = setTimeout(() => {
      timedOut = true;
      append("stderr", Buffer.from("Task review command timed out.\n"));
      if (process.platform === "win32" && child.pid) {
        spawn("taskkill", ["/pid", String(child.pid), "/t", "/f"], { windowsHide: true, shell: false });
        child.kill("SIGTERM");
      } else if (child.pid) {
        try { process.kill(-child.pid, "SIGTERM"); } catch { child.kill("SIGTERM"); }
      } else child.kill("SIGTERM");
    }, command.timeoutMs);
    child.on("error", (error) => {
      spawnFailed = true;
      append("stderr", Buffer.from(`${error.name}: executable unavailable\n`));
      finish(null, null);
    });
    child.on("close", (exitCode, signal) => {
      finish(exitCode, signal);
    });
  });
}
