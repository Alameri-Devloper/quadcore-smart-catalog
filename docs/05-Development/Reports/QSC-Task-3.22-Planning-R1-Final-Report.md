# QSC Task 3.22 Planning-R1 Final Report

## Status

ReadyForReview. The final decision remains `ReScopeRequired — not implementation-approved`; this R1 corrects planning authority only and does not approve implementation.

## Task

Task 3.22 Planning-R1 — Management Read Authority and Product Discovery Reconciliation.

## Branch and Baseline

- Branch: `docs/task-3.22-planning`
- Required ancestor and current HEAD: `4f1115d2ac98fc4411ac46f081652554f6d04ec9`
- Task 3.21 authority: Completed / merged through PR #24 at that commit
- Git policy: read-only; no checkout, switch, reset, restore, clean, stash, add, commit, merge, rebase, push, tag, or branch deletion

## English Summary

Independent review correctly found that the original Task 3.22 Planning report over-classified several complete management workflows. The Permission Registry keeps read and mutation permissions independent. A mutation route can be sufficient while the read, discovery, or disclosure contract needed to initialize and safely complete its editor remains insufficient. This R1 corrects Listing, Product discovery, Branch override, Reference Cost, base-pricing, capability, and Inventory disclosure findings. It preserves the original report as historical evidence, preserves the architecture, and leaves Task 3.22 `ReScopeRequired` and not implementation-approved.

## Arabic Summary

أثبتت المراجعة المستقلة أن تقرير تخطيط المهمة 3.22 الأصلي بالغ في تصنيف كفاية عدة مسارات إدارة كاملة. يحتفظ سجل الصلاحيات باستقلال صلاحيات القراءة والتعديل؛ لذلك قد يكون مسار التعديل كافياً بينما يظل عقد القراءة أو الاكتشاف أو الكشف اللازم لتهيئة المحرر وإكماله بأمان غير كافٍ. يصحح هذا الإصدار R1 نتائج الإدراج واكتشاف المنتجات وتجاوزات الفروع والتكلفة المرجعية والتسعير الأساسي والقدرات وكشف المخزون. ويحفظ التقرير الأصلي كدليل تاريخي والمعمارية الحالية، وتبقى المهمة 3.22 بحاجة إلى إعادة تحديد النطاق وغير معتمدة للتنفيذ.

## Supersession Notice

This report explicitly supersedes these classifications and statements in `QSC-Task-3.22-Planning-Final-Report.md`:

- “Product selection for listing managers = B” is valid only for an actor who has both `catalog.products.view` and plural `catalog.products.edit`. It is `C` for a mutation-authorized actor whose only edit permission is singular `catalog.product.edit`.
- “Read exact listing state = B” is not universal. Listing read requires `catalog.products.view`, while listing mutation accepts singular or plural edit. The complete editor is `C` for the general independently permissioned actor model unless compatible read authority is also present.
- “Branch override read/edit/clear = A” is split. The read and mutation contracts separately exist as `A`; the complete editor is `C` for the general independently permissioned actor model unless the actor also has the required read authority.
- Reference Cost management must account for both `pricing.view` and `referenceCost.view`; neither `referenceCost.manage` nor `referenceCost.branchOverride.manage` implies those reads.
- The missing server-derived capability problem is more precisely a management read/mutation authority-composition problem, not only a button-visibility problem.

The original report remains unchanged as historical evidence. Where the two reports differ, this R1 is the corrected planning authority.

## Minimum Source Reviewed

- `domains/identity/domain/permission.ts`
- `domains/catalog/branch-products/application/branch-product.use-cases.ts`
- `domains/catalog/branch-products/infrastructure/http/branch-product-route-handlers.ts`
- `domains/catalog/query/application/catalog-query.use-cases.ts`
- `domains/inventory/application/inventory.use-cases.ts`
- `domains/inventory/infrastructure/http/inventory-route-handlers.ts`
- Current Task 3.22 Planning documentation and artifacts

No repository-wide source analysis was performed.

## Source-Truth Reconciliation

