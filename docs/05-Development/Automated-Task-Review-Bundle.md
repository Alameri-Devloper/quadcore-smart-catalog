# Automated Task Review Bundle | حزمة مراجعة المهام الآلية

## English

### Purpose and usage

The DEV-001 tool creates review evidence after implementation and verification. It never stages, commits, pushes, merges, creates databases, or controls Docker.

```powershell
npm.cmd run review:bundle -- --task=DEV-001 --report=docs/05-Development/Reports/DEV-001-Final-Report.md
```

Supported options are `--output`, `--base-ref`, repeatable `--skip-command`, and `--no-desktop-export`. Task and report are required. The report must resolve inside the repository. Verification commands are fixed in trusted TypeScript configuration; CLI callers cannot supply shell commands.

### Bundle and verification semantics

The bundle contains the sanitized final report, Git branch/HEAD/status evidence, separately labelled staged and unstaged tracked diffs, authoritative changed-file metadata, verification output, byte-exact changed source files, `manifest.json`, and a bilingual README. The tool fingerprints the repository before verification, runs every required command, fingerprints it again, and only then collects final Git evidence and source files. Any non-excluded working-tree mutation fails safely and requires inspection and a clean rerun. Required commands cannot be skipped. Optional skips record their reason and null exit code. Required failures or any staged, unstaged, untracked, or applicable base-reference integrity failure produce `VerificationFailed`; optional npm audit failures remain exact without blocking archive creation.

### Integrity and security

Git supplies staged, unstaged, deleted, renamed, and untracked file state. Repository paths use `/`. Source payloads are copied without rewriting and are rechecked immediately before archiving. Binary detection uses bounded null-byte and strict UTF-8 checks; binary files remain byte-exact while sensitive key formats remain excluded. Credential-bearing URLs and realistic password, secret, token, authorization, or private-key material in source fail closed. Nested `.env` variants are excluded case-insensitively; only the exact lowercase `.env.example` name remains eligible and realistic secrets inside it still fail. Sanitization applies only to generated evidence and records per-command and aggregate counts.

Manifest schema 1.1 records separate staged, unstaged, untracked, and optional base-reference integrity results. Untracked text files are checked read-only for trailing whitespace and conflict markers; likely binary files are skipped without touching the Git index. `status-short.txt` and `changed-files.json` include untracked state, while textual diff evidence is explicitly limited to its labelled tracked comparison. Raw output containing secrets is never written. `bundleFiles` must equal the exact ZIP payload set excluding `manifest.json`; omitted, extra, duplicate, or wrong-hash payloads fail verification. A detached `.zip.sha256` authenticates the whole archive.

### Export, failures, and recovery

The repository bundle defaults to the ignored `artifacts/task-reviews/<task-id>/`. Custom output paths must remain below the repository through real, non-link ancestors and must be proven ignored by read-only `git check-ignore`; the repository root and visible working-tree locations are rejected.

### Atomic artifact publication

At the start of each run, the tool creates one cryptographically strong, separator-free invocation ID. The same ID appears in every local and Desktop temporary filename and in the preflight probe filename. Before expensive verification, an export-enabled run exclusively creates and removes its exact invocation-owned probe to verify effective read, write, link, and delete access in `Desktop/QSC-Reviews`. An inaccessible destination fails with the sanitized `DesktopExportFailed: Desktop export directory is not writable.` error and is not retried automatically.

Repository ZIP and checksum publication and Desktop Final Report, ZIP, and checksum publication use two phases. Preparation exclusively creates invocation-unique `.review-temp` files in the relevant final destination directories; it never selects a temporary name through an existence check and then writes with overwrite capability. The local temporary ZIP is reopened and verified. The Desktop report is copied byte-for-byte and matched to both the source-report SHA-256 and bundled-report SHA-256; the Desktop ZIP is matched to the local ZIP, and its detached checksum is verified. Repository stability is checked while no final-looking name exists.

Desktop names are `QSC-Task-{task}-Final-Report.md`, `QSC-Task-{task}-Review.zip`, and `QSC-Task-{task}-Review.zip.sha256`. If any one exists, one UTC timestamp (and, when necessary, one shared counter) is applied to all three names. Final creation atomically hard-links each complete same-directory temporary to its final name. The link never replaces an existing destination and cannot expose partial final bytes. Two publishers may resolve the same final names, but invocation-unique temporaries isolate preparation and only the first can link the finals.

Preparation and publication use ownership-scoped compensation: cleanup receives only temporary paths whose exclusive open succeeded and final paths whose atomic link reported `Published`. `DestinationExists` is never cleaned because it may be historical. A thrown or `StateUnknown` publication outcome is reconciliation-required and its ambiguous destination is not removed. Cleanup still attempts every other proven-owned final and temporary even when one removal fails. Successful compensation restores the pre-publication state and preserves the original sanitized failure. Any ambiguity or unresolved owned artifact reports `ArtifactPublicationPartialFailure`, operation `publish-review-artifacts`, and `reconciliationRequired: true`. Unknown `.review-temp` residue is preserved. Successful runs leave no current-invocation temporary files; process interruption can still leave ID-labelled residue requiring inspection.

## العربية

### الغرض والاستخدام

تنشئ أداة DEV-001 أدلة المراجعة بعد التنفيذ والتحقق. لا تنفذ الأداة الإضافة إلى Git أو الالتزام أو الدفع أو الدمج، ولا تنشئ قواعد بيانات ولا تتحكم في Docker. يتطلب الأمر معرف المهمة ومسار تقرير موجود داخل المستودع، وتأتي أوامر التحقق من إعداد TypeScript موثوق فقط.

