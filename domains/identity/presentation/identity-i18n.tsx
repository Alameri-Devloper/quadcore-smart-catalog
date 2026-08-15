"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Locale, PermissionDefinitionView } from "./identity-presentation.types";
import { PRESENTATION_LOCALE_STORAGE_NAME } from "./identity-presentation.utils";

type Translation = Readonly<{ ar: string; en: string }>;

const messages: Readonly<Record<string, Translation>> = {
  brand: { ar: "كتالوج كوادكور الذكي", en: "Quadcore Smart Catalog" },
  language: { ar: "English", en: "العربية" },
  catalog: { ar: "الكتالوج", en: "Catalog" },
  members: { ar: "الأعضاء", en: "Members" },
  signIn: { ar: "تسجيل الدخول", en: "Sign in" },
  signOut: { ar: "تسجيل الخروج", en: "Sign out" },
  signOutUnconfirmed: { ar: "تعذر تأكيد تسجيل الخروج. قد تظل جلستك نشطة. حاول مرة أخرى.", en: "Unable to confirm sign out. Your session may still be active. Try again." },
  workspaceCode: { ar: "رمز الشركة", en: "Company code" },
  username: { ar: "اسم المستخدم", en: "Username" },
  password: { ar: "كلمة المرور", en: "Password" },
  currentPassword: { ar: "كلمة المرور الحالية", en: "Current password" },
  newPassword: { ar: "كلمة المرور الجديدة", en: "New password" },
  confirmPassword: { ar: "تأكيد كلمة المرور الجديدة", en: "Confirm new password" },
  rememberWorkspace: { ar: "تذكر رمز الشركة", en: "Remember company code" },
  forgotPassword: { ar: "نسيت كلمة المرور؟", en: "Forgot your password?" },
  loginIntro: { ar: "أدخل بيانات مساحة العمل للوصول الآمن.", en: "Enter your workspace details for secure access." },
  genericLoginFailure: { ar: "تعذر تسجيل الدخول. تحقق من البيانات وحاول مرة أخرى.", en: "Unable to sign in. Check your details and try again." },
  loading: { ar: "جارٍ التحميل…", en: "Loading…" },
  submitting: { ar: "جارٍ الحفظ…", en: "Saving…" },
  unavailable: { ar: "الخدمة غير متاحة مؤقتًا. حاول لاحقًا.", en: "The service is temporarily unavailable. Try again later." },
  forbidden: { ar: "ليس لديك صلاحية لعرض هذه الصفحة.", en: "You do not have permission to view this page." },
  conflict: { ar: "تم تعديل بيانات هذا العضو من جلسة أخرى. راجع البيانات الحالية قبل حفظ تغييراتك مرة أخرى.", en: "This member was changed from another session. Review the current data before saving your changes again." },
  settingsConflict: { ar: "تم تعديل إعدادات الاتصال من جلسة أخرى. راجع الإعدادات الحالية قبل حفظ تغييراتك مرة أخرى.", en: "Communication settings were changed from another session. Review the current settings before saving your changes again." },
  reviewCurrentData: { ar: "تحديث ومراجعة البيانات الحالية", en: "Refresh / Review Current Data" },
  validationError: { ar: "راجع الحقول الموضحة ثم حاول مرة أخرى.", en: "Review the highlighted fields and try again." },
  passwordRules: { ar: "استخدم من 12 إلى 128 حرفًا. المسافات مسموحة، لكن لا يمكن أن تكون الكلمة مسافات فقط.", en: "Use 12–128 characters. Spaces are allowed, but the password cannot be all spaces." },
  passwordLength: { ar: "يجب أن تتكون كلمة المرور من 12 إلى 128 حرفًا.", en: "Password must contain 12–128 characters." },
  passwordAllSpace: { ar: "لا يمكن أن تتكون كلمة المرور من مسافات فقط.", en: "Password cannot contain only spaces." },
  passwordMismatch: { ar: "كلمتا المرور غير متطابقتين.", en: "The passwords do not match." },
  invalidCurrentPassword: { ar: "كلمة المرور الحالية غير صحيحة.", en: "The current password is incorrect." },
  showPassword: { ar: "إظهار كلمة المرور", en: "Show password" },
  hidePassword: { ar: "إخفاء كلمة المرور", en: "Hide password" },
  changePassword: { ar: "تغيير كلمة المرور", en: "Change password" },
  changePasswordIntro: { ar: "اختر كلمة مرور دائمة وآمنة للمتابعة.", en: "Choose a secure permanent password to continue." },
  restrictedNotice: { ar: "يجب تغيير كلمة المرور المؤقتة قبل متابعة استخدام النظام.", en: "You must change the temporary password before continuing." },
  recovery: { ar: "استعادة كلمة المرور", en: "Recover password" },
  recoveryIntro: { ar: "أدخل رمز الشركة واسم المستخدم لطلب تعليمات الاستعادة.", en: "Enter your company code and username to request recovery instructions." },
  recoveryGeneric: { ar: "إذا كان الحساب مؤهلًا للاستعادة فسيتم إرسال التعليمات إلى وسيلة الاستعادة المسجلة.", en: "If the account is eligible for recovery, instructions will be sent to the registered recovery contact." },
  recoveryDeferred: { ar: "توصيل رمز الاستعادة عبر واتساب غير مفعّل بعد. تواصل مع مالك مساحة العمل لإصدار كلمة مرور مؤقتة.", en: "WhatsApp recovery delivery is not enabled yet. Contact a workspace Owner for a temporary password." },
  requestRecovery: { ar: "طلب تعليمات الاستعادة", en: "Request recovery instructions" },
  verifyRecovery: { ar: "التحقق من رمز الاستعادة", en: "Verify recovery code" },
  otp: { ar: "رمز التحقق المكون من 8 أرقام", en: "8-digit verification code" },
  otpHint: { ar: "استخدم 8 أرقام غربية (0–9). يمكنك لصق الرمز كاملًا.", en: "Use 8 Western digits (0–9). You can paste the full code." },
  invalidOtp: { ar: "أدخل رمزًا صحيحًا من 8 أرقام غربية.", en: "Enter a valid 8-digit Western code." },
  resend: { ar: "إعادة الإرسال", en: "Resend" },
  resendIn: { ar: "إعادة الإرسال بعد {seconds} ثانية", en: "Resend in {seconds} seconds" },
  backToLogin: { ar: "العودة إلى تسجيل الدخول", en: "Back to sign in" },
  memberManagement: { ar: "إدارة الأعضاء", en: "Member management" },
  memberManagementIntro: { ar: "إدارة الحسابات والصلاحيات ونطاق الفروع وإعدادات الاستعادة.", en: "Manage accounts, permissions, branch scope, and recovery settings." },
  newMember: { ar: "عضو جديد", en: "New member" },
  searchMembers: { ar: "البحث بالاسم أو اسم المستخدم", en: "Search by name or username" },
  allRoles: { ar: "كل الأدوار", en: "All roles" },
  allStatuses: { ar: "كل الحالات", en: "All statuses" },
  noMembers: { ar: "لا يوجد أعضاء مطابقون للمرشحات الحالية.", en: "No members match the current filters." },
  displayName: { ar: "اسم العرض", en: "Display name" },
  whatsapp: { ar: "واتساب", en: "WhatsApp" },
  locale: { ar: "اللغة", en: "Language" },
  role: { ar: "الدور", en: "Role" },
  status: { ar: "الحالة", en: "Status" },
  branchScope: { ar: "نطاق الفروع", en: "Branch scope" },
  permissions: { ar: "الصلاحيات", en: "Permissions" },
  temporaryPasswordRequired: { ar: "يلزم تغيير كلمة المرور", en: "Password change required" },
  viewDetails: { ar: "عرض التفاصيل", en: "View details" },
  owner: { ar: "مالك", en: "Owner" },
  staff: { ar: "موظف", en: "Staff" },
  pendingActivation: { ar: "بانتظار التفعيل", en: "Pending activation" },
  active: { ar: "نشط", en: "Active" },
  suspended: { ar: "معلّق", en: "Suspended" },
  allBranches: { ar: "كل الفروع", en: "All branches" },
  selectedBranches: { ar: "فروع محددة", en: "Selected branches" },
  selectedBranchCount: { ar: "{count} فرع محدد", en: "{count} selected branches" },
  memberInformation: { ar: "معلومات العضو", en: "Member information" },
  access: { ar: "الوصول", en: "Access" },
  branches: { ar: "الفروع", en: "Branches" },
  temporaryPassword: { ar: "كلمة المرور المؤقتة", en: "Temporary password" },
  review: { ar: "المراجعة", en: "Review" },
  next: { ar: "التالي", en: "Next" },
  previous: { ar: "السابق", en: "Previous" },
  createMember: { ar: "إنشاء المستخدم", en: "Create member" },
  usernameHint: { ar: "من 3 إلى 64 حرفًا أو رقمًا إنجليزيًا، ويمكن استخدام . _ -", en: "3–64 ASCII letters or digits; . _ - are allowed." },
  whatsappHint: { ar: "استخدم الصيغة الدولية E.164 مثل +967711234567.", en: "Use international E.164 format, for example +967711234567." },
  invalidUsername: { ar: "اسم المستخدم لا يطابق الصيغة المطلوبة.", en: "Username does not match the required format." },
  invalidPhone: { ar: "أدخل رقمًا دوليًا صحيحًا بصيغة E.164.", en: "Enter a valid international E.164 number." },
  fieldRequired: { ar: "هذا الحقل مطلوب.", en: "This field is required." },
  ownerAccessExplanation: { ar: "يحصل المالك على جميع صلاحيات مساحة العمل وكل الفروع. لا توجد صلاحيات قابلة للتعديل للمالك.", en: "An Owner receives full workspace authority and all branches. Owner permissions are not editable." },
  template: { ar: "قالب الصلاحيات", en: "Permission template" },
  customPermissions: { ar: "تخصيص الصلاحيات", en: "Customize permissions" },
  sensitivePermission: { ar: "صلاحية حساسة", en: "Sensitive permission" },
  sensitivePermissionHint: { ar: "قد تسمح هذه الصلاحية بعرض بيانات حساسة أو إجراء تغييرات عالية التأثير. راجعها بعناية.", en: "This permission may expose sensitive data or allow high-impact changes. Review it carefully." },
  noBranchesAvailable: { ar: "لا توجد مراجع فروع نشطة متاحة حاليًا.", en: "No active branch references are currently available." },
  branchRequired: { ar: "اختر فرعًا واحدًا على الأقل.", en: "Select at least one branch." },
  generatePassword: { ar: "إنشاء كلمة آمنة", en: "Generate secure password" },
  copy: { ar: "نسخ", en: "Copy" },
  copied: { ar: "تم النسخ", en: "Copied" },
  temporaryOnce: { ar: "لن تظهر كلمة المرور المؤقتة مرة أخرى بعد مغادرة هذه الصفحة.", en: "This temporary password will not be shown again after you leave this page." },
  createSuccess: { ar: "تم إنشاء العضو بنجاح.", en: "Member created successfully." },
  account: { ar: "الحساب", en: "Account" },
  profile: { ar: "الملف الشخصي", en: "Profile" },
  rolePermissions: { ar: "الدور والصلاحيات", en: "Role and permissions" },
  securityLifecycle: { ar: "الأمان ودورة الحياة", en: "Security and lifecycle" },
  createdAt: { ar: "تاريخ الإنشاء", en: "Created" },
  edit: { ar: "تعديل", en: "Edit" },
  save: { ar: "حفظ", en: "Save" },
  cancel: { ar: "إلغاء", en: "Cancel" },
  saved: { ar: "تم حفظ التغييرات.", en: "Changes saved." },
  whatsappSecurity: { ar: "يؤدي تغيير الرقم إلى تغيير جهة اتصال الاستعادة وإبطال تحديات الاستعادة المفتوحة، ولا يؤدي وحده إلى تسجيل الخروج.", en: "Changing the number changes the recovery contact and invalidates open recovery challenges. It does not sign the member out by itself." },
  currentNumber: { ar: "الرقم الحالي", en: "Current number" },
  newNumber: { ar: "الرقم الجديد بصيغة E.164", en: "New E.164 number" },
  reviewChanges: { ar: "مراجعة التغييرات", en: "Review changes" },
  savePermissions: { ar: "حفظ الصلاحيات", en: "Save permissions" },
  saveBranchScope: { ar: "حفظ نطاق الفروع", en: "Save branch scope" },
  sessionsRevoked: { ar: "سيتم إلغاء جلسات العضو الحالية بعد هذا التغيير.", en: "The member’s existing sessions will be revoked by this change." },
  promote: { ar: "ترقية إلى مالك", en: "Promote to Owner" },
  promoteExplanation: { ar: "سيحصل العضو على كامل صلاحيات مساحة العمل وكل الفروع، وستُلغى جلساته الحالية.", en: "The member will gain full workspace authority and all branches, and existing sessions will be invalidated." },
  demote: { ar: "تخفيض إلى موظف", en: "Demote to Staff" },
  demoteExplanation: { ar: "حدد صلاحيات الموظف ونطاق فروعه صراحة. لن تُنسخ صلاحيات المالك تلقائيًا.", en: "Explicitly select Staff permissions and branch scope. Owner authority is not copied automatically." },
  suspendMember: { ar: "تعليق المستخدم", en: "Suspend member" },
  suspendExplanation: { ar: "سيفقد المستخدم الوصول وستُلغى جلساته، مع الاحتفاظ بالحساب والسجل.", en: "The user will lose access and sessions will be invalidated, while the account and history remain." },
  reactivate: { ar: "إعادة التفعيل", en: "Reactivate" },
  reactivateExplanation: { ar: "تتطلب إعادة التفعيل كلمة مرور مؤقتة جديدة، وسيُطلب تغييرها عند تسجيل الدخول التالي.", en: "Reactivation requires a new temporary password, which must be changed at the next sign-in." },
  resetPassword: { ar: "إصدار كلمة مرور مؤقتة", en: "Issue temporary password" },
  resetExplanation: { ar: "ستُلغى الجلسات الحالية، وسيلزم تغيير كلمة المرور في تسجيل الدخول التالي.", en: "Existing sessions will be invalidated, and the password must be changed at the next sign-in." },
  confirmAction: { ar: "أفهم أثر هذا الإجراء وأؤكد المتابعة.", en: "I understand the impact and confirm this action." },
  lastOwnerProtected: { ar: "لا يمكن إزالة آخر مالك نشط من مساحة العمل.", en: "The last active Owner cannot be removed from the workspace." },
  communicationSettings: { ar: "إعدادات الاتصال والاستعادة", en: "Communication and recovery settings" },
  defaultWhatsApp: { ar: "رقم واتساب الافتراضي", en: "Default WhatsApp phone" },
  recoveryPolicy: { ar: "سياسة استعادة كلمة المرور", en: "Password recovery policy" },
  ownerManagedOnly: { ar: "إدارة الاستعادة بواسطة المالك فقط", en: "Owner-managed recovery only" },
  whatsappFallback: { ar: "استعادة واتساب مع إمكانية تدخل المالك", en: "WhatsApp OTP with Owner fallback" },
  refresh: { ar: "تحديث", en: "Refresh" },
  backToMembers: { ar: "العودة إلى الأعضاء", en: "Back to members" },
  memberNotFound: { ar: "لم يتم العثور على العضو ضمن مساحة العمل.", en: "The member was not found in this workspace." },
};

