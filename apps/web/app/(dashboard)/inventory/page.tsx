"use client";

import { useState } from "react";
import Link from "next/link";
import { useProducts, PRODUCT_CATEGORIES, Product } from "@/lib/inventory";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Input, Select, Card } from "@/components/ui";

export default function InventoryPage() {
  const [category, setCategory] = useState("");
  const [search, setSearch] = useState("");
  const { data: user } = useCurrentUser();
  const { data, isLoading, isError } = useProducts({ category: category || undefined, search: search || undefined });

  const products = data?.data ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-primary">Inventory &amp; Catalog</h1>
          <p className="text-sm text-slate-500">
            {data?.meta?.total ?? 0} product{data?.meta?.total === 1 ? "" : "s"}
          </p>
        </div>
        {hasPermission(user, "inventory:adjust") && (
          <Link href="/inventory/new">
            <Button>+ New Product</Button>
          </Link>
        )}
      </div>

      <Card className="mb-4 flex flex-wrap items-center gap-3 p-4">
        <Input
          placeholder="Search SKU, name, brand..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-xs"
        />
        <Select value={category} onChange={(e) => setCategory(e.target.value)} className="max-w-xs">
          <option value="">All categories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>
              {c.replaceAll("_", " ")}
            </option>
          ))}
        </Select>
      </Card>

      <Card className="overflow-hidden">
        {isLoading && <p className="p-6 text-sm text-slate-500">Loading products…</p>}
        {isError && (
          <p className="p-6 text-sm text-red-600 dark:text-red-400">
            Couldn&apos;t load products. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
          </p>
        )}
        {!isLoading && !isError && products.length === 0 && (
          <p className="p-6 text-sm text-slate-500">No products match these filters yet.</p>
        )}
        {products.length > 0 && (
          <table className="w-full text-sm">
            <thead className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-left text-xs font-medium uppercase text-slate-500">
              <tr>
                <th className="px-4 py-2.5">SKU</th>
                <th className="px-4 py-2.5">Name</th>
                <th className="px-4 py-2.5">Category</th>
                <th className="px-4 py-2.5">Base Price</th>
                <th className="px-4 py-2.5">Cost Price</th>
                <th className="px-4 py-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {products.map((product: Product) => (
                <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 dark:bg-slate-800/50">
                  <td className="px-4 py-3">
                    <Link href={`/inventory/${product.id}`} className="font-medium text-brand-600 hover:underline">
                      {product.sku}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-primary">{product.name}</td>
                  <td className="px-4 py-3 text-slate-600">{product.category.replaceAll("_", " ")}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {Number(product.basePrice).toLocaleString()} {product.currency}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {Number(product.costPrice).toLocaleString()} {product.currency}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={product.isActive ? "green" : "slate"}>{product.isActive ? "Active" : "Inactive"}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
}
