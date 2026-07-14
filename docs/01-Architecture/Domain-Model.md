# QSC Domain Model

# نموذج المجال لمنصة QSC

---

## Purpose | الهدف

### English

This document defines the main business entities of QSC Platform before designing the database.

### العربية

هذه الوثيقة تحدد الكيانات الأساسية في منصة QSC قبل تصميم قاعدة البيانات.

---

## Core Entities | الكيانات الأساسية

### Company | الشركة

Represents a tenant in the platform.

تمثل الشركة التي تستخدم المنصة وتمتلك بياناتها الخاصة.

---

### Workspace | مساحة العمل

Represents the working environment for a company.

تمثل بيئة العمل الخاصة بكل شركة داخل المنصة.

---

### Department | القسم

Highest level of product organization.

أعلى مستوى لتنظيم المنتجات.

Example | مثال:

- Computers | أجهزة الكمبيوتر
- Security | المراقبة والأمن
- Printers | الطابعات

---

### Category | التصنيف

Groups similar products under a department.

يجمع المنتجات المتشابهة داخل القسم.

Example | مثال:

- Laptops | لابتوبات
- Cameras | كاميرات
- Monitors | شاشات

---

### Product Model | نموذج المنتج

Defines the structure and behavior of a product type.

يحدد بنية وسلوك نوع المنتج.

It controls:

- Specifications
- Filters
- Display Rules
- Comparison Rules

يتحكم في:

- المواصفات
- الفلاتر
- طريقة العرض
- قواعد المقارنة

Example | مثال:

- Gaming Laptop
- Business Laptop
- Bullet Camera
- PTZ Camera

---

### Brand | العلامة التجارية

Represents the manufacturer or brand.

تمثل الشركة المصنعة أو العلامة التجارية.

Example | مثال:

- Lenovo
- HP
- Dahua
- Hikvision

---

### Product | المنتج

Represents the actual item shown in the catalog.

يمثل المنتج الحقيقي الذي يظهر في الكتالوج.

Product belongs to Product Model only.

المنتج يرتبط بـ Product Model فقط.

---

### Specification Field | حقل المواصفة

Represents one dynamic specification field.

يمثل حقل مواصفة ديناميكي.

Example | مثال:

- CPU
- RAM
- GPU
- Resolution
- Lens
- PoE

---

### Product Specification | مواصفة المنتج

Stores the actual value of a specification for a product.

تخزن القيمة الفعلية لمواصفة معينة داخل منتج.

Example | مثال:

Product: Lenovo LOQ 15  
Field: RAM  
Value: 16GB

---

## Main Relationship | العلاقة الرئيسية

```text
Company
  ↓
Workspace
  ↓
Department
  ↓
Category
  ↓
Product Model
  ↓
Product
  ↓
Product Specifications
```

---

## Specification Template Architecture Update | تحديث معمارية قوالب المواصفات

### English

Category and optional Device Class determine the Specification Template.

Device Class is optional by Category. Laptop categories may use Gaming, Business, Personal, or Workstation. CCTV Camera categories can skip Device Class.

Product Models reference Category, Brand, and optional Device Class. Products only provide Specification Values for fields defined by the resolved Specification Template.

Specification Fields are reusable workspace-level definitions. Template Fields connect a Specification Template to those reusable fields and define whether each field is required, filterable, and how it is sorted.

```text
Category + optional Device Class
  -> Specification Template
  -> Template Fields
  -> Reusable Specification Fields

Product Model
  -> Category
  -> optional Device Class
  -> Brand

Product
  -> Product Model
  -> Specification Values
```

### العربية

التصنيف وفئة الجهاز الاختيارية يحددان قالب المواصفات.

فئة الجهاز اختيارية حسب التصنيف. تصنيفات اللابتوب قد تستخدم ألعاب أو أعمال أو شخصي أو محطة عمل. تصنيفات كاميرات CCTV يمكنها تخطي فئة الجهاز.

نماذج المنتجات ترتبط بالتصنيف والعلامة التجارية وفئة الجهاز الاختيارية. المنتجات تقدم قيم المواصفات فقط للحقول المعرفة في قالب المواصفات الذي يتم تحديده.

حقول المواصفات تعريفات قابلة لإعادة الاستخدام على مستوى مساحة العمل. تربط حقول القالب بين قالب المواصفات وهذه الحقول القابلة لإعادة الاستخدام، وتحدد هل الحقل مطلوب أو قابل للتصفية وترتيبه.
