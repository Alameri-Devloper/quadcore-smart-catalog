"use client";

import { useState } from "react";
import { SmartSelect } from "@/shared/ui/SmartSelect";
import { DepartmentService } from "@/domains/catalog/services/department.service";
import { CategoryService } from "@/domains/catalog/services/category.service";
import { CatalogSelectionService } from "@/domains/catalog/services/catalog-selection.service";

const WORKSPACE_ID = "WS-001";

export function CatalogSelector() {
  const [departmentId, setDepartmentId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [brandId, setBrandId] = useState("");
  const [productModelId, setProductModelId] = useState("");

  const departments = DepartmentService.getDepartmentsByWorkspace(WORKSPACE_ID);

  const categories = departmentId
    ? CategoryService.getCategoriesByDepartment(departmentId)
    : [];

  const brands =
    departmentId && categoryId
      ? CatalogSelectionService.getBrandsBySelection({
          workspaceId: WORKSPACE_ID,
          departmentId,
          categoryId,
        })
      : [];

  const productModels =
    departmentId && categoryId && brandId
      ? CatalogSelectionService.getProductModelsBySelection({
          workspaceId: WORKSPACE_ID,
          departmentId,
          categoryId,
          brandId,
        })
      : [];

  return (
    <div className="rounded-xl bg-white p-4 shadow">
      <h2 className="mb-4 text-lg font-bold">Catalog Selector</h2>

      <div className="grid gap-4 md:grid-cols-4">
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
            setProductModelId("");
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
            setProductModelId("");
          }}
        />

        <SmartSelect
          label="Brand"
          value={brandId}
          placeholder="Select brand"
          disabled={!categoryId}
          options={brands.map((brand) => ({
            label: brand.name,
            value: brand.id,
          }))}
          onChange={(value) => {
            setBrandId(value);
            setProductModelId("");
          }}
        />

        <SmartSelect
          label="Product Model"
          value={productModelId}
          placeholder="Select product model"
          disabled={!brandId}
          options={productModels.map((productModel) => ({
            label: productModel.name,
            value: productModel.id,
          }))}
          onChange={setProductModelId}
        />
      </div>
    </div>
  );
}
