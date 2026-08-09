export class SameOriginRequestPolicy {
  constructor(private readonly configuredOrigin?: string) {}

  allows(request: Request): boolean {
    const originHeader = request.headers.get("origin");
    if (!originHeader) return false;
    let requestUrl: URL;
    let origin: URL;
    try {
      requestUrl = new URL(request.url);
      origin = new URL(originHeader);
    } catch {
      return false;
    }
    const expected = this.configuredOrigin ? new URL(this.configuredOrigin) : requestUrl;
    if (origin.origin !== expected.origin) return false;
    const host = request.headers.get("host");
    return host === null || host.toLowerCase() === requestUrl.host.toLowerCase();
  }
}

export const sameOriginPolicyFromEnvironment = (
  environment: Readonly<{ QSC_PUBLIC_ORIGIN?: string }> = process.env as Readonly<{ QSC_PUBLIC_ORIGIN?: string }>,
): SameOriginRequestPolicy => new SameOriginRequestPolicy(environment.QSC_PUBLIC_ORIGIN?.trim() || undefined);
