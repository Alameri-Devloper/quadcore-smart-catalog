# QSC Platform Architecture

> **Historical Document — Superseded**
>
> This document is preserved for project history and is not the current authoritative source.
>
> Authoritative replacement: [Current Architecture](01-Architecture/README.md)
>
> **وثيقة تاريخية — تم استبدالها**
>
> تم الاحتفاظ بهذه الوثيقة لحفظ تاريخ المشروع، لكنها ليست المرجع الحالي المعتمد.
>
> الوثيقة المعتمدة البديلة: [المعمارية الحالية](01-Architecture/README.md)

# معمارية منصة QSC

---

# Purpose | الهدف

## English

This document describes the architecture of QSC Platform.

The goal is to keep the system scalable, maintainable, modular, and easy to extend.

---

## العربية

تصف هذه الوثيقة المعمارية العامة لمنصة QSC.

الهدف هو بناء نظام قابل للتوسع، سهل الصيانة، ومنظم بطريقة تسمح بإضافة ميزات جديدة دون إعادة بناء النظام.

---

# Architecture Style | أسلوب المعمارية

## English

QSC follows:

- Domain Driven Design (DDD)
- Modular Architecture
- Feature-Based Structure
- Multi-Tenant Design
- Responsive First

---

## العربية

تعتمد المنصة على:

- التصميم المعتمد على المجالات (DDD)
- المعمارية القائمة على الوحدات
- تنظيم المشروع حسب الميزات
- دعم تعدد الشركات
- تصميم متجاوب للكمبيوتر والجوال منذ البداية

---

# Main Structure | الهيكل الرئيسي

```text
app/
domains/
shared/
docs/
public/
```

---

# Domains | المجالات

Core

Catalog

Company

Employees

Sales

Analytics

Future:

CRM

Inventory

AI

CMS

---

# Shared Layer | الطبقة المشتركة

Contains:

- UI Components
- Shared Components
- Utilities
- Helpers

No business logic.

---

# App Layer

Contains only:

- Pages
- Layouts
- Route Handlers

No business logic.

---

# Business Logic

Business logic belongs inside Domains.

Never inside Pages.

---

# Data Access

Pages

↓

Services

↓

Repository

↓

Database

---

# Core Principles | المبادئ الأساسية

- Single Responsibility
- Reusable Components
- No Hardcoded Business Logic
- Separation of Concerns
- Scalability First

---

# Future Modules | الوحدات المستقبلية

Catalog Engine

Sales Engine

CRM Engine

Inventory Engine

Analytics Engine

Notification Engine

AI Engine
