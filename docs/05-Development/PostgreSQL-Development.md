# PostgreSQL Development | تطوير PostgreSQL

## English

Copy `.env.example` to a local ignored `.env`; keep credentials development-only. Start with `docker compose up -d postgres`, inspect health with `docker compose ps`, apply migrations with `npm.cmd run db:migrate`, and run real integration tests with `npm.cmd run test:integration`. Stop without deleting data using `docker compose stop postgres`.

Generate a descriptively named migration with `npm.cmd run db:generate -- --name=product_archive_reason` and validate migrations with `npm.cmd run db:check`. The generation script is generic; every migration supplies its own explicit name. Production uses committed SQL migrations, never schema push.

Backup: `docker compose exec -T postgres pg_dump -U qsc -d qsc -Fc > qsc.dump`. Restore: `docker compose exec -T postgres pg_restore -U qsc -d qsc --clean --if-exists < qsc.dump` (destructive for represented objects). Full local reset is destructive: `docker compose down -v`; run it only when local data may be deleted, then start and migrate again.

Integration tests require `TEST_DATABASE_URL` pointing only to a dedicated test database. They migrate it, truncate Product data between cases, and close the pool. `DATABASE_SSL=false`, `true`, or `no-verify` keeps SSL policy in Infrastructure; use `no-verify` only when explicitly required by the host.

The Hybrid Relational Schema stores core Product fields relationally and specification values/image metadata in Aggregate-owned child tables. Complete create/update uses one transaction. Images are references only. Advanced search indexes remain deferred pending measured query patterns and `EXPLAIN ANALYZE`.

Product retrieval uses one short read-only `REPEATABLE READ` transaction. A Product Aggregate must not combine an old main row with newer child rows, or vice versa.

### Clean-machine integration-test workflow

Start PostgreSQL and confirm it is healthy:

```powershell
docker compose up -d postgres
docker compose ps
```

Create the dedicated test database once:

```powershell
docker compose exec postgres createdb -U qsc qsc_test
```

On later runs PostgreSQL may report that `qsc_test` already exists; that is expected. Set the URL in the current PowerShell process and run the tests:

```powershell
$env:TEST_DATABASE_URL="postgresql://qsc:qsc_dev_password@127.0.0.1:5432/qsc_test"
npm.cmd run test:integration
```

The standalone integration-test process reads `TEST_DATABASE_URL` from its process environment. Merely copying `.env.example` does not inject the value into that Node process. Never point `TEST_DATABASE_URL` to an application or production database. The test safety guard rejects suspicious database names and rejects the same host, port, and database target as `DATABASE_URL`.

## العربية

انسخ `.env.example` إلى `.env` محلي متجاهَل ولا تستخدم أسرار الإنتاج. شغّل القاعدة عبر `docker compose up -d postgres`، وافحص الصحة بـ`docker compose ps`، وطبّق الترحيلات بـ`npm.cmd run db:migrate`، وشغّل الاختبارات الحقيقية بـ`npm.cmd run test:integration`. يوقف `docker compose stop postgres` الخدمة دون حذف البيانات.

يستخدم إنشاء الترحيل سكربتاً عاماً، ويجب تمرير اسم وصفي صريح مثل `npm.cmd run db:generate -- --name=product_archive_reason`. تُفحص الترحيلات عبر `npm.cmd run db:check`، ويستخدم الإنتاج ملفات SQL الملتزم بها ولا يستخدم schema push. أمر `docker compose down -v` مدمّر ويحذف الحجم المحلي. يجب أن يشير `TEST_DATABASE_URL` إلى قاعدة اختبار مخصصة فقط، وتبقى سياسة SSL داخل البنية التحتية.

يخزن المخطط العلاقي الهجين حقول المنتج الأساسية علائقياً والمواصفات وبيانات الصور في جداول تابعة يملكها التجميع. يتم الإنشاء والتحديث الكاملان في معاملة واحدة، ولا تخزن ملفات الصور. تؤجل فهارس البحث المتقدم حتى قياس الاستعلامات الفعلية.

تستخدم قراءة المنتج معاملة قصيرة للقراءة فقط بعزل `REPEATABLE READ`، كي لا يجمع التجميع صف منتج قديماً مع صفوف تابعة أحدث أو العكس.

### مسار اختبارات التكامل على جهاز نظيف

شغّل PostgreSQL وتحقق من صحته:

```powershell
docker compose up -d postgres
docker compose ps
```

أنشئ قاعدة الاختبار المخصصة مرة واحدة:

```powershell
docker compose exec postgres createdb -U qsc qsc_test
```

قد تبلغ PostgreSQL في التشغيلات اللاحقة أن `qsc_test` موجودة مسبقاً، وهذا متوقع. اضبط الرابط في جلسة PowerShell الحالية ثم شغّل الاختبارات:

```powershell
$env:TEST_DATABASE_URL="postgresql://qsc:qsc_dev_password@127.0.0.1:5432/qsc_test"
npm.cmd run test:integration
```

تقرأ عملية اختبارات التكامل المستقلة `TEST_DATABASE_URL` من بيئة العملية. لا يؤدي مجرد نسخ `.env.example` إلى حقن القيمة في عملية Node المستقلة. لا توجّه الرابط أبداً إلى قاعدة التطبيق أو الإنتاج. يرفض حاجز الأمان أسماء القواعد المشبوهة ويرفض تطابق المضيف والمنفذ واسم القاعدة مع `DATABASE_URL`.
