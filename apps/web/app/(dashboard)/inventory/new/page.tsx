"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateProduct, PRODUCT_CATEGORIES } from "@/lib/inventory";
import { Button, Input, Label, Select, Card } from "@/components/ui";

export default function NewProductPage() {
  const router = useRouter();
  const createProduct = useCreateProduct();
  const [form, setForm] = useState({
    sku: "",
    name: "",
    category: PRODUCT_CATEGORIES[0] ?? "RFID_READER",
    brand: "",
    unit: "PCS",
    basePrice: "",
    costPrice: "",
    currency: "AED",
    reorderLevel: "",
    isSerialized: false,
    isActive: true,
  });
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    try {
      const product = await createProduct.mutateAsync({
        sku: form.sku,
        name: form.name,
        category: form.category,
        brand: form.brand || undefined,
        unit: form.unit || undefined,
        basePrice: Number(form.basePrice),
        costPrice: form.costPrice ? Number(form.costPrice) : undefined,
        currency: form.currency || undefined,
        reorderLevel: form.reorderLevel ? Number(form.reorderLevel) : undefined,
        isSerialized: form.isSerialized,
        isActive: form.isActive,
      });
      router.push(`/inventory/${product.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create product");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="mb-6 text-xl font-semibold text-slate-900">New Product</h1>

      <Card className="p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="name">Name</Label>
              <Input id="name" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="category">Category</Label>
              <Select id="category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}>
                {PRODUCT_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c.replaceAll("_", " ")}
                  </option>
                ))}
              </Select>
            </div>
            <div>
              <Label htmlFor="brand">Brand</Label>
              <Input id="brand" value={form.brand} onChange={(e) => setForm({ ...form, brand: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="basePrice">Base price</Label>
              <Input
                id="basePrice"
                type="number"
                min={0}
                step="0.01"
                required
                value={form.basePrice}
                onChange={(e) => setForm({ ...form, basePrice: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="costPrice">Cost price</Label>
              <Input
                id="costPrice"
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="currency">Currency</Label>
              <Input id="currency" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="unit">Unit</Label>
              <Input id="unit" value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="reorderLevel">Reorder level</Label>
              <Input
                id="reorderLevel"
                type="number"
                min={0}
                value={form.reorderLevel}
                onChange={(e) => setForm({ ...form, reorderLevel: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={form.isSerialized}
                onChange={(e) => setForm({ ...form, isSerialized: e.target.checked })}
              />
              Serialized (tracked by serial number)
            </label>
            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
              Active
            </label>
          </div>

          {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => router.back()}>
              Cancel
            </Button>
            <Button type="submit" disabled={createProduct.isPending}>
              {createProduct.isPending ? "Creating…" : "Create Product"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
}