1. `catalog.product.edit` and `catalog.products.edit` are distinct, independently registered codes. The standard Catalog Staff template contains singular `catalog.product.edit`, contains `catalog.products.view`, and does not contain plural `catalog.products.edit`.
2. Listing mutation accepts `catalog.product.edit` **or** `catalog.products.edit`. Listing read and the operational Branch Product read require `catalog.products.view`.
3. Task 3.18 Catalog search requires `catalog.products.view` for all callers. Non-`Published` lifecycle filters and non-`Listed` listing filters additionally require plural `catalog.products.edit` only.
4. Branch pricing read requires `pricing.view`. Retail/Wholesale Branch override mutation requires `pricing.branchOverride.manage`; the Registry does not imply one from the other.
5. Reference Cost is visible through Branch pricing only when both the outer `pricing.view` gate and `referenceCost.view` are satisfied. Base mutation uses `referenceCost.manage`; Branch override mutation uses `referenceCost.branchOverride.manage`.
6. Inventory HTTP exposes Reserve, Release, and Fulfill mutations but no reservation list/detail handler.
7. Direct Inventory read accepts `inventory.quantity.view` or `inventory.availability.view`. For availability-only actors it replaces `onHand`, `reserved`, and `damaged` with `Hidden` but retains numeric `available`, revision, and timestamp. Task 3.18 instead maps availability to `InStock` or `OutOfStock` when quantity visibility is absent.
8. `InventoryMutationView` carries `InventoryBalanceView` for balance/source/destination results, and mutation success paths construct those views without a separate `inventory.quantity.view` disclosure check.

## Listing Resource Matrix

| Resource/workflow | Existing contract | Authority composition | Corrected class |
| --- | --- | --- | --- |
| Listing mutation | `PUT /api/branches/{branchId}/products/{productId}/listing`; returned revision; optimistic `expectedRevision` | `catalog.product.edit` **or** `catalog.products.edit`, plus Branch scope | A as a mutation contract |
| Listing state/read | Listing/operational GET returns status and revision; absent state is `NotConfigured`, revision `0` | Requires `catalog.products.view`, independently of mutation permissions | A as a read contract for view-authorized actors; C for all mutation-authorized actors |
| Product discovery for plural-edit actor | Task 3.18 Catalog search and expanded lifecycle/listing filters | Requires `catalog.products.view` + `catalog.products.edit` | B by reuse/composition |
| Product discovery for singular-edit-only actor | No compatible expanded discovery | Mutation accepts `catalog.product.edit`, but Task 3.18 expansion does not | C |
| Complete Listing management editor | Needs discovery plus authoritative current status/revision plus mutation | No global implication joins these permissions | C for the general independently permissioned actor model |

Only the server-returned absent state may use revision `0`. A client must not invent `expectedRevision = 0` when it cannot retrieve authoritative listing state.

## Product Discovery Cases

| Actor case | Current discovery result | Planning conclusion |
| --- | --- | --- |
| Ordinary Catalog viewer | With `catalog.products.view`, Task 3.18 exposes its ordinary Published/Listed discovery rules | Existing Task 3.18 behavior; do not broaden disclosure |
| Listing actor with plural edit | With `catalog.products.view` + `catalog.products.edit`, expanded lifecycle and listing discovery may be reused | B |
| Listing actor with only singular edit | `catalog.product.edit` permits listing mutation but does not enable expanded Task 3.18 discovery | C — real discovery gap |
| Inventory operator | Inventory operation permissions do not imply Catalog view or plural edit | C for complete operational discovery |
| Pricing operator | Pricing management permissions do not imply Catalog view or edit | C for complete operational discovery |
| Reference Cost operator | Reference Cost permissions do not imply Catalog view or edit | C for complete operational discovery |

A future correction must reuse or safely extend canonical Task 3.18 discovery. It must not add a duplicate Product repository/search engine and must not silently broaden ordinary Catalog disclosure.

## Pricing and Reference Cost Resource Matrix

