export interface SessionCookieConfiguration {
  readonly name: string;
  readonly secure: boolean;
}

const COOKIE_NAME = /^[!#$%&'*+.^_`|~0-9A-Za-z-]+$/;

export class SessionCookieAdapter {
  constructor(readonly configuration: SessionCookieConfiguration) {
    if (!COOKIE_NAME.test(configuration.name)) throw new Error("SessionCookieNameInvalid");
    if (configuration.name.startsWith("__Host-") && !configuration.secure) {
      throw new Error("SessionCookieHostPrefixRequiresSecure");
    }
  }

  read(request: Request): string | null {
    const header = request.headers.get("cookie");
    if (!header) return null;
    for (const part of header.split(";")) {
      const separator = part.indexOf("=");
      if (separator < 1) continue;
      if (part.slice(0, separator).trim() !== this.configuration.name) continue;
      try { return decodeURIComponent(part.slice(separator + 1).trim()); }
      catch { return null; }
    }
    return null;
  }

  serialize(opaqueValue: string, absoluteExpiresAt: Date, at: Date): string {
    const maximumAge = Math.max(0, Math.floor((absoluteExpiresAt.getTime() - at.getTime()) / 1_000));
    return [
      `${this.configuration.name}=${encodeURIComponent(opaqueValue)}`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      ...(this.configuration.secure ? ["Secure"] : []),
      `Max-Age=${maximumAge}`,
      `Expires=${absoluteExpiresAt.toUTCString()}`,
    ].join("; ");
  }

  clear(): string {
    return [
      `${this.configuration.name}=`,
      "Path=/",
      "HttpOnly",
      "SameSite=Lax",
      ...(this.configuration.secure ? ["Secure"] : []),
      "Max-Age=0",
      "Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    ].join("; ");
  }
}

export const sessionCookieFromEnvironment = (
  environment: Readonly<{ NODE_ENV?: string; QSC_SESSION_COOKIE_NAME?: string }> = process.env,
): SessionCookieAdapter => {
  const secure = environment.NODE_ENV === "production";
  const name = environment.QSC_SESSION_COOKIE_NAME?.trim() || (secure ? "__Host-qsc_session" : "qsc_session");
  return new SessionCookieAdapter({ name, secure });
};
