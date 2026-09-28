import type { Locale } from "../../identity/presentation/identity-presentation.types";
import type { TransferFailure } from "./transfer.types";

const messages = {
  title: { en: "Inventory Transfer", ar: "تحويل المخزون" },
  destinationBranch: { en: "Destination Branch", ar: "الفرع الوجهة" },
  sourceBranch: { en: "Source Branch", ar: "الفرع المصدر" },
  product: { en: "Product", ar: "المنتج" }, quantity: { en: "Quantity", ar: "الكمية" },
  reasonCode: { en: "Reason Code (optional)", ar: "رمز السبب (اختياري)" },
  reasonGuidance: { en: "Use up to 64 letters, numbers, dots, underscores, or hyphens.", ar: "استخدم حتى 64 حرفًا أو رقمًا أو نقطة أو شرطة سفلية أو واصلة." },
  sourceInventory: { en: "Source Inventory", ar: "مخزون المصدر" }, destinationInventory: { en: "Destination Inventory", ar: "مخزون الوجهة" },
  loading: { en: "Loading current Inventory…", ar: "جارٍ تحميل المخزون الحالي…" },
  unavailableRead: { en: "Inventory details are not available for this account.", ar: "تفاصيل المخزون غير متاحة لهذا الحساب." },
  selectDestination: { en: "Select an active destination Branch.", ar: "اختر فرع وجهة نشطًا." },
  selectProduct: { en: "Select a Product from the source Branch.", ar: "اختر منتجًا من الفرع المصدر." },
  sameBranch: { en: "Source and destination Branches must be different.", ar: "يجب أن يختلف الفرع المصدر عن الفرع الوجهة." },
  inactive: { en: "Both Branches must be active before confirmation.", ar: "يجب أن يكون الفرعان نشطين قبل التأكيد." },
  hintUnavailable: { en: "Transfer is not currently advertised for this session.", ar: "التحويل غير متاح حاليًا لهذه الجلسة." },
  review: { en: "Review Transfer", ar: "مراجعة التحويل" }, confirmTitle: { en: "Confirm Inventory Transfer", ar: "تأكيد تحويل المخزون" },
  confirm: { en: "Confirm Transfer", ar: "تأكيد التحويل" }, cancel: { en: "Cancel", ar: "إلغاء" },
  invalidDraft: { en: "Select different active Branches and enter a positive Piece quantity. Check the optional Reason Code format.", ar: "اختر فرعين نشطين مختلفين وأدخل كمية قطع موجبة، وتحقق من تنسيق رمز السبب الاختياري." },
  pending: { en: "Submitting Inventory Transfer…", ar: "جارٍ إرسال تحويل المخزون…" },
  succeeded: { en: "Inventory Transfer succeeded.", ar: "نجح تحويل المخزون." },
  transferId: { en: "Transfer ID", ar: "معرف التحويل" }, operationId: { en: "Operation ID", ar: "معرف العملية" }, status: { en: "Status", ar: "الحالة" },
  Succeeded: { en: "Succeeded", ar: "ناجح" }, availability: { en: "Availability", ar: "الإتاحة" },
  InStock: { en: "In Stock", ar: "متوفر" }, OutOfStock: { en: "Out of Stock", ar: "غير متوفر" },
  minimumDisclosure: { en: "No Inventory balance or availability was disclosed for this account.", ar: "لم يُكشف رصيد المخزون أو إتاحته لهذا الحساب." },
  reviewRequired: { en: "Review the retained exact command before an explicit retry. It will not be replayed automatically.", ar: "راجع الأمر الدقيق المحتفظ به قبل إعادة المحاولة صراحةً. لن يُعاد تلقائيًا." },
  reviewed: { en: "I reviewed this retry", ar: "راجعت إعادة المحاولة" }, reload: { en: "Reload both Inventory sides", ar: "إعادة تحميل جانبي المخزون" },
  AuthenticationRequired: { en: "Your session has expired.", ar: "انتهت صلاحية جلستك." },
  ForbiddenForRestrictedSession: { en: "Transfer is unavailable in this restricted session.", ar: "التحويل غير متاح في هذه الجلسة المقيدة." },
  OriginNotAllowed: { en: "This Transfer request was blocked.", ar: "حُظر طلب التحويل هذا." }, Forbidden: { en: "Access to this Inventory Transfer was denied.", ar: "رُفض الوصول إلى تحويل المخزون هذا." },
  BranchNotFound: { en: "A selected Branch is no longer available. Refresh and reselect safely.", ar: "لم يعد أحد الفرعين المحددين متاحًا. حدّث الاختيار وأعده بأمان." },
  ProductNotFound: { en: "The selected Product is no longer available. Select it again.", ar: "لم يعد المنتج المحدد متاحًا. اختره مجددًا." },
  BranchInactive: { en: "A selected Branch became inactive. The service did not identify a side; review both selections.", ar: "أصبح أحد الفرعين المحددين غير نشط. لم تحدد الخدمة الجانب؛ راجع الاختيارين." },
  ProductArchived: { en: "The selected Product was archived. Select an eligible Product and review again.", ar: "أُرشف المنتج المحدد. اختر منتجًا مؤهلًا وراجع مجددًا." },
  InvalidQuantity: { en: "Enter a valid positive Piece quantity.", ar: "أدخل كمية قطع موجبة وصحيحة." }, InvalidInput: { en: "The Transfer command was not accepted.", ar: "لم يُقبل أمر التحويل." },
  InsufficientAvailableStock: { en: "The source does not have enough available Inventory. Current readable state was refreshed.", ar: "لا يملك المصدر مخزونًا متاحًا كافيًا. حُدثت الحالة المقروءة الحالية." },
  InventoryConflict: { en: "Inventory changed elsewhere. Both readable sides were refreshed; review again.", ar: "تغير المخزون في مكان آخر. حُدث الجانبان المقروءان؛ راجع مجددًا." },
  IdempotencyConflict: { en: "This Operation ID was used for different intent. Review for a new ID.", ar: "استُخدم معرف العملية لقصد مختلف. راجع للحصول على معرف جديد." },
  unavailable: { en: "The Transfer outcome is uncertain. Review the retained command before an explicit retry.", ar: "نتيجة التحويل غير مؤكدة. راجع الأمر المحتفظ به قبل إعادة المحاولة صراحةً." },
} as const;
export type TransferTextKey = keyof typeof messages;
export const transferText = (locale: Locale, key: TransferTextKey): string => messages[key][locale];
export const transferFailureText = (locale: Locale, kind: TransferFailure) =>
  kind === "NetworkFailure" || kind === "MalformedResponse" || kind === "UnexpectedResponse" || kind === "InventoryServiceUnavailable"
    ? transferText(locale, "unavailable") : transferText(locale, kind);