| Resource/workflow | Existing contract | Authority composition | Corrected class |
| --- | --- | --- | --- |
| Branch pricing read | Branch/Product pricing GET returns visible base, override, effective value, source, and revisions | `pricing.view` plus Branch scope; Reference Cost also needs `referenceCost.view` | A for authorized actors |
| Retail/Wholesale Branch override mutation | Existing set/clear override routes with `expectedRevision` | `pricing.branchOverride.manage` plus Branch scope | A as mutation contracts |
| Complete Retail/Wholesale Branch override editor | Needs current base/override/revision read plus mutation | Manage does not imply `pricing.view` | C for the general independently permissioned actor model; usable only when read and manage authority coexist |
| Reference Cost visibility | Included only inside Branch pricing read | `pricing.view` **and** `referenceCost.view` | A for actors with both reads |
| Reference Cost base/override mutations | Existing set/clear base and Branch override routes | `referenceCost.manage` or `referenceCost.branchOverride.manage` | A as mutation contracts |
| Complete Reference Cost editor | Needs visible current value/revision plus appropriate mutation authority | Reference Cost manage permissions imply neither `pricing.view` nor `referenceCost.view` | C |
| Workspace base-pricing editor | Mutations exist; no Branch-independent GET exists | `pricing.manage` does not imply `pricing.view`; `referenceCost.manage` does not imply `referenceCost.view` | C |

The future Workspace base-pricing management contract must provide an authoritative current value/revision read and safe server-derived management authority. It must preserve missing versus zero and must never invent revision `0` except when the server explicitly returns an absent/new state.

## Inventory and Reservation Reconciliation

- Inventory mutations remain `A` as mutation contracts, including the single atomic transfer endpoint.
- Release and Fulfill remain `C` as complete management workflows because no active reservation list/detail read exists.
- Operational Product discovery remains `C` because Inventory permissions do not imply the Catalog permissions needed for every valid target.
- Availability-only direct Inventory output remains `C` for safe management disclosure: numeric `available` still reaches the actor even though Task 3.18 uses semantic `InStock`/`OutOfStock` for the comparable Catalog visibility.
- Mutation output remains a disclosure-contract gap because detailed `InventoryBalanceView` values are returned without a separate quantity-view check.

Filtering these values only in React is prohibited. The server contract must prevent unauthorized numeric disclosure.

## Management Authority Decision Still Required

The future re-scope must explicitly choose and independently review a bounded server-side strategy, for example:

- selected Application-level permission implication for specific management operations;
- minimum management-state reads authorized by the corresponding mutation permission; or
- another bounded server-derived management projection.

Planning-R1 does not choose among these options. A global manage-implies-view rule would change authorization semantics and therefore requires explicit architecture/contract discussion. Raw permissions, role, `workspaceId`, `actorId`, and `allowedBranchIds` must not be exposed so the browser can decide authority.

## Corrected HTTP/API Sufficiency Matrix

Classification: `A` existing contract is sufficient for the named unit; `B` sufficient through compatible Presentation composition; `C` read/discovery/disclosure or authority-composition contract gap.

| UI workflow or contract unit | Class | Corrected finding |
| --- | --- | --- |
| Branch lifecycle | A | Existing list/detail/create/update/status contracts remain sufficient |
| Listing mutations | A | Existing optimistic mutation accepts singular or plural edit |
| Listing state/read for all mutation-authorized actors | C | Read needs `catalog.products.view`; mutation authority does not imply it |
| Listing Product discovery for compatible plural-edit actor | B | Reuse Task 3.18 only with `catalog.products.view` + `catalog.products.edit` |
| Listing Product discovery for singular-edit-only actor | C | Singular edit permits mutation but not expanded Task 3.18 discovery |
| Complete Listing management workflow | C | Read, discovery, and mutation authority are not universally composed |
| Inventory mutations | A | Existing named idempotent/transactional mutation contracts remain usable units |
| Reservation Release/Fulfill complete workflow | C | Reservation list/detail read is absent |
| Inventory availability-only management output | C | Direct read retains numeric `available`; mutations return detailed balances |
| Inventory/Pricing/Reference Cost operational Product discovery | C | Operational permissions imply neither Catalog view nor expanded edit discovery |
| Workspace base-pricing complete editor | C | Branch-independent current state/revision read is absent; manage/read are independent |
| Branch pricing read | A | Sufficient for `pricing.view` actor in Branch scope; Reference Cost needs its additional view permission |
| Branch override mutations | A | Retail/Wholesale and Reference Cost override mutation contracts exist |
| Complete Branch override editor for independently permissioned actors | C | Override manage does not imply the required read authority |
| Reference Cost complete editor | C | Visibility and base/override manage permissions are independent; base read is also missing |
| Atomic transfer | A | One Inventory-owned transaction and endpoint; must not be client-orchestrated |
| Browser-safe management authority | C | No bounded server-derived composition/projection exists |

