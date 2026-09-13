import type { Locale } from "../../../identity/presentation/identity-presentation.types";

const en = {
  product: "Product", select: "Select Product", search: "Search Products", submit: "Search",
  productCode: "Product Code", productName: "Product Name", Draft: "Draft", Published: "Published",
  Listed: "Listed", Unlisted: "Unlisted", NotConfigured: "Not Configured",
  loading: "Loading Products", empty: "No Products Available", SelectBranch: "Select an active Branch first",
  InactiveBranch: "The selected branch is inactive. Select an active Branch first.",
  StaleBranch: "The selected branch is no longer available. Select an active Branch first.",
  next: "Next Products", first: "Back to first page", pageGuidance: "The next page replaces this list and clears Product selection.",
  selected: "Selected Product", clear: "Clear Product selection", stale: "The selected Product is not in the current results. Select a Product again.",
  retry: "Retry", AuthenticationRequired: "Your session has expired. Sign in again.",
  ForbiddenForRestrictedSession: "Product discovery is unavailable in a restricted session.",
  Forbidden: "Product discovery is forbidden for this purpose.", BranchNotFound: "The branch is no longer available for Product discovery.",
  InvalidQuery: "The search request was not accepted. Review the search and try again.",
  InvalidCursor: "This Product page is invalid or expired. Return to the first page.",
  CatalogQueryServiceUnavailable: "Products are unavailable. Try again.", NetworkFailure: "The server could not be reached. Try again.",
  MalformedResponse: "The Product response could not be read. Try again.", UnexpectedResponse: "The server returned an unexpected response. Try again.",
};
const ar: Record<keyof typeof en, string> = {
  product: "المنتج", select: "اختر المنتج", search: "البحث عن المنتجات", submit: "بحث",
  productCode: "رمز المنتج", productName: "اسم المنتج", Draft: "مسودة", Published: "منشور",
  Listed: "مدرج", Unlisted: "غير مدرج", NotConfigured: "غير مهيأ",
  loading: "جارٍ تحميل المنتجات", empty: "لا توجد منتجات متاحة", SelectBranch: "اختر فرعًا نشطًا أولًا",
  InactiveBranch: "الفرع المحدد غير نشط. اختر فرعًا نشطًا أولًا.",
  StaleBranch: "لم يعد الفرع المحدد متاحًا. اختر فرعًا نشطًا أولًا.",
  next: "المنتجات التالية", first: "العودة إلى الصفحة الأولى", pageGuidance: "تحل الصفحة التالية محل هذه القائمة ويُمسح اختيار المنتج.",
  selected: "المنتج المحدد", clear: "مسح اختيار المنتج", stale: "المنتج المحدد غير موجود في النتائج الحالية. اختر المنتج مجددًا.",
  retry: "إعادة المحاولة", AuthenticationRequired: "انتهت جلستك. سجّل الدخول مجددًا.",
  ForbiddenForRestrictedSession: "اكتشاف المنتجات غير متاح في جلسة مقيدة.",
  Forbidden: "اكتشاف المنتجات غير مسموح لهذا الغرض.", BranchNotFound: "لم يعد الفرع متاحًا لاكتشاف المنتجات.",
  InvalidQuery: "لم يُقبل طلب البحث. راجع البحث وحاول مجددًا.",
  InvalidCursor: "صفحة المنتجات غير صالحة أو منتهية. عُد إلى الصفحة الأولى.",
  CatalogQueryServiceUnavailable: "المنتجات غير متاحة. حاول مجددًا.", NetworkFailure: "تعذر الاتصال بالخادم. حاول مجددًا.",
  MalformedResponse: "تعذرت قراءة استجابة المنتجات. حاول مجددًا.", UnexpectedResponse: "أعاد الخادم استجابة غير متوقعة. حاول مجددًا.",
};
export type OperationalProductTextKey = keyof typeof en;
export const operationalProductText = (locale: Locale, key: OperationalProductTextKey): string => (locale === "ar" ? ar : en)[key];
