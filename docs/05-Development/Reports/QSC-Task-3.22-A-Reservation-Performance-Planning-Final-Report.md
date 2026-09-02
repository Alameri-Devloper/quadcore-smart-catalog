# QSC Task 3.22-A Reservation Persistence / Query Performance Planning Final Report

## Status

ReadyForReview

## Date

2026-09-02

## Task

Task 3.22-A Reservation Persistence / Query Performance Planning Gate. This was a planning and PostgreSQL evidence task only. No A1–A5 application implementation, UI, production data access, dependency change, or database migration was performed.

## Branch

`docs/task-3.22-a-reservation-performance-planning`

## Baseline

- Required and verified HEAD/base: `69f0bd48628a5ae4018504dae8bce1d11b0d8d43`.
- Integration lineage: `feature/product-entry-engine`, containing merged PR #26.
- Preserved historical planning baseline: `260b4116749d3460b8262b3ccf034b8ba26d00a5`, through PR #25.
- Preserved Task 3.21 baseline: `4f1115d2ac98fc4411ac46f081652554f6d04ec9`, through PR #24.

## English Summary

The isolated PostgreSQL evidence gate resolves the Task 3.22-A Reservation persistence question with exactly one outcome: **`EXISTING INDEX SUFFICIENT`**. For the approved Product-scoped query, PostgreSQL selected the existing `inventory_reservations_product_idx` at every measured actionable cardinality and for both first-page and deep-cursor keyset queries. No sequential scan, temporary read, temporary write, or index recheck removal was observed. The current plan showed no material concern, so the Candidate Optimization was not created or tested.

Task 3.22-A is now the sole Approved Next Implementation pending independent review, with A1 first. Task 3.22 Branch, Inventory, and Pricing Management Presentation remains Planned / blocked until all A1–A5 slices are independently reviewed and merged.

## Arabic Summary | الملخص العربي

حسمت بوابة الأدلة المعزولة في PostgreSQL سؤال استمرارية حجوزات المهمة 3.22-A بنتيجة واحدة دقيقة: **`EXISTING INDEX SUFFICIENT`**. اختار PostgreSQL الفهرس الحالي `inventory_reservations_product_idx` عند جميع أحجام البيانات المقاسة، ولكل من استعلام الصفحة الأولى واستعلام المؤشر العميق المحددين بالمنتج. لم تظهر قراءة تسلسلية أو قراءة/كتابة مؤقتة أو صفوف محذوفة بسبب إعادة فحص الفهرس. ولأن الخطة الحالية لم تُظهر مصدر قلق جوهرياً، لم يُنشأ الفهرس المرشح ولم يُختبر.

تصبح المهمة 3.22-A التنفيذ التالي المعتمد الوحيد بانتظار المراجعة المستقلة، وتبدأ بالشريحة A1. وتبقى واجهة إدارة الفروع والمخزون والتسعير في المهمة 3.22 مخططة ومحجوبة حتى مراجعة جميع شرائح A1–A5 ودمجها.

## Database Safety

- The existing integration guard passed before any database work.
- The target was the loopback-only separate test database `quadcore_smart_catalog_test` on port `5432`.
- The application target and test target were different.
- Connected server address: `172.18.0.2/32` inside the local Docker network.
- Server: PostgreSQL 17.10, 64-bit Alpine build; recovery mode was false.
- Only generated, non-sensitive synthetic rows were used.
- Production access was prohibited and not used.
- No database connection string, password, credential, or real environment file is included in the evidence.

## PostgreSQL Version

PostgreSQL 17.10 on x86_64 Linux-musl, compiled as a 64-bit Alpine build. The isolated server was not in recovery.

## Current Schema

The evidence database used the repository's migration chain `0000–0015` and the existing `inventory_reservations` table. No repository or test-database schema change was made for this gate.

## Current Index

The evidence database contained the existing index exactly as declared by the current schema:

```sql
CREATE INDEX inventory_reservations_product_idx
ON public.inventory_reservations
USING btree (workspace_id, branch_id, product_id, status);
```

The primary key remained `(workspace_id, reservation_id)`. The current product index does not contain `updated_at` or `reservation_id`; the gate therefore measured PostgreSQL's real filter-and-sort plan instead of inferring migration necessity from index shape alone.

## Approved Query Contract

- Product is required and scoped by Workspace and Branch.
- Actionable statuses are exactly `Active` and `PartiallyFulfilled`.
- Ordering is exactly `updated_at DESC, reservation_id DESC`.
- Pagination is keyset-only; the page query uses no offset.
- Cursor identity contains version, query fingerprint, timestamp, and Reservation ID.
- Default limit is 24, maximum limit is 60, and the repository fetches `limit + 1` rows. The evidence used 24 as the public page size and therefore `LIMIT 25`.
- Invalid input returns 400; an empty result returns 200.

