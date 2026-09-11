import type { Locale } from "../../../identity/presentation/identity-presentation.types";

const messages = {
  title: { en: "Operations", ar: "العمليات" },
  intro: { en: "Choose an available operational area to get started.", ar: "اختر أحد مجالات العمليات المتاحة للبدء." },
  navigation: { en: "Operational areas", ar: "مجالات العمليات" },
  Branches: { en: "Branches", ar: "الفروع" },
  Inventory: { en: "Inventory", ar: "المخزون" },
  Pricing: { en: "Pricing", ar: "التسعير" },
  loading: { en: "Loading operational areas…", ar: "جارٍ تحميل مجالات العمليات…" },
  retry: { en: "Retry", ar: "إعادة المحاولة" },
  unavailable: { en: "Operational areas could not be loaded. Please try again.", ar: "تعذر تحميل مجالات العمليات. يرجى إعادة المحاولة." },
  empty: { en: "No operational capabilities are available for your current session.", ar: "لا تتوفر قدرات تشغيلية لجلستك الحالية." },
  restricted: { en: "Operations are unavailable in this restricted session.", ar: "العمليات غير متاحة في هذه الجلسة المقيدة." },
  forbidden: { en: "Access to Operations was denied.", ar: "تم رفض الوصول إلى العمليات." },
  expired: { en: "Your session has expired. Returning to sign in…", ar: "انتهت صلاحية جلستك. جارٍ العودة إلى تسجيل الدخول…" },
  BranchesFoundation: { en: "This is the Branches area. Branch workflows are not available here yet.", ar: "هذا مجال الفروع. إجراءات الفروع غير متاحة هنا بعد." },
  InventoryFoundation: { en: "This is the Inventory area. Inventory workflows are not available here yet.", ar: "هذا مجال المخزون. إجراءات المخزون غير متاحة هنا بعد." },
  PricingFoundation: { en: "This is the Pricing area. Pricing workflows are not available here yet.", ar: "هذا مجال التسعير. إجراءات التسعير غير متاحة هنا بعد." },
} as const;

export type OperationsTextKey = keyof typeof messages;
export const operationsText = (locale: Locale, key: OperationsTextKey): string => messages[key][locale];
