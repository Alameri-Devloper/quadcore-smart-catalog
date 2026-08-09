"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import type { ProductEntryImageReference } from "../../product-entry.types";
import { useProductEntryBrowserMedia } from "../../react/product-entry-media-adapter";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";
import { productEntryImagesService } from "../../services/product-entry-images.service";
import { PRODUCT_ENTRY_PRESENTATION_TEXT, type ProductEntryPresentationText } from "../../presentation/product-entry-i18n";

const buttonClass = "min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:opacity-45";
const ACCEPT = "image/jpeg,image/png,image/webp";

const sourceLabel = (image: ProductEntryImageReference, text: ProductEntryPresentationText): string => {
  if (image.operationType === null) return text.existingServerImage;
  if (image.operationType === "Remove") return text.markedForRemoval;
  if (image.sourceAvailability === "RequiresReselection") return text.requiresReselection;
  if (image.hashStatus === "Hashing") return text.computingSecureHash;
  if (image.hashStatus === "Ready") return text.readyToUpload;
  if (image.hashStatus === "Failed") return text.sourceVerificationFailed;
  return text.waitingForVerification;
};

export function ProductImagesStep({ locale }: { readonly locale: "en" | "ar" }) {
  const workflow = useProductEntryWorkflow();
  const media = useProductEntryBrowserMedia();
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  const imagesRef = useRef(workflow.values.images);
  useEffect(() => { imagesRef.current = workflow.values.images; }, [workflow.values.images]);
  const [announcement, setAnnouncement] = useState("");
  const [issue, setIssue] = useState<string | null>(null);

  const updateImages = (images: ProductEntryImageReference[]) => {
    imagesRef.current = images;
    void workflow.setValue("images", images);
  };

  const hashSelected = async (operationId: string, file: File) => {
    updateImages(productEntryImagesService.markHashing(imagesRef.current, operationId));
    const result = await media.select(operationId, file);
    if (result.type === "Hashed") {
      const applied = productEntryImagesService.applyHash(
        imagesRef.current,
        operationId,
        result.sha256,
        result.byteLength,
      );
      updateImages(applied.images);
      if (!applied.matchedPersistedSource) setIssue(text.selectedFileMismatch);
      else setAnnouncement(`${file.name} ${text.fileReadySuffix}`);
      return;
    }
    if (result.code !== "MEDIA_HASH_CANCELLED") {
      updateImages(productEntryImagesService.markHashFailed(imagesRef.current, operationId, result.code));
      setIssue(text.secureHashUnavailable);
    }
  };

  const addFiles = (files: readonly File[]) => {
    setIssue(null);
    const candidates = files.filter((file) => {
      if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
        setIssue(`${file.name}: ${text.invalidImageType}`);
        return false;
      }
      if (file.size <= 0 || file.size > 10 * 1024 * 1024) {
        setIssue(`${file.name}: ${text.invalidImageSize}`);
        return false;
      }
      return true;
    });
    const before = imagesRef.current;
    const next = productEntryImagesService.add(before, candidates.map((file) => ({
      fileName: file.name,
      mimeType: file.type,
      byteLength: file.size,
    })));
    updateImages(next);
    const added = next.filter((image) => image.operationType === "Add" &&
      !before.some((existing) => existing.operationId === image.operationId));
    added.forEach((image, index) => {
      const file = candidates[index];
      if (image.operationId && file) void hashSelected(image.operationId, file);
    });
  };

  const replace = (image: ProductEntryImageReference, file: File) => {
    const next = productEntryImagesService.replace(imagesRef.current, image.id, {
      fileName: file.name,
      mimeType: file.type,
      byteLength: file.size,
    });
    updateImages(next);
    const replacement = next.find((candidate) =>
      (image.operationId !== null && candidate.operationId === image.operationId) ||
      (image.mediaId !== null && candidate.mediaId === image.mediaId) ||
      candidate.id === image.id,
    );
    if (replacement?.operationId) void hashSelected(replacement.operationId, file);
  };

  const visible = workflow.values.images
    .filter((image) => image.operationType !== "Remove")
    .sort((left, right) => left.sortOrder - right.sortOrder);

  return (
    <div>
      <h2 className="text-2xl font-semibold text-slate-950" id="product-entry-step-heading">{text.productMedia}</h2>
      <p className="mt-2 text-sm leading-6 text-slate-600">{text.productMediaDescription}</p>
      <label className="mt-6 inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white focus-within:ring-4 focus-within:ring-blue-200">
        {text.addImages}
        <input accept={ACCEPT} className="sr-only" multiple onChange={(event) => {
          addFiles(Array.from(event.target.files ?? []));
          event.target.value = "";
        }} type="file" />
      </label>
      <p className="mt-2 text-xs text-slate-600">{text.imageFileRules}</p>
      {issue ? <p className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-800" role="alert">{issue}</p> : null}
      <p aria-live="polite" className="sr-only">{announcement}</p>

      {visible.length === 0 ? (
        <div className="mt-6 rounded-2xl border border-dashed border-slate-300 p-8 text-center text-sm text-slate-600">{text.noMedia}</div>
      ) : (
        <ol className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {visible.map((image, index) => {
            const preview = image.operationId ? media.previewUrl(image.operationId) : null;
            const label = image.fileName ?? `${text.serverImage} ${image.mediaId ?? index + 1}`;
            return (
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4" key={image.id}>
                <div className="flex aspect-video items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {preview ? <Image alt={`${text.previewOf} ${label}`} className="h-full w-full object-contain" height={360} src={preview} unoptimized width={640} /> : <span className="px-4 text-center text-sm text-slate-500">{image.mediaId ? text.serverPreviewUnavailable : text.selectSourceAgain}</span>}
                </div>
                <div className="mt-3 flex items-start justify-between gap-3">
                  <div className="min-w-0"><p className="truncate text-sm font-semibold text-slate-950">{label}</p><p className="mt-1 text-xs text-slate-600">{sourceLabel(image, text)}</p></div>
                  {image.isPrimary ? <span className="rounded-full bg-emerald-100 px-2 py-1 text-xs font-semibold text-emerald-900">{text.cover}</span> : null}
                </div>
                {image.sourceErrorCode ? <p className="mt-2 text-xs font-medium text-red-700">{text.sourceVerificationFailed}</p> : null}
                <div className="mt-4 grid grid-cols-2 gap-2" aria-label={`${text.mediaControlsFor} ${label}`}>
                  <button className={buttonClass} disabled={index === 0} onClick={() => updateImages(productEntryImagesService.move(imagesRef.current, image.id, -1))} type="button">{text.moveUp}</button>
                  <button className={buttonClass} disabled={index === visible.length - 1} onClick={() => updateImages(productEntryImagesService.move(imagesRef.current, image.id, 1))} type="button">{text.moveDown}</button>
                  <button aria-label={`${text.setCover}: ${label}`} className={buttonClass} disabled={image.isPrimary} onClick={() => updateImages(productEntryImagesService.setPrimary(imagesRef.current, image.id))} type="button">{text.setCover}</button>
                  <label className={`${buttonClass} inline-flex cursor-pointer items-center justify-center`}>
                    {text.replace}
                    <input accept={ACCEPT} className="sr-only" onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) replace(image, file);
                      event.target.value = "";
                    }} type="file" />
                  </label>
                  <button className={`${buttonClass} col-span-2 border-red-300 text-red-800`} onClick={() => {
                    if (image.operationId) media.remove(image.operationId);
                    updateImages(productEntryImagesService.remove(imagesRef.current, image.id));
                    setAnnouncement(`${label} ${text.removedSuffix}`);
                  }} type="button">{text.remove} {label}</button>
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
