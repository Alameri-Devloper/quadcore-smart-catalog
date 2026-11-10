# Portable Staff Specification Configuration
# تهيئة مواصفات Staff القابلة للنقل

Status: implementation for controlled review; operational application is disabled.
الحالة: تنفيذ للمراجعة المنضبطة؛ التطبيق التشغيلي معطّل.

## Purpose and boundaries / الغرض والحدود

This is an Application orchestration extension of the existing private Catalog Query and Reference Data use cases, not a new aggregate, repository, schema, public API, service or runtime configuration system.
The code-only approved desired manifest is domains/catalog/query/domain/staff-specification-configuration.ts. It resolves target-specific IDs and emits the EXISTING CatalogSpecificationPresentationProfile format. Only the normal trusted runtime profile remains authoritative while serving.
البيان يصف الحالة المرغوبة المعتمدة، ولا يحل محل تهيئة التشغيل ولا يُطبق عند بدء التطبيق.

Included: six approved ProductType profiles, 17 definition descriptions, 26 bindings, existing groups/priorities/compositions, explicit filter allowlists and unchanged approved EN/AR search settings. Existing maximum-three card and maximum-four missing-field behavior is not modified.
Excluded: products/SKUs, prices, stock, media files, user accounts, sessions, credentials, Additional Notes, future/unapproved definitions, P5/P6/P7 and production setup. No product records or sample values are copied.
تُحفظ الأسماء البديلة وخرائط القيم المعتمدة كما هي. بعض أسماء/قيم البحث الموروثة تتضمن QA لأنها جزء من تهيئة البحث السابقة؛ ليست صفوف منتجات أو إثباتاً بوجود هذه القيم في بيئة أخرى. لا تُستنتج نتائج أو aliases جديدة.

## Identity and prerequisites / الهوية والمتطلبات

- Workspace is explicitly supplied as workspaceId and must equal the existing Identity-resolved TrustedActorContext.workspaceId. Do not construct a trusted actor from CLI/manifest/user input. The existing Identity login/resolver is the authority; this mechanism does not create/resolve Workspaces by guessed labels.
- Existing Reference Data read requires catalog.referenceData.view plus manage for includeInactive; writes retain catalog.referenceData.manage, audit and transaction checks.
- Six active ProductTypes and their active Category/Department parents must already exist. No ProductType creation.
- Twelve original definitions and 21 original bindings are required existing configuration. Missing required dependencies block, not silently create.
- Only five previously approved optional Laptop definitions/bindings may be created: cpu-generation (Number/no unit), ram-ddr-type (Text/no unit), storage-technology (Text/no unit), gpu-memory (Number/GB), operating-system (Text/no unit).
- Codes are Workspace-scoped identities. QA codes are not a universal taxonomy. Explicit productTypeCodes mapping may select existing target codes. Explicit definitionCodes mapping may resolve the 12 required existing definitions to other target codes. Mappings must be canonical, known and one-to-one. The five create-approved codes cannot be renamed by mapping. Labels are compared for configuration consistency, never used as identities.
- Type/unit/label/order/status, hierarchy, required flag, publicVisibility, approved binding position and current profile must match or report conflict. No automatic unit conversions, renames, activation or policy expansion.

تُحدد المساحة صراحة وتُطابق السياق الحقيقي. التعريفات الخمسة فقط قابلة للإنشاء؛ بقية البيانات شروط سابقة. خريطة الأكواد قرار تهيئة موثوق وليست قيمة من طلب مستخدم غير موثوق، ولا تبرر توسيع الصلاحيات أو تفسير مسمى منتج.

## Dry Run / المعاينة دون كتابة

PortableSpecificationConfigurationUseCase.execute defaults to dry-run even if isolated writers were injected.
Input: existing trusted context, explicit workspaceId, optional approved manifest (omission uses the shipped approved revision; null is invalid), optional explicit code mappings and currentProfiles.
currentProfiles must be the actual trusted parsed runtime state. undefined means unknown and blocks; [] means explicitly known absence. Read the authoritative current configuration afresh before any future installation.

Output rows include record type, Workspace/ProductType scope, stable source identity, current/desired state, action, reason and conflict flag:
EXISTS_MATCHING, MISSING, CONFLICT, UNRESOLVED_DEPENDENCY, NOT_AUTHORIZED.
MISSING can mean CREATE (only the five approved definitions), BIND (only approved missing links), EMIT_PROFILE (candidate only), or BLOCK (required existing configuration absent).
No write method is called in Dry Run; tests assert call counts and PostgreSQL data/audit hashes. This is not rollback-based simulation.
تجري المعاينة قراءات فقط. المفقود لا يعني إنشاءً تلقائياً، والتعارض أو الحالة غير المعروفة يوقفان التطبيق.

## Application API and disabled operational apply / واجهة التطبيق وتعطيل الكتابة التشغيلية

There is no operational CLI, HTTP endpoint, startup/deployment hook or launcher change.
The service constructor takes ReferenceConfigurationReader (existing GetCatalogReferenceDataUseCase). Writer injection is absent by default; mode apply-isolated without it returns DISABLED before reading.
Only the isolated integration test composes IsolatedConfigurationWrites with existing CreateSpecificationDefinitionUseCase and ConfigureProductTypeSpecificationTemplateUseCase.
Candidate profiles are returned only when all required database configuration resolves. The result PREPARED_NOT_INSTALLED never means runtime configuration was installed.

