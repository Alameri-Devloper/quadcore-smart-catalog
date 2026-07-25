import type { ProductId, WorkspaceId } from "../../types/product-identity.value-object";
import { DepartmentStorageSegment, ProductMediaStorageRootKey } from "../domain/product-media-keys";

const RESERVED_WINDOWS_NAMES = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;

const sha256 = async (value: string): Promise<string> => {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
};

const safeSegment = (value: string, fallback: string, maxLength: number): string => {
  const normalized = value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  let segment = normalized
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-")
    .slice(0, maxLength)
    .replace(/[. ]+$/g, "");
  if (!segment || RESERVED_WINDOWS_NAMES.test(segment)) segment = fallback;
  return segment;
};

const stableIdSegment = async (value: string, length = 16): Promise<string> => (await sha256(value)).slice(0, length);

export interface ProductMediaRootPolicyInput {
  readonly workspaceId: WorkspaceId;
  readonly departmentSegment: DepartmentStorageSegment;
  readonly productId: ProductId;
  readonly productCode?: string | null;
  readonly productName?: string | null;
}

export class ProductMediaPathPolicy {
  static async workspaceSegment(workspaceId: WorkspaceId): Promise<string> {
    const safe = safeSegment(workspaceId.value, "", 48);
    return safe && safe === workspaceId.value
      ? safe
      : `workspace-${await stableIdSegment(workspaceId.value, 20)}`;
  }

  static async productIdSuffix(productId: ProductId): Promise<string> {
    return stableIdSegment(productId.value);
  }

  static async productFolder(input: Pick<ProductMediaRootPolicyInput, "productId" | "productCode" | "productName">): Promise<string> {
    const readable = safeSegment(input.productCode ?? input.productName ?? "", "product", 64);
    return `${readable}--${await stableIdSegment(input.productId.value)}`;
  }

  static async storageRoot(input: ProductMediaRootPolicyInput): Promise<ProductMediaStorageRootKey> {
    const workspace = await this.workspaceSegment(input.workspaceId);
    const product = await this.productFolder(input);
    return ProductMediaStorageRootKey.create(`workspaces/${workspace}/${input.departmentSegment.value}/${product}`);
  }
}
