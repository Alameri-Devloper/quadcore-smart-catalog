import type { ProductMediaSlot } from "./product-media-slot";
import { ProductMediaOperationId } from "./product-media-operation-id";

const MAX_STORAGE_KEY_LENGTH = 512;
const MAX_WORKSPACE_SEGMENT_LENGTH = 64;
const MAX_DEPARTMENT_SEGMENT_LENGTH = 64;
const MAX_PRODUCT_FOLDER_LENGTH = 96;
const CANONICAL_SEGMENT = /^[a-z0-9][a-z0-9._-]*$/;
const PRODUCT_FOLDER = /^[a-z0-9][a-z0-9-]*--[a-f0-9]{16}$/;
const WINDOWS_RESERVED_SEGMENT = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(?:\.|$)/i;
const RESERVED_NAMESPACES = new Set(["_staging", "_trash", "_variants"]);

const validateSegment = (name: string, value: string, maximumLength: number): string => {
  if (typeof value !== "string" || value.length === 0 || value.length > maximumLength) {
    throw new Error(`${name} must contain between 1 and ${maximumLength} characters.`);
  }
  if (value !== value.toLowerCase() || !CANONICAL_SEGMENT.test(value) || value.endsWith(".") || WINDOWS_RESERVED_SEGMENT.test(value) || RESERVED_NAMESPACES.has(value)) {
    throw new Error(`${name} must be a safe lowercase canonical segment.`);
  }
  return value;
};

const assertRootShape = (value: string): readonly [string, string, string, string] => {
  if (typeof value !== "string" || value.length === 0 || value.length > MAX_STORAGE_KEY_LENGTH) {
    throw new Error("ProductMediaStorageRootKey has an invalid length.");
  }
  const segments = value.split("/");
  if (segments.length !== 4 || segments[0] !== "workspaces") {
    throw new Error("ProductMediaStorageRootKey must use the approved Product root shape.");
  }
  validateSegment("Workspace storage segment", segments[1], MAX_WORKSPACE_SEGMENT_LENGTH);
  validateSegment("Department storage segment", segments[2], MAX_DEPARTMENT_SEGMENT_LENGTH);
  validateSegment("Product folder", segments[3], MAX_PRODUCT_FOLDER_LENGTH);
  if (!PRODUCT_FOLDER.test(segments[3])) {
    throw new Error("Product folder must end with stable ProductId collision material.");
  }
  return segments as unknown as readonly [string, string, string, string];
};

export class ProductMediaStorageRootKey {
  private constructor(private readonly canonicalValue: string) {
    Object.freeze(this);
  }

  static create(value: string): ProductMediaStorageRootKey {
    assertRootShape(value);
    return new ProductMediaStorageRootKey(value);
  }

  static rehydrate(value: string): ProductMediaStorageRootKey {
    return this.create(value);
  }

  get value(): string {
    return this.canonicalValue;
  }

  equals(other: ProductMediaStorageRootKey): boolean {
    return this.canonicalValue === other.canonicalValue;
  }
}

abstract class ProductMediaRootedKey {
  protected constructor(
    readonly root: ProductMediaStorageRootKey,
    private readonly canonicalValue: string,
  ) {
    if (canonicalValue.length > MAX_STORAGE_KEY_LENGTH) throw new Error("Product media key exceeds the maximum length.");
  }

  get value(): string {
    return this.canonicalValue;
  }

  belongsTo(root: ProductMediaStorageRootKey): boolean {
    return this.root.equals(root);
  }
}

export class ProductMediaFinalKey extends ProductMediaRootedKey {
  private constructor(root: ProductMediaStorageRootKey, value: string) {
    super(root, value);
    Object.freeze(this);
  }

  static fromSlot(root: ProductMediaStorageRootKey, slot: ProductMediaSlot): ProductMediaFinalKey {
    if (slot.type === "Gallery" && (!Number.isInteger(slot.slotNumber) || slot.slotNumber < 1 || slot.slotNumber > 99)) {
      throw new Error("Gallery media slot must be an integer between 1 and 99.");
    }
    const fileName = slot.type === "Main" ? "main.webp" : `gallery-${String(slot.slotNumber).padStart(2, "0")}.webp`;
    return new ProductMediaFinalKey(root, `${root.value}/${fileName}`);
  }

  static rehydrate(root: ProductMediaStorageRootKey, value: string): ProductMediaFinalKey {
    const prefix = `${root.value}/`;
    if (!value.startsWith(prefix)) throw new Error("Product media final key must belong to its Product root.");
    const fileName = value.slice(prefix.length);
    if (fileName !== "main.webp" && !/^gallery-(0[1-9]|[1-9][0-9])\.webp$/.test(fileName)) {
      throw new Error("Product media final key must use a canonical published filename.");
    }
    return new ProductMediaFinalKey(root, value);
  }
}

export class ProductMediaStagingKey extends ProductMediaRootedKey {
  private constructor(root: ProductMediaStorageRootKey, value: string) {
    super(root, value);
    Object.freeze(this);
  }

  static create(root: ProductMediaStorageRootKey, operationId: string): ProductMediaStagingKey {
    return new ProductMediaStagingKey(root, `${root.value}/_staging/${ProductMediaOperationId.create(operationId).value}.webp`);
  }
}

export class ProductMediaTrashKey extends ProductMediaRootedKey {
  private constructor(root: ProductMediaStorageRootKey, value: string) {
    super(root, value);
    Object.freeze(this);
  }

  static create(root: ProductMediaStorageRootKey, operationId: string): ProductMediaTrashKey {
    return new ProductMediaTrashKey(root, `${root.value}/_trash/${ProductMediaOperationId.create(operationId).value}.webp`);
  }
}

export class DepartmentStorageSegment {
  private constructor(private readonly canonicalValue: string) {
    Object.freeze(this);
  }

  static create(value: string): DepartmentStorageSegment {
    return new DepartmentStorageSegment(validateSegment("DepartmentStorageSegment", value, MAX_DEPARTMENT_SEGMENT_LENGTH));
  }

  static unclassified(): DepartmentStorageSegment {
    return new DepartmentStorageSegment("unclassified");
  }

  get value(): string {
    return this.canonicalValue;
  }
}

export const PRODUCT_MEDIA_MAX_STORAGE_KEY_LENGTH = MAX_STORAGE_KEY_LENGTH;
