# Catalog Architecture | معمارية الكتالوج

**Status:** Active · **Last Updated:** 2026-07-19 · **Scope:** Catalog domain

## English

The immutable Product media-root registry and provider-neutral storage foundation are defined by [ADR-012](../ADR/ADR-012-Product-Media-Root-Registry-and-Local-Storage-Foundation.md). Product media roots remain independent from the Product Aggregate.

Catalog owns product definitions, Products, their specification values, images metadata, and lifecycle. Start with [Product Aggregate](Product-Aggregate.md) and [Lifecycle Foundation](Product-Lifecycle-Foundation.md). Existing detailed workflow, option-set, camera-template, recovery, quality, and contextual-rule knowledge remains indexed by the [audit](../../05-Development/Documentation-Audit.md).

## العربية

يحدد [ADR-012](../ADR/ADR-012-Product-Media-Root-Registry-and-Local-Storage-Foundation.md) سجل جذور وسائط Product الثابت وأساس التخزين المحايد للمزوّد، وتبقى الجذور مستقلة عن Product Aggregate.

يملك الكتالوج تعريفات المنتجات والمنتجات وقيم مواصفاتها وبيانات الصور ودورة الحياة. تبدأ القراءة من وثيقة التجميع ودورة الحياة، بينما يفهرس التدقيق المعرفة التفصيلية السابقة دون فقدها.

