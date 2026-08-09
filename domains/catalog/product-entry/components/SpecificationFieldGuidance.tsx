import type { SpecificationFieldGuidance as Guidance } from "@/domains/catalog/types/specification-field.entity";
import { PRODUCT_ENTRY_PRESENTATION_TEXT } from "../presentation/product-entry-i18n";

interface SpecificationFieldGuidanceProps {
  guidance?: Guidance;
  id: string;
  locale: "en" | "ar";
}

export function SpecificationFieldGuidance({ guidance, id, locale }: SpecificationFieldGuidanceProps) {
  if (!guidance) return null;
  const text = PRODUCT_ENTRY_PRESENTATION_TEXT[locale];
  return (
    <div className="mt-2 space-y-1 text-sm leading-5 text-slate-600" id={id}>
      {guidance.description ? <p>{guidance.description}</p> : null}
      {guidance.inputHint ? <p>{guidance.inputHint}</p> : null}
      <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs">
        {guidance.exampleValue ? <p><span className="font-semibold text-slate-700">{text.example}:</span> {guidance.exampleValue}</p> : null}
        {guidance.unitLabel ? <p><span className="font-semibold text-slate-700">{text.unit}:</span> {guidance.unitLabel}</p> : null}
      </div>
      {guidance.invalidExample ? <p className="text-xs text-slate-500">{guidance.invalidExample}</p> : null}
    </div>
  );
}
