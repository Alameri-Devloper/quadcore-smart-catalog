# ADR-004: Invisible Product Lifecycle UX | دورة حياة غير مرئية في الواجهة

**Status:** Accepted · **Last Updated:** 2026-07-19

## English

**Context:** Lifecycle terminology and multiple save buttons increase training and error cost.
**Decision:** Present one primary `Save Product` action. Domain policies decide Draft or Published; explain outcomes and recovery without asking users to manage state machinery.
**Alternatives considered:** separate Save Draft/Publish actions; lifecycle selector; automatic publication without feedback.
**Consequences:** simpler UX and stronger policy boundary.
**Risks:** unclear messages could hide why publication was deferred.
**Future implications:** approval UX must preserve the same simplicity.

## العربية

**السياق:** تزيد مصطلحات دورة الحياة وأزرار الحفظ المتعددة التدريب والأخطاء.
**القرار:** تعرض الواجهة `Save Product` كإجراء رئيسي واحد، وتقرر سياسات المجال الحفظ كمسودة أو النشر مع شرح النتيجة والاستعادة.
**البدائل:** زران للمسودة والنشر، أو اختيار الحالة، أو نشر تلقائي بلا توضيح.
**النتائج:** تجربة أبسط وحد سياسات أقوى.
**المخاطر:** قد تخفي الرسالة الضعيفة سبب تأجيل النشر.
**المستقبل:** يجب أن تحافظ الموافقات على البساطة نفسها.

