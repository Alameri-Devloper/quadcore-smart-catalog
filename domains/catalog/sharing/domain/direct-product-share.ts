export const DIRECT_SHARE_LOCALES = ["ar", "en"] as const;
export const DIRECT_SHARE_PRICE_MODES = ["Retail", "Wholesale"] as const;
export const DIRECT_SHARE_SPECIFICATION_LIMIT = 6;
export const DIRECT_SHARE_TEXT_LIMIT = 2_000;
export const DIRECT_SHARE_MEDIA_MAX_BYTES = 8 * 1024 * 1024;

export type DirectShareLocale = (typeof DIRECT_SHARE_LOCALES)[number];
export type DirectSharePriceMode = (typeof DIRECT_SHARE_PRICE_MODES)[number];
export type DirectShareAvailability = "InStock" | "OutOfStock";

export interface DirectShareMoneyProjection {
  readonly amountMinor: bigint;
  readonly currency: string;
}

export interface DirectShareSpecificationProjection {
  readonly displayName: string;
  readonly value: string | boolean;
  readonly unit: string | null;
  readonly position: number;
}

export interface DirectShareMediaProjection {
  readonly mediaId: string;
  readonly storageRootKey: string;
  readonly storageKey: string;
  readonly checksumSha256: string;
  readonly mimeType: "image/webp";
}

export interface DirectProductShareProjection {
  readonly productId: string;
  readonly productCode: string | null;
  readonly productName: string | null;
  readonly lifecycle: "Draft" | "Published" | "Archived";
  readonly branch: null | {
    readonly displayName: string;
    readonly listingStatus: "Listed" | "Unlisted" | "NotConfigured";
    readonly availableQuantity: bigint;
  };
  readonly price: DirectShareMoneyProjection | null;
  readonly specifications: readonly DirectShareSpecificationProjection[];
  readonly mainMedia: DirectShareMediaProjection | null;
}

export interface DirectProductSharePayload {
  readonly productId: string;
  readonly productCode: string | null;
  readonly productName: string;
  readonly price: {
    readonly mode: DirectSharePriceMode;
    readonly amountMinor: string;
    readonly currency: string;
  };
  readonly branch?: { readonly displayName: string };
  readonly availability?: DirectShareAvailability;
  readonly specifications: readonly {
    readonly displayName: string;
    readonly value: string | boolean;
    readonly unit: string | null;
  }[];
  readonly mainMedia?: {
    readonly downloadUrl: string;
    readonly contentType: "image/webp";
    readonly fileName: string;
  };
  readonly title: string;
  readonly text: string;
}

const labels = {
  en: { code: "Code", price: "Price", retail: "Retail", wholesale: "Wholesale", branch: "Branch", availability: "Availability", inStock: "In stock", outOfStock: "Out of stock", yes: "Yes", no: "No" },
  ar: { code: "الرمز", price: "السعر", retail: "تجزئة", wholesale: "جملة", branch: "الفرع", availability: "التوفر", inStock: "متوفر", outOfStock: "غير متوفر", yes: "نعم", no: "لا" },
} as const;

const truncate = (value: string, maximum: number): string => {
  const points = [...value];
  return points.length <= maximum ? points.join("") : `${points.slice(0, maximum - 1).join("")}…`;
};

const within = (value: string, maximum: number): boolean => [...value].length <= maximum;

const usefulSpecifications = (values: readonly DirectShareSpecificationProjection[]) => Object.freeze(
  [...values]
    .sort((left, right) => left.position - right.position || (left.displayName < right.displayName ? -1 : left.displayName > right.displayName ? 1 : 0))
    .filter((value) => value.displayName.trim() && within(value.displayName, 80) && (typeof value.value === "boolean" || String(value.value).trim()) && (!value.unit || within(value.unit, 24)))
    .slice(0, DIRECT_SHARE_SPECIFICATION_LIMIT)
    .map((value) => Object.freeze({
      displayName: value.displayName,
      value: typeof value.value === "boolean" ? value.value : truncate(value.value, 160),
      unit: value.unit?.trim() ? value.unit : null,
    })),
);

const safeFileStem = (productCode: string | null, productId: string): string => {
  const candidate = (productCode ?? productId).normalize("NFKD").toLowerCase().replace(/[^a-z0-9]+/gu, "-").replace(/^-|-$/gu, "").slice(0, 60);
  return candidate || "product";
};

export const isDirectShareLocale = (value: string): value is DirectShareLocale => (DIRECT_SHARE_LOCALES as readonly string[]).includes(value);
export const isDirectSharePriceMode = (value: string): value is DirectSharePriceMode => (DIRECT_SHARE_PRICE_MODES as readonly string[]).includes(value);

export const createDirectProductSharePayload = (
  projection: DirectProductShareProjection,
  priceMode: DirectSharePriceMode,
  locale: DirectShareLocale,
  formattedPriceAmount: string,
): DirectProductSharePayload | null => {
  const rawTitle = projection.productName || projection.productCode;
  if (!rawTitle?.trim() || !within(rawTitle, 160) || (projection.productCode !== null && !within(projection.productCode, 160)) || !projection.price || (projection.branch !== null && !within(projection.branch.displayName, 160))) return null;
  const title = rawTitle;
  const productCode = projection.productCode;
  const specifications = usefulSpecifications(projection.specifications);
  const system = labels[locale];
  const lines = [title];
  if (productCode) lines.push(`${system.code}: ${productCode}`);
  if (specifications.length) {
    lines.push("");
    for (const specification of specifications) {
      const value = typeof specification.value === "boolean" ? (specification.value ? system.yes : system.no) : specification.value;
      lines.push(`• ${specification.displayName}: ${value}${specification.unit ? ` ${specification.unit}` : ""}`);
    }
  }
  lines.push("", `${system.price} (${priceMode === "Retail" ? system.retail : system.wholesale}): ${formattedPriceAmount} ${projection.price!.currency}`);
  if (projection.branch) {
    lines.push(`${system.branch}: ${projection.branch.displayName}`);
    lines.push(`${system.availability}: ${projection.branch.availableQuantity > BigInt(0) ? system.inStock : system.outOfStock}`);
  }
  const text = lines.join("\n");
  if ([...text].length > DIRECT_SHARE_TEXT_LIMIT) return null;
  return Object.freeze({
    productId: projection.productId,
    productCode,
    productName: title,
    price: Object.freeze({ mode: priceMode, amountMinor: projection.price!.amountMinor.toString(), currency: projection.price!.currency }),
    ...(projection.branch ? {
      branch: Object.freeze({ displayName: projection.branch.displayName }),
      availability: projection.branch.availableQuantity > BigInt(0) ? "InStock" as const : "OutOfStock" as const,
    } : {}),
    specifications,
    ...(projection.mainMedia ? { mainMedia: Object.freeze({ downloadUrl: `/api/catalog/products/${encodeURIComponent(projection.productId)}/direct-share/media`, contentType: "image/webp" as const, fileName: `${safeFileStem(productCode, projection.productId)}.webp` }) } : {}),
    title,
    text,
  });
};