An existing mutation route does not automatically make the corresponding full UI workflow `A`.

## Critical Gaps

1. **Management read/mutation permission composition:** listing, pricing, override, and Reference Cost reads are not globally implied by their mutation permissions.
2. **Listing read and Product discovery mismatch:** a valid mutation actor may lack `catalog.products.view`, and singular-only edit actors cannot use plural-edit Task 3.18 expansion.
3. **Reservation discovery/read:** no active reservation list/detail read supports safe Release/Fulfill selection.
4. **Branch-independent Workspace base-pricing state read:** authoritative current values/revisions are unavailable without an arbitrary Branch.
5. **Operational Product discovery:** Inventory, Pricing, and Reference Cost permissions do not imply the Catalog authority needed to discover every valid operational Product.
6. **Inventory numeric disclosure filtering:** availability-only reads retain numeric `available`, and mutations return detailed balances without a quantity-view disclosure gate.
7. **Browser-safe action capability or bounded management authority:** the server must resolve safe action/read composition without exposing raw authorization context.

## Risks

| Risk | Required corrective-contract control |
| --- | --- |
| A mutation-authorized user cannot load listing state/revision | Explicit Listing management read/mutation authority composition; no guessed revision |
| Singular edit is silently treated as plural edit | Preserve separate permission codes and explicitly cover singular-only discovery |
| Override manager cannot initialize current base/override/revision | Compose an authorized management read or bounded projection with override mutation authority |
| Reference Cost is inferred from manage authority | Require explicit safe visibility/management strategy; never infer visibility in React |
| Global manage-implies-view silently changes authorization semantics | Treat as an explicit architecture/contract decision before implementation |
| Release/Fulfill targets a guessed reservation | Add an independently reviewed scoped reservation read before UI approval |
| Operational user cannot discover a valid Product | Safely reuse/extend Task 3.18 without a duplicate search authority or broader ordinary disclosure |
| Availability-only actor receives numeric Inventory | Enforce server-side output filtering for reads and mutation results |
| Browser receives raw authority inputs | Return only bounded server-derived management capability/state, never raw permissions or trusted IDs/scope |

## Roadmap Decision

- Tasks 3.14–3.21: Completed / merged.
- Task 3.21: merged through PR #24 at `4f1115d2ac98fc4411ac46f081652554f6d04ec9`.
- Task 3.22: `ReScopeRequired`, Planned, and **not implementation-approved**.
- No Task 3.22 Implementation Contract exists or is approved.
- No later task and no Approved Next Implementation is created by this R1.

## قرار خارطة الطريق

- المهام 3.14–3.21 مكتملة ومدمجة.
- دُمجت المهمة 3.21 عبر طلب السحب #24 عند `4f1115d2ac98fc4411ac46f081652554f6d04ec9`.
- تبقى المهمة 3.22 مخططة و`ReScopeRequired` و**غير معتمدة للتنفيذ**.
- لا يوجد عقد تنفيذ للمهمة 3.22 ولا يعتمد هذا الإصدار إنشاءه.
- لا يعتمد R1 أي مهمة لاحقة ولا ينشئ حالة تنفيذ تالٍ معتمدة.

## Architecture Changes

None. Existing Domain ownership, DDD, Clean Architecture, multi-tenancy, server authorization, canonical Task 3.18 Product discovery, Inventory-owned atomic transfer, and repository boundaries remain unchanged. This R1 makes no permission-policy choice and introduces no ADR.

## Implementation and Data Changes

None. No UI, route handler, Application use case, repository, mock, schema, migration, dependency, or application test behavior was changed. No database operation was performed.

