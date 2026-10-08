# Infrastructure Documentation | توثيق البنية التحتية

**Status:** Foundation · **Last Updated:** 2026-07-19 · **Scope:** Technical adapters

## English

Product Media V1 uses a single application server with local storage under `QSC_MEDIA_ROOT`, plus PostgreSQL registry persistence and a direct sharp adapter. It does not support horizontal scaling; a provider-neutral object-storage adapter is future work.

Infrastructure implements persistence, file storage, and external adapters behind contracts. It does not define Domain policy.

P2 specification-template releases must follow the [Mechanism A release runbook](Task-3.23-P2-Mechanism-A-Release-Runbook.md): one active writer and a controlled maintenance-write window. Local rehearsal evidence does not verify production hosting.

## العربية

يستخدم V1 لوسائط Product خادم تطبيق واحداً مع تخزين محلي تحت `QSC_MEDIA_ROOT`، إضافة إلى سجل PostgreSQL ومحول sharp مباشر. لا يدعم التوسع الأفقي، ويبقى محول object storage المحايد عملاً مستقبلياً.

يلتزم نشر قوالب المواصفات في P2 بـ[دليل إصدار الآلية A](Task-3.23-P2-Mechanism-A-Release-Runbook.md): كاتب نشط واحد ونافذة صيانة كتابة مضبوطة. لا يثبت التدريب المحلي بيئة الاستضافة الإنتاجية.

تنفذ البنية التحتية التخزين وحفظ الملفات والمحولات الخارجية خلف العقود، ولا تعرف سياسات المجال.

