import { decodePublicShareKeyBase64 } from "./public-share-encoding";
import { PublicShareKeyRing, type PublicShareKeyEntry } from "./public-share-key-ring";

export interface PublicShareCryptoEnvironment {
  readonly NODE_ENV?: string;
  readonly QSC_PUBLIC_SHARE_HMAC_ACTIVE_VERSION?: string;
  readonly QSC_PUBLIC_SHARE_HMAC_KEYS_JSON?: string;
  readonly QSC_PUBLIC_SHARE_ENCRYPTION_ACTIVE_VERSION?: string;
  readonly QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON?: string;
  readonly QSC_PUBLIC_SHARE_PUBLIC_ORIGIN?: string;
}

const versionNumber = (text: string): number => {
  if (typeof text !== "string" || !/^[1-9][0-9]*$/.test(text) || !Number.isSafeInteger(Number(text))) {
    throw new Error("PublicShareConfigurationInvalid");
  }
  return Number(text);
};

// Only JSON's flat string-map grammar is accepted. Decode names before duplicate
// detection; parsing each string token cannot discard duplicate object members.
export const parsePublicShareKeyMap = (source: string): readonly PublicShareKeyEntry[] => {
  try {
    let offset = 0;
    const whitespace = () => { while (/[ \t\r\n]/.test(source[offset] ?? "") && offset < source.length) offset++; };
    const consume = (character: string) => {
      whitespace(); if (source[offset++] !== character) throw new Error();
    };
    const string = (): string => {
      whitespace();
      const match = /^"(?:[^"\\\u0000-\u001f]|\\(?:["\\/bfnrt]|u[0-9a-fA-F]{4}))*"/.exec(source.slice(offset));
      if (!match) throw new Error();
      offset += match[0].length;
      return JSON.parse(match[0]) as string;
    };
    consume("{"); whitespace();
    const names = new Set<string>();
    const entries: PublicShareKeyEntry[] = [];
    if (source[offset] === "}") throw new Error();
    while (true) {
      const name = string();
      if (names.has(name) || entries.length === 8) throw new Error();
      names.add(name); consume(":");
      entries.push({ version: versionNumber(name), bytes: decodePublicShareKeyBase64(string()) });
      whitespace();
      if (source[offset] === "}") { offset++; break; }
      consume(",");
    }
    whitespace();
    if (offset !== source.length) throw new Error();
    return entries;
  } catch { throw new Error("PublicShareConfigurationInvalid"); }
};

export const canonicalPublicShareOrigin = (source: string, production: boolean): string => {
  try {
    // Check raw spelling first: URL normalization must not hide /a/.. or a backslash.
    if (typeof source !== "string" || /[\s\\\u0000-\u001f\u007f]/.test(source)
      || !/^https?:\/\/[^/?#\\]+\/?$/i.test(source) || source.includes("@")) throw new Error();
    const url = new URL(source);
    if ((url.protocol !== "https:" && url.protocol !== "http:") || (production && url.protocol !== "https:")
      || !url.hostname || url.username || url.password || url.search || url.hash || url.pathname !== "/") throw new Error();
    return url.origin;
  } catch { throw new Error("PublicShareOriginInvalid"); }
};

const productionMode = (value: unknown): boolean => {
  if (value === "production") return true;
  if (value === "development" || value === "test") return false;
  throw new Error("PublicShareConfigurationInvalid");
};

export type PublicShareConfigurationDiagnostic = "LookupConfigurationInvalid" | "EncryptionConfigurationInvalid"
  | "PurposeKeyReuse" | "PublicOriginInvalid";
export interface PublicShareConfigurationReadiness {
  readonly lookup: "READY" | "UNAVAILABLE";
  readonly encryption: "READY" | "UNAVAILABLE";
  readonly urlConstruction: "READY" | "UNAVAILABLE";
  readonly durableCoverage: "UNCHECKED";
  readonly diagnostics: readonly PublicShareConfigurationDiagnostic[];
}

export const readPublicShareCryptoConfiguration = (environment: PublicShareCryptoEnvironment) => {
  const diagnostics: PublicShareConfigurationDiagnostic[] = [];
  let lookup: PublicShareKeyRing | null = null;
  let encryption: PublicShareKeyRing | null = null;
  let publicOrigin: string | null = null;
  try { lookup = new PublicShareKeyRing("lookup", parsePublicShareKeyMap(environment.QSC_PUBLIC_SHARE_HMAC_KEYS_JSON ?? ""),
    versionNumber(environment.QSC_PUBLIC_SHARE_HMAC_ACTIVE_VERSION ?? "")); }
  catch { diagnostics.push("LookupConfigurationInvalid"); }
  try { encryption = new PublicShareKeyRing("encryption", parsePublicShareKeyMap(environment.QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON ?? ""),
    versionNumber(environment.QSC_PUBLIC_SHARE_ENCRYPTION_ACTIVE_VERSION ?? "")); }
  catch { diagnostics.push("EncryptionConfigurationInvalid"); }
  if (lookup && encryption && lookup.sharesMaterialWith(encryption)) {
    lookup = null; encryption = null; diagnostics.push("PurposeKeyReuse");
  }
  try {
    const production = productionMode(environment.NODE_ENV);
    publicOrigin = canonicalPublicShareOrigin(environment.QSC_PUBLIC_SHARE_PUBLIC_ORIGIN ?? "", production);
  }
  catch { diagnostics.push("PublicOriginInvalid"); }
  const readiness: PublicShareConfigurationReadiness = Object.freeze({
    lookup: lookup ? "READY" : "UNAVAILABLE", encryption: encryption ? "READY" : "UNAVAILABLE",
    urlConstruction: publicOrigin ? "READY" : "UNAVAILABLE", durableCoverage: "UNCHECKED",
    diagnostics: Object.freeze(diagnostics),
  });
  return { lookup, encryption, publicOrigin, readiness };
};
