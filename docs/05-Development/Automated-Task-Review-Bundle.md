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

ZIP and checksum publication uses two phases. Preparation creates only invocation-owned `.review-temp` files in the final destination directories. The local temporary ZIP is reopened and verified, its temporary checksum is verified, and the Desktop temporary pair is checked for byte equality when export is enabled. Repository stability is checked while no final-looking name exists. Only then are local and Desktop pairs renamed to their independently collision-safe final names. An export-enabled run is all-or-nothing: a preparation, export, checksum, or stability failure publishes neither destination.

Failure cleanup removes only temporary or newly promoted artifacts owned by that invocation. It never removes source, user data, Git content, database/media files, or prior review evidence. Successful runs recheck both final pairs and leave no `.review-temp` files. If execution is interrupted, inspect and remove only stale `.review-temp` files after confirming no invocation is active; final ZIP/checksum pairs remain immutable review evidence.

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

يستخدم نشر ZIP وملف البصمة مرحلتين. تنشئ مرحلة التحضير ملفات `.review-temp` مملوكة للاستدعاء فقط، ثم تتحقق من ZIP المحلي وبصمته ومن تطابق نسخة سطح المكتب بايتًا. تُفحص استقرار حالة المستودع قبل ظهور أي اسم نهائي. بعد نجاح جميع الفحوص تُعاد تسمية الزوج المحلي وزوج سطح المكتب إلى أسماء نهائية مستقلة وآمنة من التصادم. عند طلب التصدير تكون العملية شاملة أو معدومة؛ فلا يُنشر أي زوج إذا فشل التحضير أو النسخ أو البصمة أو الاستقرار.

يقتصر التنظيف عند الفشل على الملفات المؤقتة أو الجديدة التي أنشأها الاستدعاء نفسه، ولا يحذف المصدر أو بيانات المستخدم أو محتوى Git أو قواعد البيانات أو الوسائط أو أدلة مراجعة سابقة. لا يترك النجاح ملفات مؤقتة. بعد انقطاع التشغيل يجب فحص ملفات `.review-temp` القديمة وإزالتها فقط بعد التأكد من عدم وجود استدعاء نشط، بينما تبقى أزواج ZIP النهائية أدلة ثابتة.