### محتوى الحزمة ودلالة التحقق

تسجل الأداة بصمة المستودع قبل التحقق وبعده، ثم تجمع أدلة Git وملفات المصدر من الحالة النهائية فقط. تُفصل أدلة الفروقات المرحلية وغير المرحلية والمقارنة مع المرجع الأساسي، بينما يبقى `status-short.txt` و`changed-files.json` المصدر الموثوق للملفات غير المتتبعة. يؤدي فشل سلامة أي من التغييرات المرحلية أو غير المرحلية أو غير المتتبعة أو المرجع الأساسي إلى `VerificationFailed`.

### السلامة والأمن

تُنسخ ملفات المصدر بلا تعديل وتُعاد مطابقة بصماتها قبل الأرشفة. يميز الفحص المحافظ النص عن الملفات الثنائية التي تبقى مطابقة بايتًا. تؤدي روابط الاعتماد ذات بيانات الدخول والقيم الواقعية لكلمات المرور والأسرار والرموز والتفويض والمفاتيح الخاصة إلى فشل مغلق. تُستبعد ملفات `.env` المتداخلة دون حساسية لحالة الأحرف، ويُسمح فقط بالاسم الصغير الدقيق `.env.example` مع استمرار فحص محتواه. تسجل الأدلة المنقحة بصمات المخرجات الخام غير القابلة للعكس وبصمة الملف المنقح وعدد التنقيحات.

### التصدير والاسترداد

يفحص مدقق TypeScript الملفات النصية غير المتتبعة للفراغات النهائية وعلامات التعارض دون تعديل فهرس Git، ويتجاوز الملفات الثنائية بأمان. يجب أن تتطابق مسارات `bundleFiles` تمامًا مع كل حمولات ZIP باستثناء `manifest.json`، وتفشل الحزمة عند النقص أو الزيادة أو التكرار أو اختلاف البصمة. يجب أن يبقى مسار الإخراج داخل المستودع عبر أسلاف حقيقيين غير رمزيين وأن يكون متجاهلًا بواسطة Git.

### النشر الذري للأدلة

في بداية كل تشغيل تنشئ الأداة معرف استدعاء قويًا عشوائيًا وخاليًا من فواصل المسار، وتستخدم المعرف نفسه في أسماء كل الملفات المؤقتة المحلية وعلى سطح المكتب وفي مسبار الصلاحيات. قبل التحقق المكلف تنشئ الأداة المسبار المملوك للاستدعاء إنشاءً حصريًا داخل `Desktop/QSC-Reviews` وتزيله بعد فحص القراءة والكتابة والربط والحذف. يفشل المسار غير القابل للكتابة بالرسالة المنقحة `DesktopExportFailed: Desktop export directory is not writable.` من دون إعادة محاولة تلقائية.

يستخدم نشر ZIP وملف البصمة داخل المستودع ونشر التقرير النهائي وZIP وملف البصمة على سطح المكتب مرحلتين. تنشئ مرحلة التحضير ملفات `.review-temp` فريدة للاستدعاء وبإنشاء حصري داخل مجلدات الوجهة، ولا تختار اسمًا مؤقتًا بفحص الوجود ثم تكتب إليه بطريقة قابلة للاستبدال. يُنسخ التقرير بايتًا ببايت وتُطابق بصمته مع التقرير المصدر والتقرير داخل الحزمة، وتُطابق نسخة ZIP على سطح المكتب مع ZIP المحلي، ويُتحقق من ملف البصمة المنفصل، وتُفحص استقرار حالة المستودع قبل ظهور أي اسم نهائي.

الأسماء هي `QSC-Task-{task}-Final-Report.md` و`QSC-Task-{task}-Review.zip` و`QSC-Task-{task}-Review.zip.sha256`. إذا وُجد أي اسم منها، يُطبّق طابع زمني UTC واحد، وعند الحاجة عداد مشترك واحد، على الأسماء الثلاثة. يُنشأ كل هدف نهائي عبر رابط صلب ذري من ملف مؤقت مكتمل في المجلد نفسه، فلا يستبدل الرابط هدفًا موجودًا ولا يكشف بايتات نهائية جزئية. قد يحل ناشران الأسماء النهائية نفسها، لكن الملفات المؤقتة الفريدة تعزل التحضير ولا يستطيع إنشاء الأهداف إلا الأول.

يقتصر التعويض على المسارات المؤقتة التي نجح فتحها الحصري والأهداف النهائية التي أبلغ رابطها الذري حالة `Published`. لا يُنظف `DestinationExists` لأنه قد يكون تاريخيًا، ولا يُحذف الهدف الغامض عند رمي العملية أو إبلاغ `StateUnknown` بل يصبح مطلوب المصالحة. يستمر التنظيف لكل المسارات الأخرى المثبتة الملكية حتى بعد فشل إزالة واحدة. يبلغ أي غموض أو فشل تنظيف `ArtifactPublicationPartialFailure` بالعملية `publish-review-artifacts` والقيمة `reconciliationRequired: true`. تبقى بقايا `.review-temp` المجهولة محفوظة، ولا يترك النجاح ملفات مؤقتة للاستدعاء الحالي، بينما قد يترك انقطاع العملية بقايا موسومة بمعرفه تتطلب الفحص.