const permissionNames: Readonly<Record<string, Translation>> = {
  "catalog.product.create": { ar: "إنشاء منتج", en: "Create product" },
  "catalog.product.edit": { ar: "تعديل منتج", en: "Edit product" },
  "catalog.product-entry-submission.read": { ar: "عرض طلبات إدخال المنتج", en: "View product-entry submissions" },
  "catalog.product-entry-media.upload": { ar: "رفع وسائط إدخال المنتج", en: "Upload product-entry media" },
  "catalog.product.reference-cost.read": { ar: "عرض التكلفة المرجعية للمنتج", en: "View product reference cost" },
  "catalog.products.view": { ar: "عرض المنتجات", en: "View products" },
  "catalog.products.create": { ar: "إنشاء المنتجات", en: "Create products" },
  "catalog.products.edit": { ar: "تعديل المنتجات", en: "Edit products" },
  "catalog.products.archive": { ar: "أرشفة المنتجات", en: "Archive products" },
  "catalog.productEntry.submit": { ar: "إرسال إدخال المنتج", en: "Submit product entry" },
  "catalog.productMedia.upload": { ar: "رفع وسائط المنتج", en: "Upload product media" },
  "catalog.productMedia.retry": { ar: "إعادة محاولة وسائط المنتج", en: "Retry product media" },
  "catalog.productMedia.reconciliation.manage": { ar: "إدارة مطابقة وسائط المنتج", en: "Manage media reconciliation" },
  "catalog.productMedia.source.replace": { ar: "استبدال مصدر وسائط المنتج", en: "Replace media source" },
  "catalog.sharing.create": { ar: "إنشاء مشاركة", en: "Create sharing" },
  "catalog.sharing.aiRecommendation.generate": { ar: "إنشاء توصية مشاركة ذكية", en: "Generate sharing recommendation" },
  "pricing.view": { ar: "عرض الأسعار", en: "View pricing" },
  "pricing.manage": { ar: "إدارة الأسعار", en: "Manage pricing" },
  "pricing.wholesale.view": { ar: "عرض أسعار الجملة", en: "View wholesale pricing" },
  "pricing.branchOverride.manage": { ar: "إدارة تجاوز أسعار الفروع", en: "Manage branch price overrides" },
  "referenceCost.view": { ar: "عرض التكلفة المرجعية", en: "View reference cost" },
  "referenceCost.manage": { ar: "إدارة التكلفة المرجعية", en: "Manage reference cost" },
  "referenceCost.branchOverride.manage": { ar: "إدارة تجاوز تكلفة الفروع", en: "Manage branch cost overrides" },
  "inventory.availability.view": { ar: "عرض توفر المخزون", en: "View inventory availability" },
  "inventory.quantity.view": { ar: "عرض كمية المخزون", en: "View inventory quantity" },
  "inventory.receive": { ar: "استلام المخزون", en: "Receive inventory" },
  "inventory.issue": { ar: "صرف المخزون", en: "Issue inventory" },
  "inventory.reserve": { ar: "حجز المخزون", en: "Reserve inventory" },
  "inventory.transfer": { ar: "نقل المخزون", en: "Transfer inventory" },
  "inventory.damage": { ar: "تسجيل تلف المخزون", en: "Record inventory damage" },
  "inventory.adjust": { ar: "تسوية المخزون", en: "Adjust inventory" },
  "workspace.settings.view": { ar: "عرض إعدادات مساحة العمل", en: "View workspace settings" },
  "workspace.settings.manage": { ar: "إدارة إعدادات مساحة العمل", en: "Manage workspace settings" },
  "workspace.audit.view": { ar: "عرض سجل التدقيق", en: "View audit log" },
  "workspace.members.manage": { ar: "إدارة أعضاء مساحة العمل", en: "Manage workspace members" },
};

