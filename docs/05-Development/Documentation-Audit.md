# Documentation Audit | تدقيق الوثائق

**Status:** Completed for Foundation Task 0 · **Last Updated:** 2026-07-19 · **Scope:** All pre-refactor files under `docs/`

## English

Status key: **current complementary** remains valid within its scope; **Historical Reference** remains useful but is not authoritative; **Superseded** has a visible replacement notice and must not guide new implementation. No pre-refactor document was deleted.

| Current path | Title / topic | Status and validity | Duplicate | Destination / action | Important content preserved |
|---|---|---|---|---|
| `docs/Vision.md` | Platform Vision | Superseded | yes | Constitution Vision | SaaS growth, mission, motto |
| `docs/Architecture.md` | Platform Architecture | Superseded | yes | current Architecture index | layers, service/repository flow, future modules |
| `docs/Catalog.md` | Catalog Engine | Superseded | yes | Catalog Architecture | hierarchy and definitions |
| `docs/CHANGELOG.md` | Sprint 02 changelog | Historical Reference | no | retain | completed-work record |
| `docs/00-Project/Vision.md` | Short vision | Superseded | yes | Constitution Vision | Multi-Tenant catalog direction |
| `docs/00-Project/QSC-Product-Vision.md` | Detailed product vision | retain; valuable | overlaps | reference Constitution and Roadmap | values, responsive philosophy, employee/data/knowledge principles |
| `docs/00-Project/QSC-Product-Design-Principles.md` | Product design principles | retain; valid | overlaps | reference UX/design constitution | employee-first, context, recovery, quality, search, guidance |
| `docs/00-Project/QSC-Development-Strategy.md` | Development strategy | retain; valid | partial | reference Development | milestones, tests, review, Git, responsive/UX review |
| `docs/00-Project/Project-Status.md` | Project status | Historical Reference | no | Current Roadmap | status caveats |
| `docs/00-Project/Roadmap.md` | Original roadmap | Historical Reference | partial | Current Roadmap | completed sprints and future phases |
| `docs/01-Architecture/Architecture.md` | Layer architecture | retain; valid | yes | reference Architecture Principles | dependency, tenant and responsive rules |
| `docs/01-Architecture/Catalog.md` | Catalog domain | retain; valid detail | partial | reference Catalog docs | responsibilities, templates, option catalog |
| `docs/01-Architecture/Domain-Model.md` | Domain model | retain; valid foundation | partial | reference Domain docs | entities, hierarchy, template relationships |
| `docs/01-Architecture/QSC-Knowledge-Engine-Vision.md` | Knowledge vision | Superseded | no | current Knowledge vision | boundary, items, consumers, roadmap |
| `docs/02-Design/QSC-UX-Guidelines.md` | UX guidelines | retain; valid | overlaps | reference UX constitution | bilingual rules, guidance, recovery, mobile/responsive behavior |
| `docs/02-Design/Product-Entry-Workflow.md` | Product Entry workflow | retain; authoritative detail | partial | reference Product Entry Architecture | steps, state preservation, validation, images, quality/readiness |
| `docs/02-Design/Product-Entry-Modes.md` | Entry modes | retain; mixed status | partial | reference Product Entry + Roadmap | standard/context/batch/draft/import/AI modes and boundaries |
| `docs/02-Design/Product-Entry-Future-Enhancements.md` | Entry enhancements | retain; future | partial | merge/reference Deferred Decisions | camera templates, image recovery/processing, review evolution |
| `docs/02-Development/Coding-Standards.md` | Coding standards | retain; valid | partial | reference Engineering Principles | naming and layer rules |
| `docs/02-Development/Development-Workflow.md` | Development workflow | retain; valid | partial | reference Contribution guide | before/during/verification workflow |
| `docs/02-Development/Git-Workflow.md` | Git workflow | retain; valid | no | retain/reference Development | branch, commit, review rules |
| `docs/03-Database/Database.md` | Database direction | retain; future | partial | reference Persistence Boundaries | tenant ownership and Supabase guidance |
| `docs/03-Sprints/Sprint-02.md` | Sprint 02 | Historical Reference | no | retain | implementation record and discoveries |
| `docs/04-Reference/Decisions.md` | Project decisions | Superseded | yes | Constitution + current ADR register | DDD, Clean Architecture, Multi-Tenant, mock-first, responsive |
| `docs/04-Reference/Future-Smart-Sales-Features.md` | Smart sales future | retain; vision | partial | Future Capabilities | search, AI assistant, confirmed-data safeguards |
| `docs/04-Reference/Glossary.md` | Small glossary | Superseded | yes | Ubiquitous Language | company/catalog hierarchy and WhatsApp behavior |
| `docs/05-Sprints/Sprint-01-Foundation.md` | Sprint 01 | Historical Reference | no | retain | foundation completion and lessons |
| `docs/ADR/README.md` | Original ADR index | Historical Reference index | new index overlaps | current ADR index | ADR process and old numbering |
| `docs/ADR/ADR-0002-Category-Device-Class-Specification-Templates.md` | Template selection | retain; Accepted | no | Product Specifications reference | optional Device Class, controlled template resolution |
| `docs/ADR/ADR-0003-Assisted-Product-Data-Entry.md` | Assisted entry | retain; future direction | partial | Future Capabilities | suggestions with confirmation and fallback |
| `docs/ADR/ADR-0004-Context-Aware-Product-Entry.md` | Context-aware entry | retain; Accepted | partial | Product Entry reference | never ask twice, context rules |
| `docs/ADR/ADR-0005-Product-Lifecycle-and-Soft-Delete.md` | Older lifecycle decision | Superseded | yes | ADR-001 Product Lifecycle; content retained | prior lifecycle/soft-delete rationale |
| `docs/ADR/ADR-0006-Impact-Analysis-and-Safe-Reconciliation.md` | Safe reconciliation | retain; Accepted/future | no | Future Capabilities | impact preview, compatible-value preservation |
| `docs/ADR/ADR-0007-Context-Aware-Smart-Search.md` | Smart search | retain; future | no | Future Capabilities | context/global search, confirmed data |
| `docs/ADR/ADR-0008-Dynamic-Context-Aware-Template-Generation-Engine.md` | Template generation | retain; future-heavy | no | Future Capabilities | identity, import validation, self-description |
| `docs/ADR/ADR-0009-Sales-Intelligence-Engine-Architecture.md` | Sales intelligence | retain; vision | no | Future Capabilities | product understanding, safeguards, evolution |

## العربية

شمل التدقيق جميع الملفات السابقة. تعني «مكمل حالي» أن الوثيقة صالحة ضمن نطاقها، و«مرجع تاريخي» أنها مفيدة لكنها غير معتمدة كمصدر حقيقة حالي، و«تم استبدالها» أنها تحمل ملاحظة ظاهرة ورابطاً إلى البديل ولا يجوز أن توجه تنفيذاً جديداً. لم يُحذف أي ملف أو معنى فريد. يحفظ الجدول الرؤية والمبادئ وأسباب القرارات ومسارات الإدخال والمواصفات والخيارات المضبوطة والصور والاستعادة والجودة والجاهزية والقواعد السياقية والمعرفة والأفكار المستقبلية.
