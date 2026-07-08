"use client";
import { products } from "@/app/domains/catalog/data/products";
import { ProductCard } from "@/app/domains/catalog/components/ProductCard";
import { useState } from "react";
export default function Home() {
  const [search, setSearch] = useState("");

  const filteredProducts = products.filter((p) => {
    const value = search.toLowerCase();

    return (
      p.name.toLowerCase().includes(value) ||
      p.cpu.toLowerCase().includes(value) ||
      p.gpu.toLowerCase().includes(value) ||
      p.ram.toLowerCase().includes(value) ||
      p.type.toLowerCase().includes(value)
    );
  });
  return (
    <main className="min-h-screen bg-gray-100 p-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-xl shadow">
        <h1 className="text-2xl font-bold text-center">
          Quadcore Smart Catalog
        </h1>

        {/* Search */}
        <input
          type="text"
          placeholder="🔍 ابحث عن جهاز... (Lenovo / RTX / i7)"
          className="w-full mt-4 p-3 border rounded-lg"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mt-4 justify-center">
          <button className="px-3 py-1 bg-green-500 text-white rounded-full">
            🆕 جديد
          </button>
          <button className="px-3 py-1 bg-gray-500 text-white rounded-full">
            ♻️ مستخدم
          </button>
          <button className="px-3 py-1 bg-blue-500 text-white rounded-full">
            🎮 جيمنج
          </button>
          <button className="px-3 py-1 bg-yellow-500 text-white rounded-full">
            💼 بزنس
          </button>
        </div>
      </div>

      {/* Products Section */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-6">
        {filteredProducts.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </main>
  );
}
