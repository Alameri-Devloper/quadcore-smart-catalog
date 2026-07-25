# Infrastructure Documentation | توثيق البنية التحتية

**Status:** Foundation · **Last Updated:** 2026-07-19 · **Scope:** Technical adapters

## English

Product Media V1 uses a single application server with local storage under `QSC_MEDIA_ROOT`, plus PostgreSQL registry persistence and a direct sharp adapter. It does not support horizontal scaling; a provider-neutral object-storage adapter is future work.

Infrastructure implements persistence, file storage, and external adapters behind contracts. It does not define Domain policy.

## العربية

يستخدم V1 لوسائط Product خادم تطبيق واحداً مع تخزين محلي تحت `QSC_MEDIA_ROOT`، إضافة إلى سجل PostgreSQL ومحول sharp مباشر. لا يدعم التوسع الأفقي، ويبقى محول object storage المحايد عملاً مستقبلياً.

تنفذ البنية التحتية التخزين وحفظ الملفات والمحولات الخارجية خلف العقود، ولا تعرف سياسات المجال.

