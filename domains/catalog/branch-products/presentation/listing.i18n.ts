import type { Locale } from "../../../identity/presentation/identity-presentation.types";
const messages = {
  title: { en: "Product listing", ar: "إدراج المنتج" },
  selectProduct: { en: "Select a Product to inspect its Branch listing.", ar: "اختر منتجاً لفحص إدراجه في الفرع." },
  loading: { en: "Loading current listing…", ar: "جارٍ تحميل حالة الإدراج الحالية…" },
  current: { en: "Current listing", ar: "حالة الإدراج الحالية" },
  updated: { en: "Last updated", ar: "آخر تحديث" },
  NotConfigured: { en: "Not configured", ar: "غير مهيأ" }, Listed: { en: "Listed", ar: "مدرج" }, Unlisted: { en: "Unlisted", ar: "غير مدرج" },
  SetListed: { en: "Set Listed", ar: "تعيين كمدرج" }, SetUnlisted: { en: "Set Unlisted", ar: "تعيين كغير مدرج" },
  noActions: { en: "No listing changes are available for this resource.", ar: "لا تتوفر تغييرات إدراج لهذا المورد." },
  inspection: { en: "This Branch is inactive. The existing listing can be inspected; new Product discovery and changes are unavailable.", ar: "هذا الفرع غير نشط. يمكن فحص الإدراج القائم، ولا يتوفر اكتشاف منتجات جديد أو إجراء تغييرات." },
  confirmTitle: { en: "Review listing change", ar: "مراجعة تغيير الإدراج" },
  requested: { en: "Requested action", ar: "الإجراء المطلوب" },
  confirm: { en: "Confirm change", ar: "تأكيد التغيير" }, cancel: { en: "Cancel", ar: "إلغاء" }, retry: { en: "Reload current listing", ar: "إعادة تحميل الإدراج الحالي" },
  saving: { en: "Saving and refreshing listing…", ar: "جارٍ حفظ الإدراج وتحديثه…" },
  saved: { en: "Listing change saved. Current state refreshed.", ar: "تم حفظ تغيير الإدراج وتحديث الحالة الحالية." },
  savedRefreshFailed: { en: "The change was saved, but current state could not be refreshed. Reload before another action.", ar: "تم حفظ التغيير، لكن تعذر تحديث الحالة الحالية. أعد التحميل قبل إجراء آخر." },
  reviewRequired: { en: "Your requested action is retained. Review the latest state before confirming again.", ar: "حُفظ الإجراء المطلوب. راجع أحدث حالة قبل التأكيد مجدداً." },
  reviewed: { en: "I reviewed the latest state", ar: "راجعت أحدث حالة" },
  AuthenticationRequired: { en: "Your session has expired.", ar: "انتهت صلاحية جلستك." },
  ForbiddenForRestrictedSession: { en: "Listing management is unavailable in this restricted session.", ar: "إدارة الإدراج غير متاحة في هذه الجلسة المقيدة." },
  OriginNotAllowed: { en: "This listing request was blocked.", ar: "حُظر طلب الإدراج هذا." },
  Forbidden: { en: "Access to this listing was denied.", ar: "رُفض الوصول إلى هذا الإدراج." },
  unavailableResource: { en: "This Branch or Product is unavailable.", ar: "هذا الفرع أو المنتج غير متاح." },
  BranchInactive: { en: "The Branch became inactive. Review its current listing.", ar: "أصبح الفرع غير نشط. راجع حالة إدراجه الحالية." },
  ProductArchived: { en: "The Product is archived. Listing changes are unavailable.", ar: "المنتج مؤرشف. تغييرات الإدراج غير متاحة." },
  InvalidInput: { en: "The listing request could not be accepted. Review the current state.", ar: "تعذر قبول طلب الإدراج. راجع الحالة الحالية." },
  Conflict: { en: "This listing changed elsewhere. Review the latest state before retrying.", ar: "تغير هذا الإدراج في مكان آخر. راجع أحدث حالة قبل إعادة المحاولة." },
  unavailable: { en: "Listing is temporarily unavailable. Reload current state to continue.", ar: "الإدراج غير متاح مؤقتاً. أعد تحميل الحالة الحالية للمتابعة." },
} as const;
export type ListingTextKey = keyof typeof messages;
export const listingText = (locale: Locale, key: ListingTextKey) => messages[key][locale];
export const listingFailureText = (locale: Locale, kind: import("./listing.types").ListingFailure) => {
  if (kind === "BranchNotFound" || kind === "ProductNotFound") return listingText(locale, "unavailableResource");
  if (kind === "BranchProductServiceUnavailable" || kind === "NetworkFailure" || kind === "MalformedResponse" || kind === "UnexpectedResponse") return listingText(locale, "unavailable");
  return listingText(locale, kind);
};
