import type { Locale } from "../../../identity/presentation/identity-presentation.types";
import type { WorkspacePricingFailure, WorkspacePricingField } from "./workspace-pricing.types";

const messages = {
  pricesTitle: { en: "Workspace prices", ar: "أسعار مساحة العمل" },
  referenceCostTitle: { en: "Workspace reference cost", ar: "التكلفة المرجعية لمساحة العمل" },
  loading: { en: "Loading authoritative pricing…", ar: "جارٍ تحميل التسعير الموثوق…" },
  selectProduct: { en: "Select a Product to load its authoritative pricing.", ar: "اختر منتجًا لتحميل تسعيره الموثوق." },
  retry: { en: "Retry", ar: "إعادة المحاولة" },
  Retail: { en: "Retail", ar: "التجزئة" },
  Wholesale: { en: "Wholesale", ar: "الجملة" },
  ReferenceCost: { en: "Reference Cost", ar: "التكلفة المرجعية" },
  Configured: { en: "Configured", ar: "مهيأة" },
  NotConfigured: { en: "Not configured", ar: "غير مهيأة" },
  amountMinor: { en: "Amount in minor units", ar: "المبلغ بالوحدات الصغرى" },
  currency: { en: "Currency code", ar: "رمز العملة" },
  revision: { en: "Revision", ar: "المراجعة" },
  Set: { en: "Review Set", ar: "مراجعة التعيين" },
  Clear: { en: "Review Clear", ar: "مراجعة المسح" },
  noActions: { en: "No pricing changes are available.", ar: "لا تتوفر تغييرات للتسعير." },
  confirmTitle: { en: "Review pricing change", ar: "مراجعة تغيير التسعير" },
  product: { en: "Product", ar: "المنتج" },
  field: { en: "Pricing field", ar: "حقل التسعير" },
  action: { en: "Action", ar: "الإجراء" },
  confirm: { en: "Confirm change", ar: "تأكيد التغيير" },
  cancel: { en: "Cancel", ar: "إلغاء" },
  saving: { en: "Saving and refreshing authoritative pricing…", ar: "جارٍ الحفظ وتحديث التسعير الموثوق…" },
  saved: { en: "Pricing was saved and authoritative state was refreshed.", ar: "تم حفظ التسعير وتحديث الحالة الموثوقة." },
  savedRefreshFailed: { en: "The change was accepted, but authoritative pricing could not be refreshed. Retry the read before another change.",
    ar: "قُبل التغيير، لكن تعذر تحديث التسعير الموثوق. أعد القراءة قبل أي تغيير آخر." },
  reviewRequired: { en: "The authoritative state changed. Your safe draft is preserved; review the latest values before confirming again.",
    ar: "تغيرت الحالة الموثوقة. حُفظت مسودتك الآمنة؛ راجع أحدث القيم قبل التأكيد مجددًا." },
  reviewed: { en: "I reviewed the latest values", ar: "راجعت أحدث القيم" },
  invalidAmount: { en: "Enter canonical integer minor units from 0 through the safe integer limit.",
    ar: "أدخل وحدات صغرى صحيحة بالصيغة القياسية من 0 حتى حد العدد الصحيح الآمن." },
  invalidCurrency: { en: "Enter a three-letter uppercase currency code.", ar: "أدخل رمز عملة من ثلاثة أحرف إنجليزية كبيرة." },
} as const;

const failures: Record<WorkspacePricingFailure, { en: string; ar: string }> = {
  AuthenticationRequired: { en: "Your session expired. Returning to sign in…", ar: "انتهت جلستك. جارٍ العودة إلى تسجيل الدخول…" },
  ForbiddenForRestrictedSession: { en: "Pricing is unavailable in this restricted session.", ar: "التسعير غير متاح في هذه الجلسة المقيدة." },
  OriginNotAllowed: { en: "This request origin is not allowed. Reload before retrying.", ar: "مصدر الطلب غير مسموح. أعد التحميل قبل المحاولة." },
  Forbidden: { en: "Access to this pricing resource was denied.", ar: "رُفض الوصول إلى مورد التسعير هذا." },
  ProductNotFound: { en: "This Product is no longer available.", ar: "لم يعد هذا المنتج متاحًا." },
  ProductArchived: { en: "This Product is archived. Review the refreshed read-only state.", ar: "هذا المنتج مؤرشف. راجع الحالة المحدثة للقراءة فقط." },
  InvalidInput: { en: "The pricing request was not accepted. Review the submitted values.", ar: "لم يُقبل طلب التسعير. راجع القيم المرسلة." },
  CurrencyNotAllowed: { en: "The currency is invalid or unavailable for this Workspace.", ar: "العملة غير صالحة أو غير متاحة لمساحة العمل هذه." },
  Conflict: { en: "Pricing changed on the server. Review the refreshed values before retrying.", ar: "تغير التسعير على الخادم. راجع القيم المحدثة قبل المحاولة." },
  BranchProductServiceUnavailable: { en: "The pricing service is unavailable. Please retry.", ar: "خدمة التسعير غير متاحة. يرجى إعادة المحاولة." },
  NetworkFailure: { en: "The pricing service could not be reached. Please retry.", ar: "تعذر الاتصال بخدمة التسعير. يرجى إعادة المحاولة." },
  MalformedResponse: { en: "The pricing response could not be read safely. Please retry.", ar: "تعذرت قراءة استجابة التسعير بأمان. يرجى إعادة المحاولة." },
  UnexpectedResponse: { en: "The pricing service returned an unexpected response.", ar: "أعادت خدمة التسعير استجابة غير متوقعة." },
};

export type WorkspacePricingTextKey = keyof typeof messages;
export const workspacePricingText = (locale: Locale, key: WorkspacePricingTextKey): string => messages[key][locale];
export const workspacePricingFieldText = (locale: Locale, field: WorkspacePricingField): string => messages[field][locale];
export const workspacePricingFailureText = (locale: Locale, failure: WorkspacePricingFailure): string => failures[failure][locale];
