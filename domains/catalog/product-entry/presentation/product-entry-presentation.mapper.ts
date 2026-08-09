import type { SubmitProductEntryCommand } from "../application/product-entry-command";
import type {
  ProductEntryLocalDraftFormState,
  ProductEntryLocalDraftIdentity,
  ProductEntryLocalDraftSaveInput,
} from "../drafts/product-entry-local-draft.types";
import { createInitialProductEntryState, type ProductEntryValues } from "../product-entry.types";
import { ProductEntryImagesService } from "../services/product-entry-images.service";
import type { ProductEntryProductView, ProductEntryTrustedClientContext } from "./product-entry-presentation.types";

const amountMinor = (value: number | null): number | null => value === null
  ? null
  : Math.round(value * 100);
const amountMajor = (value: { readonly amountMinor: number } | null): number | null => value
  ? value.amountMinor / 100
  : null;

export const productEntryValuesToLocalForm = (
  values: Readonly<ProductEntryValues>,
  catalogId: string,
): ProductEntryLocalDraftFormState => ({
  catalogId,
  departmentId: values.departmentId,
  categoryId: values.categoryId,
  productTypeId: values.productTypeId,
  deviceClassId: values.deviceClassId,
  brandId: values.brandId,
  productModelId: values.productModelId,
  conditionId: values.condition,
  availabilityStatusId: values.availabilityStatus,
  productName: values.productName || null,
  productCode: values.productCode || null,
  wholesalePrice: values.wholesalePrice === null ? null : {
    amountMinor: amountMinor(values.wholesalePrice)!,
    currency: values.currency,
  },
  retailPrice: values.retailPrice === null ? null : {
    amountMinor: amountMinor(values.retailPrice)!,
    currency: values.currency,
  },
  isHighlighted: values.isFeatured,
  publicationIntent: values.publicationIntent,
  specificationValues: Object.entries(values.specificationValues).map(([specificationFieldId, value]) => ({
    specificationFieldId,
    value,
  })),
});

export const productEntryLocalFormToValues = (
  form: ProductEntryLocalDraftFormState,
  images: ProductEntryValues["images"],
): ProductEntryValues => ({
  ...createInitialProductEntryState(),
  departmentId: form.departmentId,
  categoryId: form.categoryId,
  productTypeId: form.productTypeId,
  deviceClassId: form.deviceClassId,
  brandId: form.brandId,
  productModelId: form.productModelId,
  condition: form.conditionId as ProductEntryValues["condition"],
  availabilityStatus: form.availabilityStatusId as ProductEntryValues["availabilityStatus"],
  productName: form.productName ?? "",
  productCode: form.productCode ?? "",
  wholesalePrice: amountMajor(form.wholesalePrice),
  retailPrice: amountMajor(form.retailPrice),
  currency: form.retailPrice?.currency ?? form.wholesalePrice?.currency ?? "",
  isFeatured: form.isHighlighted,
  publicationIntent: form.publicationIntent,
  specificationValues: Object.fromEntries(form.specificationValues.map((value) => [
    value.specificationFieldId,
    value.value,
  ])),
  images,
});

export const productEntryProductToValues = (
  product: ProductEntryProductView,
  imagesService = new ProductEntryImagesService(),
): ProductEntryValues => ({
  ...createInitialProductEntryState(),
  categoryId: product.classification?.categoryId ?? null,
  productTypeId: product.classification?.productTypeId ?? null,
  deviceClassId: product.classification?.deviceClassId ?? null,
  condition: product.classification?.conditionId as ProductEntryValues["condition"] ?? null,
  availabilityStatus: product.classification?.availabilityStatusId as ProductEntryValues["availabilityStatus"] ?? null,
  brandId: product.commercialDetails?.brandId ?? null,
  productModelId: product.commercialDetails?.productModelId ?? null,
  productName: product.commercialDetails?.productName ?? "",
  productCode: product.commercialDetails?.productCode ?? "",
  wholesalePrice: amountMajor(product.commercialDetails?.wholesalePrice ?? null),
  retailPrice: amountMajor(product.commercialDetails?.retailPrice ?? null),
  currency: product.commercialDetails?.retailPrice?.currency ?? product.commercialDetails?.wholesalePrice?.currency ?? "",
  isFeatured: product.commercialDetails?.isHighlighted ?? false,
  publicationIntent: product.lifecycleState === "Published" ? "PublishWhenReady" : "SaveAsDraft",
  specificationValues: Object.fromEntries(product.specificationValues.map((value) => [value.specificationFieldId, value.value])),
  images: imagesService.createExisting(product.images),
});

export const buildProductEntryLocalDraftSaveInput = (
  identity: ProductEntryLocalDraftIdentity,
  values: Readonly<ProductEntryValues>,
  context: ProductEntryTrustedClientContext,
  imagesService = new ProductEntryImagesService(),
): ProductEntryLocalDraftSaveInput => ({
  identity,
  formState: productEntryValuesToLocalForm(values, context.catalogId),
  mediaDescriptors: imagesService.toLocalDraftDescriptors(values.images),
});

export const buildSubmitProductEntryCommand = (
  identity: ProductEntryLocalDraftIdentity,
  values: Readonly<ProductEntryValues>,
  context: ProductEntryTrustedClientContext,
): SubmitProductEntryCommand => ({
  submissionId: identity.submissionId,
  mode: identity.mode,
  ...(identity.mode === "Edit" ? {
    productId: identity.productId,
    expectedProductRevision: identity.baseProductRevision,
  } : {}),
  draft: {
    ...(identity.mode === "Create" ? { catalogId: context.catalogId } : {}),
    classification: {
      categoryId: values.categoryId,
      productTypeId: values.productTypeId,
      deviceClassId: values.deviceClassId,
      conditionId: values.condition,
      availabilityStatusId: values.availabilityStatus,
    },
    commercialDetails: {
      productName: values.productName.trim() || null,
      productCode: values.productCode.trim() || null,
      productModelId: values.productModelId,
      brandId: values.brandId,
      isHighlighted: values.isFeatured,
      pricing: {
        wholesalePrice: values.wholesalePrice === null ? null : { amountMinor: amountMinor(values.wholesalePrice)!, currency: values.currency },
        retailPrice: values.retailPrice === null ? null : { amountMinor: amountMinor(values.retailPrice)!, currency: values.currency },
      },
    },
    specificationValues: Object.entries(values.specificationValues).map(([specificationFieldId, value]) => ({
      specificationFieldId,
      value,
    })),
  },
  mediaOperations: new ProductEntryImagesService().toLocalDraftDescriptors(values.images).map((descriptor) => ({
    operationId: descriptor.operationId,
    operationType: descriptor.operationType,
    sequence: descriptor.sequence,
    mediaId: descriptor.mediaId,
    requestedDisplayOrder: descriptor.requestedDisplayOrder,
    selectedAsCover: descriptor.selectedAsCover,
    expectedSourceSha256: descriptor.expectedSourceSha256,
    expectedSourceByteLength: descriptor.expectedSourceByteLength,
    finalOrder: descriptor.finalOrder,
  })),
});
