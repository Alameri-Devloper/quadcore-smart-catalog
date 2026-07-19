export interface ProductImageInput {
  productImageId: string;
  storageReference: string;
  order: number;
  isMain: boolean;
  altText?: string;
}

export class ProductImage {
  readonly productImageId: string;
  readonly storageReference: string;
  readonly order: number;
  readonly isMain: boolean;
  readonly altText?: string;

  private constructor(input: ProductImageInput) {
    this.productImageId = input.productImageId;
    this.storageReference = input.storageReference;
    this.order = input.order;
    this.isMain = input.isMain;
    this.altText = input.altText;
    Object.freeze(this);
  }

  static create(input: ProductImageInput): ProductImage {
    if (input.productImageId.trim().length === 0) {
      throw new Error("ProductImageId cannot be empty.");
    }

    if (input.storageReference.trim().length === 0) {
      throw new Error("Product Image StorageReference cannot be empty.");
    }

    if (!Number.isSafeInteger(input.order) || input.order < 0) {
      throw new Error("Product Image order must be a non-negative integer.");
    }

    if (input.altText !== undefined && input.altText.trim().length === 0) {
      throw new Error("Product Image AltText cannot be empty when provided.");
    }

    return new ProductImage(input);
  }

  equals(other: ProductImage): boolean {
    return (
      this.productImageId === other.productImageId &&
      this.storageReference === other.storageReference &&
      this.order === other.order &&
      this.isMain === other.isMain &&
      this.altText === other.altText
    );
  }
}

export const createProductImages = (
  inputs: readonly ProductImageInput[],
): ProductImage[] => {
  const images = inputs.map(ProductImage.create);
  const imageIds = new Set<string>();
  const orders = new Set<number>();

  for (const image of images) {
    if (imageIds.has(image.productImageId)) {
      throw new Error(`Duplicate ProductImageId: "${image.productImageId}".`);
    }

    if (orders.has(image.order)) {
      throw new Error(`Conflicting Product Image order: ${image.order}.`);
    }

    imageIds.add(image.productImageId);
    orders.add(image.order);
  }

  const mainImageCount = images.filter((image) => image.isMain).length;
  if (images.length > 0 && mainImageCount !== 1) {
    throw new Error(
      "A Product with images must contain exactly one Main Image.",
    );
  }

  return images;
};
