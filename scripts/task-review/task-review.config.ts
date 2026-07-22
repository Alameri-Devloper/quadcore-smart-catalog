import type { TaskReviewCommandConfig } from "./task-review.types";

const command = (key: string, executable: string, args: readonly string[], required: boolean): TaskReviewCommandConfig => ({
  key,
  command: executable,
  args,
  required,
  timeoutMs: 300_000,
});

export const taskReviewVerificationCommands = [
  command("typescript", "npx.cmd", ["tsc", "--noEmit"], true),
  command("integration-typescript", "npx.cmd", ["tsc", "--project", "tsconfig.integration.json"], true),
  command("lint", "npm.cmd", ["run", "lint"], true),
  command("unit-tests", "npm.cmd", ["test"], true),
  command("integration-tests", "npm.cmd", ["run", "test:integration"], true),
  command("build", "npm.cmd", ["run", "build"], true),
  command("drizzle-check", "npm.cmd", ["run", "db:check"], true),
  command("audit-runtime", "npm.cmd", ["audit", "--omit=dev"], false),
  command("audit-full", "npm.cmd", ["audit"], false),
] as const;

export const excludedReviewPathPatterns = [
  /(?:^|\/)\.env(?:\..+)?$/i,
  /^node_modules\//,
  /^\.next\//,
  /^coverage\//,
  /^dist\//,
  /^build\//,
  /^\.npm-cache\//,
  /^artifacts\/task-reviews\//,
  /^QSC-Reviews\//,
  /(?:^|\/)postgres(?:ql)?-data\//i,
  /(?:^|\/)database-dumps?\//i,
  /(?:^|\/)product-media\//i,
  /(?:^|\/)\.git-credentials$/i,
  /(?:^|\/)(?:id_rsa|id_ed25519|.*\.(?:pem|key|p12|pfx|jks|keystore))$/i,
  /(?:^|\/).*review.*\.zip$/i,
];

export function isExcludedReviewPath(path: string): boolean {
  if (/(?:^|\/)\.env\.example$/.test(path)) return false;
  return excludedReviewPathPatterns.some((pattern) => pattern.test(path));
}