export interface IdentityI18n {
  readonly locale: Locale;
  readonly dir: "rtl" | "ltr";
  readonly t: (key: string, replacements?: Readonly<Record<string, string | number>>) => string;
  readonly setLocale: (locale: Locale) => void;
  readonly permissionText: (definition: PermissionDefinitionView) => { readonly name: string; readonly description: string };
}

export const translate = (locale: Locale, key: string, replacements?: Readonly<Record<string, string | number>>): string => {
  let value = messages[key]?.[locale] ?? key;
  for (const [name, replacement] of Object.entries(replacements ?? {})) value = value.replace(`{${name}}`, String(replacement));
  return value;
};

export const permissionTranslation = (locale: Locale, definition: PermissionDefinitionView) => ({
  name: permissionNames[definition.code]?.[locale] ?? definition.code,
  description: definition.sensitive
    ? translate(locale, "sensitivePermissionHint")
    : locale === "ar" ? `يسمح باستخدام هذه الإمكانية ضمن وحدة ${definition.module}.` : `Allows this capability in the ${definition.module} module.`,
});

export const useIdentityI18n = (): IdentityI18n => {
  const [locale, setLocaleState] = useState<Locale>("ar");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const stored = window.localStorage.getItem(PRESENTATION_LOCALE_STORAGE_NAME);
      if (stored === "ar" || stored === "en") setLocaleState(stored);
    }, 0);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const setLocale = useCallback((next: Locale) => {
    setLocaleState(next);
    window.localStorage.setItem(PRESENTATION_LOCALE_STORAGE_NAME, next);
  }, []);

  const t = useCallback((key: string, replacements?: Readonly<Record<string, string | number>>) => translate(locale, key, replacements), [locale]);
  const permissionText = useCallback((definition: PermissionDefinitionView) => permissionTranslation(locale, definition), [locale]);
  return useMemo(() => ({
    locale,
    dir: locale === "ar" ? "rtl" : "ltr",
    setLocale,
    t,
    permissionText,
  }), [locale, permissionText, setLocale, t]);
};
