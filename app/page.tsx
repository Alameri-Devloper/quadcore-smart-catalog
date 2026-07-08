"use client";

import { useState } from "react";
export default function Home() {
  const [search, setSearch] = useState("");
  const products = [
    {
      id: 1,
      name: "Lenovo LOQ 15",
      cpu: "Ryzen 7 250",
      ram: "16GB",
      gpu: "RTX 5050",
      price: 870,
      type: "🎮 جيمنج",
    },
    {
      id: 2,
      name: "HP Victus",
      cpu: "Intel i7",
      ram: "16GB",
      gpu: "RTX 4060",
      price: 950,
      type: "🎮 جيمنج",
    },
    {
      id: 3,
      name: "Dell Latitude 7420",
      cpu: "Intel i5",
      ram: "16GB",
      gpu: "Intel UHD",
      price: 600,
      type: "💼 بزنس",
    },
  ];
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
          <div key={product.id} className="bg-white p-4 rounded-xl shadow">
            <div className="h-40 bg-gray-200 rounded-lg mb-3"></div>

            <h2 className="font-bold text-lg">{product.name}</h2>

            <p className="text-sm text-gray-600">
              {product.cpu} - {product.ram} - {product.gpu}
            </p>

            <p className="mt-2 font-bold text-green-600">${product.price}</p>

            <p className="text-xs text-blue-500 mt-1">{product.type}</p>

            <div className="flex gap-2 mt-3">
              <a
                href={`https://wa.me/967733733330?text=${encodeURIComponent(
                  `السلام عليكم، أريد الاستفسار عن المنتج:\n${product.name}\nالمواصفات: ${product.cpu} - ${product.ram} - ${product.gpu}\nالسعر: $${product.price}`,
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 bg-green-500 text-white py-1 rounded text-center"
              >
                واتساب
              </a>

              <button className="flex-1 bg-gray-700 text-white py-1 rounded">
                تعديل
              </button>
            </div>
          </div>
        ))}
      </div>
    </main>
  );
}
