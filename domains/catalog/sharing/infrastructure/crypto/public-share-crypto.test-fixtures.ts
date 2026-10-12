import type { PublicShareCryptoResult } from "../../ports/public-share-crypto.port";
import type { PublicShareCryptoEnvironment } from "./environment-public-share-crypto";
import { PublicShareKeyRing } from "./public-share-key-ring";

// Synthetic bytes only. HMAC expected value independently calculated by Python hmac/hashlib.
export const TOKEN = "AAECAwQFBgcICQoLDA0ODxAREhMUFRYXGBkaGxwdHh8";
export const HMAC_KEY = Buffer.from(Array.from({ length: 32 }, (_,index) => index + 32));
export const AES_KEY = Buffer.from(Array.from({ length: 32 }, (_,index) => index + 64));
export const DIGEST = { keyVersion: 1, value: "72c9d4f284314f938e630857cd6a11d98fbff19b84f08a5c181f53679b6c3189" };
export const CONTEXT = { workspaceId: "workspace-1", grantId: "grant-1", productId: "product-1", branchId: "branch-1" };
export const AAD = '["qsc:catalog:public-sharing:retrieval:v1",1,2,"workspace-1","grant-1","product-1","branch-1"]';
export const IV = Buffer.from(Array.from({ length: 12 }, (_, index) => index));
// Independently established using Web Crypto AES-GCM with literal AAD, not the adapter/helper.
export const CIPHERTEXT_HEX = "7b44293b36fb15e68075e38bfbbca3f7c7851d462834ec01ab48a5c307e330060732af60fc3a7c1bf87040";
export const TAG_HEX = "e945f746f055df6d153602a1abfa93cd";
export const success = <T>(result: PublicShareCryptoResult<T>): T => {
  if (!result.ok) throw new Error("ExpectedSyntheticCryptoSuccess");
  return result.value;
};
export const lookupRing = (versions = [1], active = versions[0]) => new PublicShareKeyRing("lookup",
  versions.map((version) => ({ version, bytes: HMAC_KEY })), active);
export const encryptionRing = (versions = [2], active = versions[0]) => new PublicShareKeyRing("encryption",
  versions.map((version) => ({ version, bytes: AES_KEY })), active);
export const environment = (overrides: Partial<PublicShareCryptoEnvironment> = {}): PublicShareCryptoEnvironment => ({
  NODE_ENV: "test", QSC_PUBLIC_SHARE_HMAC_ACTIVE_VERSION: "1",
  QSC_PUBLIC_SHARE_HMAC_KEYS_JSON: JSON.stringify({ 1: HMAC_KEY.toString("base64") }),
  QSC_PUBLIC_SHARE_ENCRYPTION_ACTIVE_VERSION: "2",
  QSC_PUBLIC_SHARE_ENCRYPTION_KEYS_JSON: JSON.stringify({ 2: AES_KEY.toString("base64") }),
  QSC_PUBLIC_SHARE_PUBLIC_ORIGIN: "https://example.com/", ...overrides,
});
