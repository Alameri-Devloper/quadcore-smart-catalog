import type { Locale } from "../../identity/presentation/identity-presentation.types";
import type { ReservationFailure } from "./reservation.types";

const messages = {
  title: { en: "Reservations", ar: "الحجوزات" }, selectProduct: { en: "Select a Product to view and manage its Reservations.", ar: "اختر منتجاً لعرض حجوزاته وإدارتها." },
  loadingCollection: { en: "Loading actionable Reservations…", ar: "جارٍ تحميل الحجوزات القابلة للتنفيذ…" }, empty: { en: "No actionable Reservations were found for this Product.", ar: "لا توجد حجوزات قابلة للتنفيذ لهذا المنتج." },
  collection: { en: "Actionable Reservations", ar: "الحجوزات القابلة للتنفيذ" }, detail: { en: "Current Reservation", ar: "الحجز الحالي" },
  loadingDetail: { en: "Loading current Reservation…", ar: "جارٍ تحميل الحجز الحالي…" }, selectReservation: { en: "Select a Reservation to inspect its current state.", ar: "اختر حجزاً لفحص حالته الحالية." },
  reservationId: { en: "Reservation ID", ar: "معرف الحجز" }, status: { en: "Status", ar: "الحالة" }, quantity: { en: "Quantity", ar: "الكمية" },
  remaining: { en: "Remaining quantity", ar: "الكمية المتبقية" }, created: { en: "Created", ar: "أُنشئ" }, updated: { en: "Last updated", ar: "آخر تحديث" },
  Active: { en: "Active", ar: "نشط" }, PartiallyFulfilled: { en: "Partially fulfilled", ar: "منفذ جزئياً" }, Fulfilled: { en: "Fulfilled", ar: "منفذ" }, Released: { en: "Released", ar: "محرر" },
  open: { en: "Open Reservation", ar: "فتح الحجز" }, next: { en: "Next page", ar: "الصفحة التالية" }, firstPage: { en: "Return to first page", ar: "العودة إلى الصفحة الأولى" },
  cursorReset: { en: "The Reservation page position was no longer valid. Page one was reloaded; the selected Reservation was preserved.", ar: "لم يعد موضع صفحة الحجوزات صالحاً. أُعيد تحميل الصفحة الأولى مع الاحتفاظ بالحجز المحدد." },
  Reserve: { en: "Reserve", ar: "حجز" }, Release: { en: "Release", ar: "تحرير" }, Fulfill: { en: "Fulfill", ar: "تنفيذ" }, operations: { en: "Reservation operations", ar: "عمليات الحجز" },
  noActions: { en: "No current Reservation actions are available.", ar: "لا توجد إجراءات متاحة للحجز حالياً." }, inactive: { en: "This Branch is inactive. Known Reservations remain inspectable; new Reserve requests are unavailable and current actions may be rejected by the server.", ar: "هذا الفرع غير نشط. تبقى الحجوزات المعروفة قابلة للفحص، ولا تتوفر طلبات الحجز الجديدة، وقد يرفض الخادم الإجراءات الحالية." },
  reasonCode: { en: "Reason code (optional)", ar: "رمز السبب (اختياري)" }, review: { en: "Review operation", ar: "مراجعة العملية" },
  confirmTitle: { en: "Confirm Reservation operation", ar: "تأكيد عملية الحجز" }, confirm: { en: "Confirm operation", ar: "تأكيد العملية" }, cancel: { en: "Cancel", ar: "إلغاء" },
  pending: { en: "Submitting Reservation operation…", ar: "جارٍ إرسال عملية الحجز…" }, succeeded: { en: "Reservation operation succeeded.", ar: "نجحت عملية الحجز." },
  reviewRequired: { en: "Review the retained command before a deliberate retry. It will not be replayed automatically.", ar: "راجع الأمر المحفوظ قبل إعادة المحاولة عمداً. لن يعاد تلقائياً." },
  reviewed: { en: "I reviewed this retry", ar: "راجعت إعادة المحاولة" }, invalidDraft: { en: "Enter a valid positive Piece quantity.", ar: "أدخل كمية قطع موجبة وصحيحة." },
  mutationOnly: { en: "No Inventory balance or availability was disclosed for this account.", ar: "لم يُكشف رصيد المخزون أو إتاحته لهذا الحساب." },
  availability: { en: "Current availability", ar: "الإتاحة الحالية" }, InStock: { en: "In stock", ar: "متوفر" }, OutOfStock: { en: "Out of stock", ar: "غير متوفر" },
  AuthenticationRequired: { en: "Your session has expired.", ar: "انتهت صلاحية جلستك." }, ForbiddenForRestrictedSession: { en: "Reservation management is unavailable in this restricted session.", ar: "إدارة الحجوزات غير متاحة في هذه الجلسة المقيدة." },
  OriginNotAllowed: { en: "This Reservation request was blocked.", ar: "حُظر طلب الحجز هذا." }, Forbidden: { en: "Access to Reservations was denied.", ar: "رُفض الوصول إلى الحجوزات." },
  unavailableResource: { en: "This Branch, Product, or Reservation is unavailable.", ar: "هذا الفرع أو المنتج أو الحجز غير متاح." }, BranchInactive: { en: "The Branch became inactive. Review current state before retrying.", ar: "أصبح الفرع غير نشط. راجع الحالة الحالية قبل إعادة المحاولة." },
  ProductArchived: { en: "The Product is archived. Reservation mutations are unavailable.", ar: "المنتج مؤرشف. طفرات الحجز غير متاحة." }, InvalidQuantity: { en: "Enter a valid positive Piece quantity.", ar: "أدخل كمية قطع موجبة وصحيحة." },
  InvalidInput: { en: "The Reservation command could not be accepted.", ar: "تعذر قبول أمر الحجز." }, InvalidCursor: { en: "The Reservation page position was invalid.", ar: "موضع صفحة الحجوزات غير صالح." },
  InsufficientAvailableStock: { en: "The Reserve request exceeds available Inventory.", ar: "يتجاوز طلب الحجز المخزون المتاح." }, ReservationNotActive: { en: "The Reservation changed and is no longer actionable for this quantity.", ar: "تغير الحجز ولم يعد قابلاً لهذا الإجراء أو الكمية." },
  InventoryConflict: { en: "Inventory changed elsewhere. Review current Reservation state before retrying.", ar: "تغير المخزون في مكان آخر. راجع حالة الحجز الحالية قبل إعادة المحاولة." },
  IdempotencyConflict: { en: "This operation identifier was used for a different command. Review before retrying.", ar: "استُخدم معرف العملية لأمر مختلف. راجع قبل إعادة المحاولة." },
  unavailable: { en: "Reservations are temporarily unavailable. Reload before continuing.", ar: "الحجوزات غير متاحة مؤقتاً. أعد التحميل قبل المتابعة." }, reload: { en: "Reload Reservations", ar: "إعادة تحميل الحجوزات" },
} as const;
export type ReservationTextKey = keyof typeof messages;
export const reservationText = (locale: Locale, key: ReservationTextKey) => messages[key][locale];
export const reservationFailureText = (locale: Locale, kind: ReservationFailure) => {
  if (kind === "BranchNotFound" || kind === "ProductNotFound" || kind === "ReservationNotFound") return reservationText(locale, "unavailableResource");
  if (kind === "InventoryServiceUnavailable" || kind === "NetworkFailure" || kind === "MalformedResponse" || kind === "UnexpectedResponse") return reservationText(locale, "unavailable");
  return reservationText(locale, kind);
};
