# Coding Standards

# معايير كتابة الكود

## Language | اللغة

### Code

English only.

### Documentation

English + Arabic.

---

## Naming Convention | التسمية

Components → PascalCase

Example:

ProductCard.tsx

Functions → camelCase

Example:

getProducts()

Variables → camelCase

Example:

productList

Folders → lowercase

Example:

catalog

---

## Rules | القواعد

- No Hardcoded Business Logic.
- No direct database calls inside Components.
- Business Logic belongs to Services.
- Shared code belongs to shared.
- Domain code belongs to domains.

---

## Git

One feature = One commit.

One sprint = Stable release.
