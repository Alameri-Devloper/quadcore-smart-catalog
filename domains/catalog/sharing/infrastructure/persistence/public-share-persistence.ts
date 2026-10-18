import type { PlatformDatabase } from "../../../../../shared/infrastructure/persistence/database";
import { PublicSharePersistenceFailure } from "../../ports/public-share-persistence-failure";

export type PublicShareTransaction = Parameters<Parameters<PlatformDatabase["transaction"]>[0]>[0];

// Grant lifecycle instants support exact milliseconds only. Inspect raw text before Date conversion.
export const exactPublicShareTimestamp = (value: unknown): Date => {
  if (typeof value !== 'string') throw new PublicSharePersistenceFailure('IntegrityFailure');
  const parts = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2}):(\d{2})(?:\.(\d{1,6}))?(Z|[+-]\d{2}(?::\d{2})?)$/.exec(value);
  if (!parts || /[1-9]/.test((parts[7] ?? '').slice(3))) throw new PublicSharePersistenceFailure('IntegrityFailure');
  // All precision decisions above precede any numeric or Date conversion.
  const year = Number(parts[1]), month = Number(parts[2]), day = Number(parts[3]);
  const calendar = new Date(0); calendar.setUTCFullYear(year, month, 0);
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > calendar.getUTCDate()
    || Number(parts[4]) > 23 || Number(parts[5]) > 59 || Number(parts[6]) > 59) throw new PublicSharePersistenceFailure('IntegrityFailure');
  const offset = /^[+-]\d{2}$/.test(parts[8]) ? `${parts[8]}:00` : parts[8];
  const result = new Date(`${parts[1]}-${parts[2]}-${parts[3]}T${parts[4]}:${parts[5]}:${parts[6]}.${(parts[7] ?? '').padEnd(3, '0')}${offset}`);
  if (!Number.isFinite(result.getTime())) throw new PublicSharePersistenceFailure('IntegrityFailure');
  return result;
};

export const publicShareDatabaseFailure = (error: unknown): PublicSharePersistenceFailure => {
  if (error instanceof PublicSharePersistenceFailure) return error;
  const driver = publicShareDriverError(error);
  return new PublicSharePersistenceFailure(driver?.code === "40001" ? "SerializationConflict"
    : driver?.code === "40P01" ? "DeadlockConflict" : "ServiceUnavailable");
};

// Only the known direct driver / one Drizzle cause boundary is inspected.
export const publicShareDriverError = (error: unknown): { code?: unknown; constraint?: unknown } | null => {
  if (!error || typeof error !== "object") return null;
  if ("code" in error) return error;
  if ("cause" in error && error.cause && typeof error.cause === "object" && "code" in error.cause) return error.cause;
  return null;
};

export const exactPublicShareVersion = (value: unknown): number => {
  if (typeof value !== "string" || !/^[1-9][0-9]*$/.test(value)) throw new PublicSharePersistenceFailure("IntegrityFailure");
  const integer = BigInt(value);
  if (integer > BigInt(Number.MAX_SAFE_INTEGER)) throw new PublicSharePersistenceFailure("IntegrityFailure");
  return Number(integer);
};

export const publicShareIdentity = (value: unknown): string => {
  if (typeof value !== "string" || !value || value.trim() !== value) throw new PublicSharePersistenceFailure("IntegrityFailure");
  return value;
};