## Verification Results

Planning-only verification passed:

- `git diff --check` passed; Git emitted only normal Windows LF-to-CRLF working-copy warnings.
- `git status --short` and `git diff --stat` confirmed only the preserved original Planning documentation plus this R1 documentation are changed/untracked.
- Focused source assertions passed for separate singular/plural Catalog edit codes, standard Catalog Staff singular-only edit composition, Listing read/mutation permissions, Task 3.18 plural-edit expansion, Branch pricing read, Branch override manage, independent Reference Cost visibility/manage permissions, missing Reservation list/detail route, numeric availability-only Inventory output, and detailed mutation balance output.
- Task 3.22 remains `ReScopeRequired`; the branch, HEAD, and required ancestor are correct.
- No `Task-3.22-Implementation-Contract.md` exists.
- No application, schema, migration, package, lockfile, or dependency change exists.
- The fresh DEV-001 review ZIP and its detached SHA-256 passed archive/hash verification.

The full application suite, `npm audit`, database operations, and migrations were prohibited by this correction and were not run.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.22-Planning-R1-Final-Report.md`
- `artifacts/task-reviews/3.22-Planning-R1/`
- `artifacts/task-reviews/QSC-Task-3.22-Planning-R1-Review.zip` and detached checksum after verification

## Files Modified

- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`

## Files Deleted

None.

## Summary

Planning authority now distinguishes mutation-route sufficiency from complete management-workflow sufficiency. Listing, Product discovery, Branch override, Reference Cost, base pricing, Inventory disclosure, and browser-safe authority composition are corrected without changing source contracts or selecting a future authorization policy.

## الملخص

تفرق سلطة التخطيط الآن بين كفاية مسار التعديل وكفاية سير الإدارة الكامل. صُححت نتائج الإدراج واكتشاف المنتجات وتجاوزات الفروع والتكلفة المرجعية والتسعير الأساسي وكشف المخزون وتركيب السلطة الآمنة للمتصفح دون تغيير عقود المصدر أو اختيار سياسة تفويض مستقبلية.

## DEV-001 Integrity

The planning-only review bundle contains exact copies of the four Task 3.22 Planning documentation files, sanitized Git and focused-verification evidence, a SHA-256 manifest, and a detached ZIP checksum. It preserves the original Planning artifacts and excludes credentials, environment files, application source, database content, and Git internals. The generic full-suite review command was not run because this planning correction expressly prohibits the full application suite and database operations.

Repository-local artifacts:

- `artifacts/task-reviews/3.22-Planning-R1/`
- `artifacts/task-reviews/QSC-Task-3.22-Planning-R1-Review.zip`
- `artifacts/task-reviews/QSC-Task-3.22-Planning-R1-Review.zip.sha256`

Exported review copies:

- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-Planning-R1-Final-Report.md`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-Planning-R1-Review.zip`
- `C:\Users\dell\Desktop\QSC-Reviews\QSC-Task-3.22-Planning-R1-Review.zip.sha256`

## Next Recommendation

Independent review must evaluate this Planning-R1 correction. The next corrective-contract discussion should explicitly decide management read/mutation authority composition, safely reuse or extend canonical Product discovery, define Reservation reads and Branch-independent base-pricing reads, and enforce Inventory disclosure at the server. Do not create a Task 3.22 implementation branch, implementation contract, corrective API, or UI until a later independently approved re-scope authorizes it.

## التوصية التالية

يجب أن تراجع جهة مستقلة تصحيح تخطيط-R1 هذا. ينبغي أن تحسم مناقشة العقود التصحيحية التالية صراحةً تركيب سلطة القراءة/التعديل الإداري، وإعادة استخدام اكتشاف المنتجات المعتمد أو توسيعه بأمان، وتعريف قراءات الحجوزات والتسعير الأساسي المستقلة عن الفرع، وفرض كشف المخزون في الخادم. لا تُنشأ شعبة تنفيذ أو عقد تنفيذ أو API تصحيحي أو واجهة للمهمة 3.22 حتى تعتمد إعادة تحديد نطاق لاحقة ذلك بصورة مستقلة.
