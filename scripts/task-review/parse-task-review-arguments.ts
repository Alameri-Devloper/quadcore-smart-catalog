import { TaskReviewError } from "./task-review.errors";
import type { TaskReviewArguments } from "./task-review.types";

const taskIdPattern = /^[A-Za-z0-9]+(?:[._-][A-Za-z0-9]+)*$/;

export function parseTaskReviewArguments(argv: readonly string[]): TaskReviewArguments {
  const values = new Map<string, string[]>();
  let desktopExport = true;
  for (const argument of argv) {
    if (argument === "--no-desktop-export") {
      desktopExport = false;
      continue;
    }
    const match = /^--([a-z-]+)=(.*)$/.exec(argument);
    if (!match || !["task", "report", "output", "base-ref", "skip-command"].includes(match[1])) {
      throw new TaskReviewError(`Unknown or malformed argument: ${argument}`, "InvalidArguments");
    }
    const existing = values.get(match[1]) ?? [];
    existing.push(match[2]);
    values.set(match[1], existing);
  }
  const taskId = values.get("task")?.at(-1)?.trim();
  const reportPath = values.get("report")?.at(-1)?.trim();
  if (!taskId || !taskIdPattern.test(taskId)) {
    throw new TaskReviewError("--task is required and must be a safe task identifier.", "InvalidArguments");
  }
  if (!reportPath) throw new TaskReviewError("--report is required.", "InvalidArguments");
  return {
    taskId,
    reportPath,
    output: values.get("output")?.at(-1)?.trim() || undefined,
    baseRef: values.get("base-ref")?.at(-1)?.trim() || undefined,
    skippedCommandKeys: values.get("skip-command") ?? [],
    desktopExport,
  };
}

