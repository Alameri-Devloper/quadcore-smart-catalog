"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import type { ProductEntryImageReference } from "../../product-entry.types";
import { useProductEntryWorkflow } from "../../react/product-entry-workflow-adapter";
import { productEntryImagesService } from "../../services/product-entry-images.service";

const buttonClass = "min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200 disabled:cursor-not-allowed disabled:opacity-50";

const formatSize = (bytes: number) =>
  bytes < 1024 * 1024 ? `${Math.ceil(bytes / 1024)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

const statusText = (image: ProductEntryImageReference) => {
  if (image.previewAvailability === "reselection-required") return "Select this image again to restore its preview.";
  switch (image.processingStatus) {
    case "pending": return "Ready for background processing";
    case "processing": return "Preparing white-background version...";
    case "ready": return "Processed version ready for review";
    case "failed": return "Background processing failed. You can keep the Original image.";
    case "skipped": return "Original image will be used";
  }
};

export function ProductImagesStep() {
  const { setValue, values } = useProductEntryWorkflow();
  const imagesRef = useRef(values.images);
  const cardRefs = useRef(new Map<string, HTMLLIElement>());
  const [selectionIssues, setSelectionIssues] = useState<string[]>([]);
  const [announcement, setAnnouncement] = useState("");
  const [unavailablePreviews, setUnavailablePreviews] = useState<Set<string>>(() => new Set());
  const orderedImages = [...values.images].sort((left, right) => left.sortOrder - right.sortOrder);

  const updateImages = (images: ProductEntryImageReference[]) => {
    imagesRef.current = images;
    void setValue("images", images);
  };
  const replaceImage = (next: ProductEntryImageReference) => {
    updateImages(imagesRef.current.map((image) => image.id === next.id ? next : image));
  };
  const selectFiles = (files: File[]) => {
    const result = productEntryImagesService.createReferences(files, imagesRef.current);
    setSelectionIssues(result.issues.map((issue) => `${issue.fileName}: ${issue.message}`));
    if (result.images.length === 0) return;
    const replacements = new Map(result.images.map((image) => [image.id, image]));
    const restoredIds = new Set(imagesRef.current.map((image) => image.id));
    const next = imagesRef.current.map((image) => replacements.get(image.id) ?? image);
    next.push(...result.images.filter((image) => !restoredIds.has(image.id)));
    updateImages(next);
    setAnnouncement(`${result.images.length} image${result.images.length === 1 ? "" : "s"} added or restored.`);
  };
  const removeImage = (image: ProductEntryImageReference) => {
    const before = [...imagesRef.current].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = before.findIndex((candidate) => candidate.id === image.id);
    const nextImages = productEntryImagesService.remove(before, image.id);
    updateImages(nextImages);
    setAnnouncement(`${image.fileName} removed.`);
    const focusId = nextImages[Math.min(index, nextImages.length - 1)]?.id;
    if (focusId) requestAnimationFrame(() => cardRefs.current.get(focusId)?.focus());
  };

  return (
    <div>
      <h2 id="product-entry-step-heading" className="text-2xl font-semibold tracking-tight text-slate-950">Add product images</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Add clear product images, choose the main image, and prepare them for a consistent Catalog appearance.</p>

      <div className="mt-6 rounded-2xl border border-dashed border-blue-300 bg-blue-50 p-5">
        <label className="inline-flex min-h-12 cursor-pointer items-center rounded-xl bg-blue-600 px-5 text-sm font-semibold text-white focus-within:ring-4 focus-within:ring-blue-200">
          Choose Images
          <input
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            multiple
            onChange={(event) => {
              selectFiles(Array.from(event.target.files ?? []));
              event.target.value = "";
            }}
            type="file"
          />
        </label>
        <p className="mt-3 text-sm text-slate-700">Choose JPG, PNG, or WebP files. You can select more than one image.</p>
        {selectionIssues.length > 0 ? <ul className="mt-3 space-y-1 text-sm font-medium text-red-800" role="alert">{selectionIssues.map((issue) => <li key={issue}>{issue}</li>)}</ul> : null}
      </div>

      <p aria-live="polite" className="sr-only">{announcement}</p>

      {orderedImages.length === 0 ? (
        <div className="mt-6 rounded-xl bg-slate-100 p-4 text-sm text-slate-700">
          <p className="font-semibold text-slate-900">No product images have been added.</p>
          <p className="mt-1">Images are optional for now. Add clear photos to improve Catalog presentation.</p>
        </div>
      ) : (
        <ol className="mt-7 grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3" aria-label="Selected product images">
          {orderedImages.map((image, index) => {
            const previewKey = `${image.id}-${image.selectedDisplayVersion}`;
            const previewUrl = image.selectedDisplayVersion === "processed" && image.processedPreviewUrl ? image.processedPreviewUrl : image.originalPreviewUrl;
            const previewUnavailable = image.previewAvailability === "reselection-required" || !previewUrl || unavailablePreviews.has(previewKey);
            const canUseProcessed = image.processingStatus === "ready" && Boolean(image.processedPreviewUrl);

            return (
              <li className="rounded-2xl border border-slate-200 bg-slate-50 p-4 focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-blue-200" key={image.id} ref={(node) => { if (node) cardRefs.current.set(image.id, node); else cardRefs.current.delete(image.id); }} tabIndex={-1}>
                <div className="relative mx-auto aspect-square w-full max-w-64 overflow-hidden rounded-xl border border-slate-200 bg-white">
                  {previewUnavailable ? <div className="flex h-full items-center justify-center p-4 text-center text-sm text-slate-600">This image was added in a previous session. Select the file again to restore its preview.</div> : <Image alt={`${image.fileName} selected product image preview`} className="object-contain" fill onError={() => setUnavailablePreviews((current) => new Set(current).add(previewKey))} sizes="(min-width: 1280px) 20rem, (min-width: 768px) 50vw, 100vw" src={previewUrl} unoptimized />}
                  <span className="absolute left-2 top-2 rounded-full bg-slate-950/85 px-2 py-1 text-xs font-semibold text-white">{image.selectedDisplayVersion === "processed" ? "Processed" : "Original"}</span>
                  {image.isPrimary ? <span className="absolute right-2 top-2 rounded-full bg-emerald-800 px-2 py-1 text-xs font-semibold text-white">Main Product Image</span> : null}
                </div>

                <p className="mt-3 break-all text-sm font-semibold text-slate-900">{image.fileName}</p>
                {image.previewAvailability === "reselection-required" ? <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-950"><p className="font-semibold">Requires Reselection</p><p className="mt-1">This image is not uploaded or permanently stored.</p><label className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-lg border border-amber-300 bg-white px-3 font-semibold focus-within:ring-4 focus-within:ring-amber-200">Reselect Image<input accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(event) => { selectFiles(Array.from(event.target.files ?? [])); event.target.value = ""; }} type="file" /></label></div> : null}
                <dl className="mt-2 grid grid-cols-2 gap-2 text-xs text-slate-600"><div><dt>File type</dt><dd className="font-semibold text-slate-800">{image.mimeType}</dd></div><div><dt>File size</dt><dd className="font-semibold text-slate-800">{formatSize(image.sizeBytes)}</dd></div><div><dt>Display version</dt><dd className="font-semibold capitalize text-slate-800">{image.selectedDisplayVersion}</dd></div><div><dt>Main image</dt><dd className="font-semibold text-slate-800">{image.isPrimary ? "Selected" : "Not selected"}</dd></div></dl>

                <div className="mt-4 grid grid-cols-2 gap-2" aria-label={`Ordering and image actions for ${image.fileName}`}>
                  <button className={buttonClass} disabled={index === 0} onClick={() => { updateImages(productEntryImagesService.move(imagesRef.current, image.id, -1)); setAnnouncement(`${image.fileName} moved earlier.`); }} type="button">Move Earlier</button>
                  <button className={buttonClass} disabled={index === orderedImages.length - 1} onClick={() => { updateImages(productEntryImagesService.move(imagesRef.current, image.id, 1)); setAnnouncement(`${image.fileName} moved later.`); }} type="button">Move Later</button>
                  <button className={buttonClass} disabled={image.isPrimary} onClick={() => { updateImages(productEntryImagesService.setPrimary(imagesRef.current, image.id)); setAnnouncement(`${image.fileName} is now the Main Product Image.`); }} type="button">Make Main Image</button>
                  <button className={`${buttonClass} border-red-300 text-red-800`} onClick={() => removeImage(image)} type="button">Remove Image</button>
                </div>

                <section className="mt-5 rounded-xl border border-slate-200 bg-white p-4" aria-labelledby={`background-${image.id}`}>
                  <h3 className="text-sm font-semibold text-slate-900" id={`background-${image.id}`}>White-background version</h3>
                  <p className="mt-1 text-sm text-slate-600">Optional. Your Original image always remains available.</p>
                  <p className="mt-3 text-sm font-semibold text-slate-800">{statusText(image)}</p>

                  {canUseProcessed ? <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2" aria-label="Compare Original and Processed versions">{[{ label: "Original", url: image.originalPreviewUrl }, { label: "Processed", url: image.processedPreviewUrl! }].map((preview) => <figure key={preview.label}><div className="relative aspect-square overflow-hidden rounded-lg border border-slate-200 bg-white"><Image alt={`${image.fileName} ${preview.label} version`} className="object-contain" fill sizes="10rem" src={preview.url} unoptimized /></div><figcaption className="mt-2 text-xs font-semibold text-slate-700">{preview.label}</figcaption></figure>)}</div> : null}
                  <p className="mt-3 text-xs leading-5 text-slate-600">Prepare White Background creates a customer-ready copy with a clean white background. Available in a Future Version.</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <button className={buttonClass} disabled={!productEntryImagesService.isProcessingAvailable()} title="Available in a Future Version" type="button">Prepare White Background</button>
                    {canUseProcessed ? <button className={buttonClass} disabled={image.selectedDisplayVersion === "processed"} onClick={() => replaceImage(productEntryImagesService.useProcessed(image))} type="button">Use Processed Image</button> : null}
                    {canUseProcessed ? <button className={buttonClass} disabled={image.selectedDisplayVersion === "original"} onClick={() => replaceImage(productEntryImagesService.useOriginal(image))} type="button">Keep Original Image</button> : null}
                    {image.processingStatus !== "processing" ? <button className={buttonClass} onClick={() => replaceImage(productEntryImagesService.skip(image))} type="button">Use Original Image</button> : null}
                  </div>
                  <p className="mt-2 text-xs text-slate-600">Use Original Image keeps this image as uploaded without background changes.</p>
                  {!productEntryImagesService.isProcessingAvailable() ? <p className="mt-2 text-xs font-medium text-slate-600">Prepare White Background: Available in a Future Version</p> : null}
                </section>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
