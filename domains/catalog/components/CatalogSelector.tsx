"use client";

import { useState } from "react";
import { SmartSelect } from "@/shared/ui/SmartSelect";
import { DepartmentService } from "@/domains/catalog/services/department.service";
import { CategoryService } from "@/domains/catalog/services/category.service";

export function CatalogSelector() {
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const departments = DepartmentService.getDepartmentsByWorkspace("WS-001");

  const categories = departmentId
    ? CategoryService.getCategoriesByDepartment(departmentId)
    : [];

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <h2 className="mb-4 text-lg font-bold">Catalog Selector</h2>

      <div className="grid gap-4 md:grid-cols-2">
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
          onChange={setCategoryId}
        />
      </div>
    </div>
  );
}