## First-Page Query

The evaluated first-page shape was:

```sql
SELECT reservation_id, branch_id, product_id, status, quantity,
       remaining_quantity, created_at, updated_at
FROM inventory_reservations
WHERE workspace_id = $1
  AND branch_id = $2
  AND product_id = $3
  AND status IN ('Active', 'PartiallyFulfilled')
ORDER BY updated_at DESC, reservation_id DESC
LIMIT 25;
```

## Deep-Keyset Query

The evaluated deep-page predicate was:

```sql
AND (
  updated_at < $4
  OR (updated_at = $4 AND reservation_id < $5)
)
ORDER BY updated_at DESC, reservation_id DESC
LIMIT 25;
```

`OFFSET` was used only once during synthetic setup to choose a deterministic cursor at 75% depth. It was not part of either query under test.

## Synthetic Data Model

Each case used one generated Workspace, Branch, and Product scope. Actionable rows were divided equally between `Active` and `PartiallyFulfilled`; an equal number of terminal rows was divided between `Fulfilled` and `Released`.

## Cardinality Matrix

| Case | Actionable rows | Terminal rows | Total scoped rows | Deep cursor depth |
| --- | ---: | ---: | ---: | ---: |
| Low | 10 | 10 | 20 | 7 |
| Typical | 100 | 100 | 200 | 75 |
| High | 1,000 | 1,000 | 2,000 | 750 |
| Stress | 10,000 | 10,000 | 20,000 | 7,500 |

## Current Index EXPLAIN Evidence

The gate captured `EXPLAIN (FORMAT JSON)` for every case and page shape. All sixteen raw plan documents—eight non-executing plans and eight analyzed plans—are preserved as sanitized JSON in the evidence bundle. Every non-executing plan selected `inventory_reservations_product_idx`; none selected a sequential scan.

## Current Index ANALYZE/BUFFERS Evidence

The gate also captured `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)` for every case and page shape.

| Case | Page | Current index selected | Candidate rows / removed | Sort | Shared blocks | Temp I/O | Execution time |
| --- | --- | --- | ---: | --- | ---: | --- | ---: |
| Low | First | Yes, Index Scan | 10 / 0 | quicksort, 26 kB | 3 hit | 0 read / 0 written | 0.084 ms |
| Low | Deep | Yes, Index Scan | 10 / 7 | quicksort, 25 kB | 3 hit | 0 / 0 | 0.080 ms |
| Typical | First | Yes, Index Scan | 100 / 0 | top-N heapsort, 28 kB | 9 hit | 0 / 0 | 0.112 ms |
| Typical | Deep | Yes, Index Scan | 100 / 75 | quicksort, 28 kB | 9 hit | 0 / 0 | 0.131 ms |
| High | First | Yes, Bitmap Index Scan | 1,000 / 0 | top-N heapsort, 28 kB | 23 hit | 0 / 0 | 0.477 ms |
| High | Deep | Yes, Bitmap Index Scan | 1,000 / 750 | top-N heapsort, 28 kB | 23 hit | 0 / 0 | 0.312 ms |
| Stress | First | Yes, Bitmap Index Scan | 10,000 / 0 | top-N heapsort, 28 kB | 217 hit | 0 / 0 | 3.775 ms |
| Stress | Deep | Yes, Bitmap Index Scan | 10,000 / 7,500 | top-N heapsort, 28 kB | 217 hit | 0 / 0 | 2.006 ms |

## Performance Interpretation

The first-page row estimates matched actual candidate rows. Deep-page estimates were conservative; at stress depth the plan estimated 5,625 survivors and produced 2,500 before the top-N limit. The plan nevertheless remained stable, index-backed, memory-bounded in the observed run, and free of temporary I/O. Execution times are supporting evidence only because this planning gate did not define a service-level latency budget.

## Candidate Optimization Decision

The proposed partial ordered index remained a Candidate Optimization only. The task required it to be created and measured only if the current plan showed a material concern. Because the current index was selected in every plan and the stress case retained a 28 kB in-memory top-N sort with no temporary I/O, that condition was not met. The candidate was neither created nor tested.

## Write / Storage Tradeoff

Avoiding an unnecessary index also avoids an additional write-maintenance path, storage allocation, vacuum/analyze work, cache pressure, and update cost for Reserve inserts, partial-fulfillment updates, release updates, and fulfillment updates. A partial ordered candidate would also incur index removal when status leaves its predicate and index-tuple maintenance whenever `updated_at` changes. These are architectural tradeoffs, not measured candidate costs; no candidate-size or write-amplification figure is claimed.

## Final Outcome

**`EXISTING INDEX SUFFICIENT`**