A future authorized composition can obtain context through the EXISTING authenticated resolver and pass the read service to this constructor for planning. This is an integration API, not an invented shell command:
~~~ts
const references = openCatalogReferenceDataServerApplication();
try {
  const context = await references.context.resolve(authenticatedRequest);
  const planner = new PortableSpecificationConfigurationUseCase(references.get);
  const result = await planner.execute({
    context,
    workspaceId: explicitlySelectedWorkspaceId,
    currentProfiles: parseCatalogSpecificationPresentationProfiles(
      process.env.CATALOG_SPECIFICATION_PRESENTATION_PROFILES
    ),
  });
  // Review result; do not auto-install or create a writer.
} finally {
  await references.close();
}
~~~
The symbols above are existing server runtime/resolver/profile parser plus the new Application service. authenticatedRequest and explicitlySelectedWorkspaceId must be provided by a separately approved trusted composition; no new endpoint is supplied here.
المثال يوضح دمجاً مستقبلياً مفوضاً، وليس أمراً متاحاً لتطبيق التهيئة. لا كلمات مرور في وسائط الأوامر، ولا سياق موظف مصطنع في التشغيل.

## Conflicts, concurrency and failure / التعارض والتزامن والفشل

Any preflight BLOCK prevents all writes. Matching records retain IDs/version/audit state. Unrelated template entries and unrelated Workspace/runtime profiles are preserved.
After definition creation, refresh scoped state before each template application; template expectedVersion and existing transaction locks protect against lost updates. Scoped unique constraints handle concurrent definition creation; the losing attempt stops without retry or overwrite.
Each existing use case retains its OWN transaction and audit. No batch-wide atomicity is promised. A later failure preserves earlier commits and reports completed steps; an audit exception rolls back its own transaction. Unknown persistence outcomes stop as STOPPED_REPLAN_REQUIRED, never silently retry or claim rollback. Obtain a fresh authorized plan and investigate outcome before a later explicitly authorized run.
Runtime installation is separate and has no concurrency/atomicity claim. Re-read authoritative configuration and use the normal controlled installation process. Global all-or-nothing batch/config-install guarantees would require a separate architecture decision; not implemented.
لا حذف أو إصلاح هدّام أو تغيير بيانات تاريخية. التزام خطوة سابقة يبقى عند فشل خطوة لاحقة، ولا تنطبق هذه الآلية على استرداد P6.

## Verification commands / أوامر التحقق

From the Staff repository root with its existing Node/npm dependencies:

~~~powershell
node node_modules/tsx/dist/cli.mjs --test domains/catalog/query/application/portable-specification-configuration.test.ts
node node_modules/typescript/bin/tsc --noEmit --incremental false
~~~

For real isolated PostgreSQL qualification, Docker must already be available and postgres:17-alpine must already be installed locally:

~~~powershell
$qaRunId = [guid]::NewGuid().ToString("N")
node node_modules/tsx/dist/cli.mjs scripts/catalog/verify-portable-specifications.ts "--output=artifacts/task-reviews/portable-spec-$qaRunId"
~~~

The runner refuses existing output directories; does not load .env; creates a unique loopback-only dynamic-port container, 1 CPU/512 MiB and task-owned tmpfs storage, with an ephemeral random password that is never emitted or saved. It uses the EXISTING migrations ONLY inside the disposable target and existing application use cases for configuration writes. Synthetic test actor contexts follow existing integration conventions and never authenticate serving requests.
Integration entry additionally requires a test-only URL/name and disposable container identity, and checks current_database().
After success it verifies ownership and removes ONLY its created container. After failure it retains the task container and evidence; inspect that exact identity before separately authorized cleanup. No global cleanup/prune or shared-volume operation.
يشمل التحقق القراءة دون تعديل، الإديمبوتنسية، تعارض النوع/التهيئة، عزل المساحات، سباق تعريف وقالب عبر pool مستقلين، وتراجع التدقيق وفشل خطوة لاحقة. ليس اختبار عمليتين منفصلتين في نظام التشغيل ولا حملاً أو اعتماد إنتاجي.

## Git handoff and future approval / التسليم والتفويض المستقبلي

Deliver the two domain files, Application service/test, synthetic mock fixture, isolated PostgreSQL test, verification runner and this runbook with the implementation report. Keep generated JSON/logs/archives in ignored task evidence.
Do not include .env, DB contents, secrets, passwords, personal paths, installed dependencies, browser sessions or Docker volumes.
A fresh target requires the approved existing hierarchy/12 definitions/21 links or explicit reviewed mappings; Git alone is not authority to create that prerequisite business taxonomy.
Before real application: owner approves target Workspace/database, code mappings, actual runtime profile state and authorized write composition, then reviews Dry Run and installation plan. Operational apply remains disabled in this implementation; no configuration has been applied to Staff QA or another shared target.
اختيار فرع التسليم وعمليات Git وتطبيق التهيئة على أي بيئة قائمة تحتاج تفويضاً مستقلاً. فجوة DDR4 والقبول اليدوي وAdditional Notes لا تُحل بهذه المهمة.
P6_ENGINEERING_CANDIDATE — Acceptance HOLD remains unchanged.
