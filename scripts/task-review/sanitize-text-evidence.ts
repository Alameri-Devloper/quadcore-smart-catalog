import type { SanitizationResult } from "./task-review.types";

const rules: readonly { category: string; pattern: RegExp; replacement: string | ((...values: string[]) => string) }[] = [
  {
    category: "PASSWORD",
    pattern: /([a-z][a-z0-9+.-]*:\/\/[^\s:/]+:)([^\s@]+)(@)/gi,
    replacement: "$1[REDACTED:PASSWORD]$3",
  },
  { category: "AUTHORIZATION", pattern: /(Authorization\s*:\s*Bearer\s+)[^\s"']+/gi, replacement: "$1[REDACTED:TOKEN]" },
  { category: "GITHUB_TOKEN", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED:GITHUB_TOKEN]" },
  { category: "NPM_TOKEN", pattern: /\bnpm_[A-Za-z0-9]{20,}\b/g, replacement: "[REDACTED:NPM_TOKEN]" },
  {
    category: "PRIVATE_KEY",
    pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----[\s\S]*?-----END (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/g,
    replacement: "[REDACTED:PRIVATE_KEY]",
  },
  {
    category: "SECRET_ASSIGNMENT",
    pattern: /(^|\n)(\s*(?:[A-Z][A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|API_KEY)[A-Z0-9_]*)\s*=\s*)([^\r\n]+)/g,
    replacement: "$1$2[REDACTED:SECRET_ASSIGNMENT]",
  },
];

export function sanitizeTextEvidence(value: string): SanitizationResult {
  let text = value;
  const byCategory: Record<string, number> = {};
  for (const rule of rules) {
    let count = 0;
    text = text.replace(rule.pattern, (...args: string[]) => {
      count += 1;
      if (typeof rule.replacement === "string") {
        return rule.replacement.replace(/\$(\d)/g, (_, index: string) => args[Number(index)] ?? "");
      }
      return rule.replacement(...args);
    });
    if (count > 0) byCategory[rule.category] = (byCategory[rule.category] ?? 0) + count;
  }
  return { text, byCategory };
}
