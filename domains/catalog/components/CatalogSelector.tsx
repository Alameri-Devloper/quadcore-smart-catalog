"use client";

import { useState } from "react";
import { SmartSelect } from "@/shared/ui/SmartSelect";
import { DepartmentService } from "@/domains/catalog/services/department.service";
import { CategoryService } from "@/domains/catalog/services/category.service";
import { BrandService } from "@/domains/catalog/services/brand.service";

export function CatalogSelector() {
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");

  const departments = DepartmentService.getDepartmentsByWorkspace("WS-001");

  const categories = departmentId
    ? CategoryService.getCategoriesByDepartment(departmentId)
    : [];
  const brands = categoryId ? BrandService.getBrandsByWorkspace("WS-001") : [];

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <h2 className="mb-4 text-lg font-bold">Catalog Selector</h2>

      <div className="grid gap-4 md:grid-cols-3">
        <SmartSelect
          label="Department"
          value={departmentId}
          placeholder="Select department"
          options={departments.map((department) => ({
            label: `${department.icon ?? ""} ${department.name}`,
            value: department.id,
          }))}
          onChange={(value) => {
            setDepartmentId(value);
            setCategoryId("");
            setBrandId("");
          }}
        />

        <SmartSelect
          label="Category"
          value={categoryId}
          placeholder="Select category"
          options={categories.map((category) => ({
            label: `${category.icon ?? ""} ${category.name}`,
            value: category.id,
          }))}
          onChange={(value) => {
            setCategoryId(value);
            setBrandId("");
          }}
        />

        <SmartSelect
          label="Brand"
          value={brandId}
          placeholder="Select brand"
          options={brands.map((brand) => ({
            label: brand.name,
            value: brand.id,
          }))}
          onChange={setBrandId}
        />
      </div>
    </div>
  );
}
