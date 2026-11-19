import { createHmac, createHash } from "node:crypto";
import { isIP } from "node:net";
import type { PublicShareTrustedSourcePort } from "../http/public-share-resolution-http";
export function canonicalSource(value: string): string | null {
  if (value !== value.trim() || value.includes("%") || !isIP(value)) return null;
  if (isIP(value)===4) return value;
  const canonical = new URL("http://["+value+"]").hostname.slice(1,-1).toLowerCase();
  const mapped = /^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/.exec(canonical);
  if (mapped) { const a=parseInt(mapped[1],16), b=parseInt(mapped[2],16); return [a>>8,a&255,b>>8,b&255].join("."); }
  return canonical;
}
/** Only pass requests from an isolated server that verified its socket peer and
 * overwrote this header. Request headers alone cannot prove an ingress peer. */
export class QaTrustedPublicShareSource implements PublicShareTrustedSourcePort {
  readonly fingerprint: string;
  constructor(private readonly key: Buffer, private readonly verifiedRequest: (request: Request)=>boolean) {
    if (key.byteLength!==32) throw Error("QaSourceKeyInvalid");
    this.fingerprint=createHash("sha256").update(key).digest("hex");
  }
  async resolve(request: Request): Promise<string|null> {
    if (!this.verifiedRequest(request)) return null;
    const raw=request.headers.get("x-qsc-qa-source");
    const ip=raw ? canonicalSource(raw) : null;
    if (!ip || raw!==ip) return null;
    return createHmac("sha256",this.key).update("qsc-public-admission-source-v1\0").update(ip).digest("hex");
  }
}
/** Fixed aggregate fields only: never serialize an Error, Request, URL or input object. */
export const admissionDiagnostic = (route: "Page"|"Media", method: string, status: number, durationMs: number) => ({
  route:route==="Page"?"Page":"Media",
  method:["GET","HEAD","OPTIONS","POST","PUT","PATCH","DELETE"].includes(method)?method:"OTHER",
  status:[200,204,404,405,429,503].includes(status)?status:503,
  duration:durationMs<25?"lt25":durationMs<75?"lt75":durationMs<200?"lt200":"gte200",
});
