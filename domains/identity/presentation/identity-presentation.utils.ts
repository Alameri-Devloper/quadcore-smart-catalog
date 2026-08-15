import type { ApiFailureKind, ApiResult, AuthViewState, BranchScopeDraft, CommunicationSettingsView, SafeActorView } from "./identity-presentation.types";

export const REMEMBERED_WORKSPACE_CODE_STORAGE_NAME = "qsc.remembered-workspace-code";
export const PRESENTATION_LOCALE_STORAGE_NAME = "qsc.presentation-locale";

export const safeReturnPath = (value: string | null | undefined, fallback = "/"): string => {
  if (!value || !value.startsWith("/") || value.startsWith("//") || value.includes("\\")) return fallback;
  try {
    const parsed = new URL(value, "https://qsc.local");
    return parsed.origin === "https://qsc.local" && !parsed.username && !parsed.password
      ? `${parsed.pathname}${parsed.search}${parsed.hash}`
      : fallback;
  } catch {
    return fallback;
  }
};

export function passwordValidationCode(value: string): "PasswordLength" | "PasswordAllSpace" | null {
  const length = Array.from(value).length;
  if (length < 12 || length > 128) return "PasswordLength";
  if (/^\s+$/u.test(value)) return "PasswordAllSpace";
  return null;
}

export const isWesternOtp = (value: string): boolean => /^[0-9]{8}$/.test(value);

export const normalizeWesternOtpDraft = (value: string): string =>
  value.replace(/[^0-9]/g, "").slice(0, 8);

export const isE164Phone = (value: string): boolean => /^\+[1-9][0-9]{7,14}$/.test(value);

export const isUsernameDraftValid = (value: string): boolean => /^[A-Za-z0-9._-]{3,64}$/.test(value);

export const isWorkspaceCodeDraftValid = (value: string): boolean =>
  /^[a-z0-9](?:[a-z0-9-]{1,30}[a-z0-9])$/.test(value.toLowerCase()) && !value.includes("--");

export const isBranchScopeDraftValid = (scope: BranchScopeDraft): boolean =>
  scope.type === "AllBranches" ? scope.branchIds.length === 0 : scope.branchIds.length > 0;

export const apiFailureKindForStatus = (status: number): ApiFailureKind => {
  if (status === 401) return "Unauthorized";
  if (status === 403) return "Forbidden";
  if (status === 404) return "NotFound";
  if (status === 409) return "Conflict";
  if (status === 400 || status === 422) return "ValidationError";
  if (status === 429) return "Throttled";
  if (status === 503) return "Unavailable";
  return "UnexpectedError";
};

export const authViewStateFromResult = (result: ApiResult<SafeActorView>): AuthViewState => {
  if (!result.ok) return result.kind === "Unauthorized" ? { type: "Unauthenticated" } : { type: "Unavailable" };
  return result.value.passwordChangeRequired || result.value.sessionClass === "Restricted"
    ? { type: "Restricted", actor: result.value }
    : { type: "Authenticated", actor: result.value };
};

export const isLogoutSafelyConfirmed = (result: ApiResult<null>): boolean =>
  result.ok || result.kind === "Unauthorized";

export const communicationSettingsAfterConfirmedSave = (
  current: CommunicationSettingsView,
  result: ApiResult<CommunicationSettingsView>,
): CommunicationSettingsView => result.ok ? result.value : current;

export interface AsyncActionGate {
  readonly isActive: () => boolean;
  readonly run: <T>(operation: () => Promise<T>) => Promise<T | null>;
}

export const createAsyncActionGate = (): AsyncActionGate => {
  let active = false;
  return Object.freeze({
    isActive: () => active,
    run: async <T>(operation: () => Promise<T>): Promise<T | null> => {
      if (active) return null;
      active = true;
      try { return await operation(); }
      finally { active = false; }
    },
  });
};

export function generateTemporaryPassword(cryptoSource: Pick<Crypto, "getRandomValues"> = crypto): string {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%*-_";
  const output: string[] = [];
  const bytes = new Uint8Array(32);
  while (output.length < 20) {
    cryptoSource.getRandomValues(bytes);
    for (const byte of bytes) {
      if (byte >= Math.floor(256 / alphabet.length) * alphabet.length) continue;
      output.push(alphabet[byte % alphabet.length]!);
      if (output.length === 20) break;
    }
  }
  return output.join("");
}

export const secondsRemaining = (availableAt: number, now: number): number =>
  Math.max(0, Math.ceil((availableAt - now) / 1000));
