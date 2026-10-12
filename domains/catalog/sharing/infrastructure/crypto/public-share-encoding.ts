import {
  validatePublicSharePositiveVersion,
  validatePublicShareToken,
} from "../../domain/public-share-values";
import type { PublicShareBearerContext } from "../../ports/public-share-crypto.port";

export const encodePublicShareBase64Url = (bytes: Uint8Array): string => Buffer.from(bytes).toString("base64url");

export const decodePublicShareBase64Url = (value: unknown, bytes: number): Buffer => {
  if (typeof value !== "string" || value.length !== Math.ceil(bytes * 8 / 6)
    || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("PublicShareEncodingInvalid");
  const decoded = Buffer.from(value, "base64url");
  if (decoded.length !== bytes || encodePublicShareBase64Url(decoded) !== value) {
    throw new Error("PublicShareEncodingInvalid");
  }
  return decoded;
};

export const decodePublicShareKeyBase64 = (value: unknown): Buffer => {
  if (typeof value !== "string" || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(value)
    || value.length === 0) throw new Error("PublicShareKeyEncodingInvalid");
  const bytes = Buffer.from(value, "base64");
  if (bytes.toString("base64") !== value) throw new Error("PublicShareKeyEncodingInvalid");
  return bytes;
};

export const canonicalPublicShareToken = (value: unknown): string => {
  const token = validatePublicShareToken(value);
  decodePublicShareBase64Url(token, 32);
  return token;
};

export const publicShareRetrievalAad = (version: number, context: PublicShareBearerContext): Buffer => {
  validatePublicSharePositiveVersion(version);
  const identities = [context?.workspaceId, context?.grantId, context?.productId, context?.branchId];
  if (identities.some((value) => typeof value !== "string" || value.trim().length === 0
    || Buffer.from(value, "utf8").toString("utf8") !== value)) throw new Error("PublicShareContextInvalid");
  return Buffer.from(JSON.stringify([
    "qsc:catalog:public-sharing:retrieval:v1", 1, version, ...identities,
  ]), "utf8");
};
