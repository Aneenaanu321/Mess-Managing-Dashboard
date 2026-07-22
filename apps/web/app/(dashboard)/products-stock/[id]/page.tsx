"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { useProduct, useUpdateProduct, PRODUCT_CATEGORIES } from "@/lib/inventory";
import { hasPermission, useCurrentUser } from "@/lib/auth";
import { Badge, Button, Card, Input, Label, Select } from "@/components/ui";

export default function ProductDetailPage() {
  const params = useParams<{ id: string }>();
  const { data: product, isLoading } = useProduct(params.id);
  const { data: user } = useCurrentUser();
  const updateProduct = useUpdateProduct();

  const [form, setForm] = useState({ basePrice: "", costPrice: "", isActive: true, category: PRODUCT_CATEGORIES[0] ?? "RFID_READER" });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (product) {
      setForm({
        basePrice: product.basePrice,
        costPrice: product.costPrice,
        isActive: product.isActive,
        category: product.category,
      });
    }
  }, [product]);

  if (isLoading) return <p className="text-sm text-slate-500">Loading…</p>;
  if (!product) return <p className="text-sm text-slate-500">Product not found.</p>;

  const canEdit = hasPermission(user, "inventory:adjust");

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    try {
      await updateProduct.mutateAsync({
        id: product!.id,
        input: {
          basePrice: Number(form.basePrice),
          costPrice: Number(form.costPrice),
          isActive: form.isActive,
          category: form.category,
        },
      });
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update product");
    }
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-400">{product.sku}</p>
          <h1 className="text-xl font-semibold text-primary">{product.name}</h1>
          <p className="text-sm text-slate-500">{product.brand ?? "No brand"}</p>
        </div>
        <Badge tone={product.isActive ? "green" : "slate"}>{product.isActive ? "Active" : "Inactive"}</Badge>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Details</h2>
          <dl className="space-y-2 text-sm">
            <Row label="Category" value={product.category.replaceAll("_", " ")} />
            <Row label="Unit" value={product.unit} />
            <Row label="Base Price" value={`${Number(product.basePrice).toLocaleString()} ${product.currency}`} />
            <Row label="Cost Price" value={`${Number(product.costPrice).toLocaleString()} ${product.currency}`} />
            <Row label="Reorder Level" value={product.reorderLevel} />
            <Row label="Serialized" value={product.isSerialized ? "Yes" : "No"} />
          </dl>
        </Card>

        <Card className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-primary">Update Product</h2>
          {canEdit ? (
            <form onSubmit={handleSave} className="space-y-3">
              <div>
                <Label htmlFor="category">Category</Label>
                <Select
                  id="category"
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value as typeof form.category })}
                >
                  {PRODUCT_CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c.replaceAll("_", " ")}
                    </option>
                  ))}
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="basePrice">Base price</Label>
                  <Input
                    id="basePrice"
                    type="number"
                    min={0}
                    step="0.01"
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
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
                <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
                Active
              </label>
              {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
              {saved && <p className="text-sm text-emerald-600">Saved.</p>}
              <Button type="submit" disabled={updateProduct.isPending}>
                {updateProduct.isPending ? "Saving…" : "Save Changes"}
              </Button>
            </form>
          ) : (
            <p className="text-sm text-slate-500">You don&apos;t have permission to edit products.</p>
          )}
        </Card>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-slate-100 dark:border-slate-700 pb-2">
      <dt className="text-slate-500">{label}</dt>
      <dd className="font-medium text-primary">{value}</dd>
    </div>
  );
}
