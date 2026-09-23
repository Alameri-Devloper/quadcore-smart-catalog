import type { Locale } from "../../identity/presentation/identity-presentation.types";
import type { InventoryFailure } from "./inventory.types";

const messages = {
  title: { en: "Inventory", ar: "المخزون" },
  selectProduct: { en: "Select a Product to inspect its Inventory.", ar: "اختر منتجاً لفحص مخزونه." },
  loading: { en: "Loading current Inventory…", ar: "جارٍ تحميل المخزون الحالي…" },
  current: { en: "Current Inventory", ar: "المخزون الحالي" },
  availability: { en: "Availability", ar: "الإتاحة" }, InStock: { en: "In stock", ar: "متوفر" }, OutOfStock: { en: "Out of stock", ar: "غير متوفر" },
  available: { en: "Available", ar: "المتاح" }, onHand: { en: "On hand", ar: "الموجود" }, reserved: { en: "Reserved", ar: "المحجوز" }, damaged: { en: "Damaged", ar: "التالف" },
  unit: { en: "Unit", ar: "الوحدة" }, Piece: { en: "Piece", ar: "قطعة" }, revision: { en: "Revision", ar: "المراجعة" }, updated: { en: "Last updated", ar: "آخر تحديث" },
  forbiddenRead: { en: "Balance is not available for this account. Authorized Inventory operations remain available below.", ar: "الرصيد غير متاح لهذا الحساب. تبقى عمليات المخزون المخولة متاحة أدناه." },
  mutationOnly: { en: "The operation succeeded. No Inventory balance was disclosed for this account.", ar: "نجحت العملية. لم يُكشف رصيد المخزون لهذا الحساب." },
  inspection: { en: "This Branch is inactive. The known Inventory resource can be inspected, but new mutations are unavailable.", ar: "هذا الفرع غير نشط. يمكن فحص مورد المخزون المعروف، لكن الطفرات الجديدة غير متاحة." },
  operations: { en: "Inventory operations", ar: "عمليات المخزون" }, noOperations: { en: "No basic Inventory operations are available for this account.", ar: "لا تتوفر عمليات مخزون أساسية لهذا الحساب." },
  Receive: { en: "Receive", ar: "استلام" }, Issue: { en: "Issue", ar: "صرف" }, CorrectIncrease: { en: "Correct increase", ar: "تصحيح بالزيادة" },
  CorrectDecrease: { en: "Correct decrease", ar: "تصحيح بالنقص" }, MarkDamaged: { en: "Mark damaged", ar: "تعيين كتالف" }, RestoreDamaged: { en: "Restore damaged", ar: "استعادة التالف" },
  quantity: { en: "Quantity", ar: "الكمية" }, reasonCode: { en: "Reason code", ar: "رمز السبب" }, optionalReason: { en: "Reason code (optional)", ar: "رمز السبب (اختياري)" },
  note: { en: "Note (optional)", ar: "ملاحظة (اختيارية)" }, review: { en: "Review operation", ar: "مراجعة العملية" }, confirmTitle: { en: "Confirm Inventory operation", ar: "تأكيد عملية المخزون" },
  confirm: { en: "Confirm operation", ar: "تأكيد العملية" }, cancel: { en: "Cancel", ar: "إلغاء" }, retry: { en: "Reload Inventory", ar: "إعادة تحميل المخزون" },
  pending: { en: "Submitting Inventory operation…", ar: "جارٍ إرسال عملية المخزون…" }, succeeded: { en: "Inventory operation succeeded.", ar: "نجحت عملية المخزون." },
  reviewRequired: { en: "Review the retained command before a deliberate retry. It will not be replayed automatically.", ar: "راجع الأمر المحفوظ قبل إعادة المحاولة عمداً. لن يعاد تلقائياً." },
  reviewed: { en: "I reviewed this retry", ar: "راجعت إعادة المحاولة" }, invalidDraft: { en: "Enter a positive quantity and the required correction reason.", ar: "أدخل كمية موجبة وسبب التصحيح المطلوب." },
  AuthenticationRequired: { en: "Your session has expired.", ar: "انتهت صلاحية جلستك." }, ForbiddenForRestrictedSession: { en: "Inventory management is unavailable in this restricted session.", ar: "إدارة المخزون غير متاحة في هذه الجلسة المقيدة." },
  OriginNotAllowed: { en: "This Inventory request was blocked.", ar: "حُظر طلب المخزون هذا." }, Forbidden: { en: "Access to this Inventory resource was denied.", ar: "رُفض الوصول إلى مورد المخزون هذا." },
  unavailableResource: { en: "This Branch or Product is unavailable.", ar: "هذا الفرع أو المنتج غير متاح." }, BranchInactive: { en: "The Branch became inactive. Review its current state before continuing.", ar: "أصبح الفرع غير نشط. راجع حالته الحالية قبل المتابعة." },
  ProductArchived: { en: "The Product is archived. Inventory mutations are unavailable.", ar: "المنتج مؤرشف. طفرات المخزون غير متاحة." }, InvalidQuantity: { en: "Enter a valid positive Piece quantity.", ar: "أدخل كمية قطع موجبة وصحيحة." },
  InvalidInput: { en: "The Inventory command could not be accepted.", ar: "تعذر قبول أمر المخزون." }, InsufficientAvailableStock: { en: "The operation exceeds the available Inventory state.", ar: "تتجاوز العملية حالة المخزون المتاحة." },
  InventoryConflict: { en: "Inventory changed elsewhere. Review current state before retrying.", ar: "تغير المخزون في مكان آخر. راجع الحالة الحالية قبل إعادة المحاولة." },
  IdempotencyConflict: { en: "This operation identifier was already used for a different command. Review before retrying.", ar: "استُخدم معرف العملية لأمر مختلف. راجع قبل إعادة المحاولة." },
  unavailable: { en: "Inventory is temporarily unavailable. Reload before continuing.", ar: "المخزون غير متاح مؤقتاً. أعد التحميل قبل المتابعة." },
} as const;
export type InventoryTextKey = keyof typeof messages;
export const inventoryText = (locale: Locale, key: InventoryTextKey) => messages[key][locale];
export const inventoryFailureText = (locale: Locale, kind: InventoryFailure) => {
  if (kind === "BranchNotFound" || kind === "ProductNotFound") return inventoryText(locale, "unavailableResource");
  if (kind === "InventoryServiceUnavailable" || kind === "NetworkFailure" || kind === "MalformedResponse" || kind === "UnexpectedResponse")
    return inventoryText(locale, "unavailable");
  return inventoryText(locale, kind);
};
