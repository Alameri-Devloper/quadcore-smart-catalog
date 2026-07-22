export interface IntegrationTestDatabaseTarget {
  readonly host: string;
  readonly port: string;
  readonly databaseName: string;
}

const POSTGRESQL_PROTOCOLS = new Set(["postgres:", "postgresql:"]);
const TEST_DATABASE_NAME = /(^|[_-])test([_-]|$)/;

const expandIpv6 = (host: string): number[] | undefined => {
  const halves = host.split("::");
  if (halves.length > 2) return undefined;
  const left = halves[0] ? halves[0].split(":") : [];
  const right = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const missing = 8 - left.length - right.length;
  if (missing < 0 || (halves.length === 1 && missing !== 0)) return undefined;
  const parts = [...left, ...Array<string>(missing).fill("0"), ...right];
  if (parts.length !== 8) return undefined;
  const parsed = parts.map((part) => Number.parseInt(part, 16));
  return parsed.every((part) => Number.isInteger(part) && part >= 0 && part <= 0xffff)
    ? parsed
    : undefined;
};

const isLoopbackHost = (host: string): boolean => {
  if (host === "localhost") return true;
  if (isIP(host) === 4) return host.split(".")[0] === "127";
  if (isIP(host) !== 6) return false;

  const parts = expandIpv6(host);
  if (!parts) return false;
  const isIpv6Loopback = parts.slice(0, 7).every((part) => part === 0) && parts[7] === 1;
  const isIpv4MappedLoopback =
    parts.slice(0, 5).every((part) => part === 0) &&
    parts[5] === 0xffff &&
    (parts[6] >> 8) === 127;
  return isIpv6Loopback || isIpv4MappedLoopback;
};

const normalizeDatabaseHost = (value: string): string => {
  const withoutBrackets = value.replace(/^\[|\]$/g, "").toLowerCase();
  const withoutTrailingDot = withoutBrackets.endsWith(".")
    ? withoutBrackets.slice(0, -1)
    : withoutBrackets;
  return isLoopbackHost(withoutTrailingDot) ? "loopback" : withoutTrailingDot;
};

const parsePostgreSqlTarget = (
  value: string,
  variableName: "TEST_DATABASE_URL" | "DATABASE_URL",
): IntegrationTestDatabaseTarget => {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${variableName} must be a valid PostgreSQL URL.`);
  }

  if (!POSTGRESQL_PROTOCOLS.has(url.protocol)) {
    throw new Error(`${variableName} must use the PostgreSQL protocol.`);
  }

  let databaseName: string;
  try {
    databaseName = decodeURIComponent(url.pathname.replace(/^\//, "")).toLowerCase();
  } catch {
    throw new Error(`${variableName} must contain a valid database name.`);
  }

  if (!url.hostname || !databaseName || databaseName.includes("/")) {
    throw new Error(`${variableName} must identify a PostgreSQL host and database.`);
  }

  return Object.freeze({
    host: normalizeDatabaseHost(url.hostname),
    port: url.port || "5432",
    databaseName,
  });
};

export const assertSafeIntegrationTestDatabaseUrl = (
  testDatabaseUrl: string | undefined,
  applicationDatabaseUrl?: string,
): IntegrationTestDatabaseTarget => {
  if (!testDatabaseUrl) {
    throw new Error("TEST_DATABASE_URL is required for PostgreSQL integration tests.");
  }

  const target = parsePostgreSqlTarget(testDatabaseUrl, "TEST_DATABASE_URL");
  if (!TEST_DATABASE_NAME.test(target.databaseName)) {
    throw new Error("TEST_DATABASE_URL database name must contain a separate test token.");
  }

  if (applicationDatabaseUrl) {
    const applicationTarget = parsePostgreSqlTarget(applicationDatabaseUrl, "DATABASE_URL");
    const sameDatabaseName = target.databaseName === applicationTarget.databaseName;
    const sameCanonicalTarget =
      target.host === applicationTarget.host &&
      target.port === applicationTarget.port &&
      target.databaseName === applicationTarget.databaseName;
    if (sameDatabaseName || sameCanonicalTarget) {
      throw new Error("TEST_DATABASE_URL must not target the application database.");
    }
  }

  return target;
};
import { isIP } from "node:net";
