export type SecretCategory =
  | "CREDENTIAL_URL"
  | "PRIVATE_KEY"
  | "AUTHORIZATION"
  | "GITHUB_TOKEN"
  | "NPM_TOKEN"
  | "SECRET_ASSIGNMENT";

const rules: readonly { category: SecretCategory; pattern: RegExp }[] = [
  { category: "PRIVATE_KEY", pattern: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  { category: "AUTHORIZATION", pattern: /Authorization\s*:\s*Bearer\s+(?!\[REDACTED:)[^\s"']+/i },
  { category: "GITHUB_TOKEN", pattern: /\b(?:ghp|gho|ghu|ghs|ghr)_[A-Za-z0-9]{20,}\b/ },
  { category: "NPM_TOKEN", pattern: /\bnpm_[A-Za-z0-9]{20,}\b/ },
  {
    category: "SECRET_ASSIGNMENT",
    pattern: /\b(?:DATABASE_URL|[A-Z][A-Z0-9_]*(?:PASSWORD|SECRET|TOKEN|API_KEY)[A-Z0-9_]*)\s*[:=]\s*["']?(?!\[REDACTED:|example\b|placeholder\b|test\b|changeme\b|\$\{)[^\s"']{12,}/i,
  },
];

export function detectSecretMaterial(value: string): readonly SecretCategory[] {
  const categories = rules.filter(({ pattern }) => pattern.test(value)).map(({ category }) => category);
  const credentialUrls = value.matchAll(/\b[a-z][a-z0-9+.-]*:\/\/([^\s:/@]+):([^\s@]+)@[^\s"'`]+/gi);
  for (const match of credentialUrls) {
    const credential = match[2].toLowerCase();
    if (!/^\[redacted(?::[^\]]+)?\]$|^\$\{[^}]+\}$|^(?:password|token|example|placeholder|changeme|test)$/.test(credential)) {
      categories.push("CREDENTIAL_URL");
      break;
    }
  }
  return [...new Set(categories)];
}

export function isLikelyText(value: Uint8Array, sampleLimit = 8192): boolean {
  const sample = value.subarray(0, Math.min(value.byteLength, sampleLimit));
  if (sample.includes(0)) return false;
  try {
    new TextDecoder("utf-8", { fatal: true }).decode(sample);
    return true;
  } catch {
    return false;
  }
}