This decision applies to the approved Product-scoped actionable Reservation query and the measured range through 10,000 actionable rows plus equal terminal rows. The current migration chain remains `0000–0015`. Migration `0016` is **not required** and is not approved.

## Decision Rationale

The existing index constrained all plans to the exact Workspace, Branch, Product, and actionable-status scope. PostgreSQL then performed a small bounded top-N or quicksort; even the 10,000-row stress evidence used 28 kB and did not spill. A Sort node alone is not failure, and the measured plan does not justify the ongoing write/storage cost of another index for the current approved scale.

## Migration Decision

No schema change is required. Migration `0016` must not be created under this outcome.

## Task 3.22-A Implementation Decision

Task 3.22-A corrective implementation is the sole Approved Next Implementation pending independent review. A1 remains the first slice. This report does not itself implement or approve merging A1–A5.

## Task 3.22 Presentation Decision

Task 3.22 Presentation remains Planned / blocked and is not implementation-approved.

## Roadmap Changes

- Task 3.22-A is the sole Approved Next Implementation pending independent review.
- A1 is the first implementation slice; A2–A5 retain their approved order and boundaries.
- A3 must implement the exact keyset contract using the current index and include regression evidence for its plan/query behavior.
- Task 3.22 Presentation remains Planned / blocked until A1–A5 are independently reviewed and merged.
- No later task is approved by this gate.

## Files Created

- `docs/05-Development/Reports/QSC-Task-3.22-A-Reservation-Performance-Planning-Final-Report.md`
- `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/environment-safety.json`
- `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/current-schema-indexes.json`
- `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/query-shapes.json`
- `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/cardinality-matrix.json`
- `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/current-index-summary.json`
- `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/decision-summary.json`
- `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/cleanup-proof.json`
- Sixteen raw JSON plan artifacts under `artifacts/task-reviews/3.22-A-Reservation-Performance-Planning/evidence/current-index/raw/`.

## Files Modified

- `docs/06-Roadmap/Task-3.22-A-Operational-Management-Contract.md`
- `docs/06-Roadmap/Current-Roadmap.md`
- `docs/06-Roadmap/Sprint-03-Continuation.md`

## Files Deleted

- The temporary ignored evidence collector `artifacts/task-reviews/collect-reservation-current-index-evidence.ts` was removed after sanitized evidence generation.

## Architecture Changes

None. The outcome preserves the current Reservation schema/index, Domain Driven Design boundaries, Clean Architecture responsibilities, and the approved A1–A5 operational contract. No application source or migration was added.

## Database Cleanup

- Remaining generated rows matching the evidence Workspace prefix: `0`.
- Temporary Candidate Optimization created: `false`.
- Persistent test index left behind: none.
- Cleanup status: `PASS`.

## Verification

The final handoff records the exact commands and results in the generated review bundle. Verification covers branch/HEAD/ancestor integrity, clean starting state, isolated database safety, test-database migration preparation, plan capture completeness, evidence JSON parsing, documentation links and wording, secret-pattern scanning, synthetic-row cleanup, and final diff scope. The task intentionally does not run `npm audit` or the full application test suite because no application implementation or dependency change is in scope.

## Git Integrity

- No stage, commit, push, merge, reset, checkout, or Git-content deletion was performed.
- The branch and baseline commit were not changed.
- Only the requested planning documents and report are source-controlled changes.

## DEV-001 Integrity

- The review bundle contains exact changed source files and sanitized generated evidence.
- Credentials, connection strings, real environment files, and production data are excluded.
- The repository-local ZIP and its SHA-256 sidecar are generated fresh after final verification and exported to the Desktop using the task-specific filenames.

## Risks

- Future production data may have a different actionable/terminal distribution or stronger per-Product skew than the generated matrix.
- A materially changed query contract or PostgreSQL plan could invalidate this bounded conclusion.

## Known Limitations

- Measurements used synthetic generated data on PostgreSQL 17.10 in a local isolated Docker test database.
- Buffer evidence was warm-cache (`shared hit`); no cold-cache storage benchmark was performed.
- The highest measured density was 10,000 actionable rows for one Workspace/Branch/Product plus 10,000 terminal rows.
- Re-measure before adding an index if actionable density, distribution, PostgreSQL version, query shape, selected plan, sort spill behavior, or operational requirements change materially.

## Summary

The planning gate is complete with `EXISTING INDEX SUFFICIENT`. The current product/status index supports the approved Reservation keyset query across the required representative matrix without a material plan concern. No Candidate Optimization or migration is justified for the current contract.

## Next Recommendation

Approve this planning evidence independently, then implement Task 3.22-A slice A1 only. Do not start A2–A5 or Task 3.22 Presentation automatically; each slice must follow its defined review and merge sequence.
