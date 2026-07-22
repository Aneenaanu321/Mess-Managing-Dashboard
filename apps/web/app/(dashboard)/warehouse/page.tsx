"use client";

import Link from "next/link";
import { useWarehouses } from "@/lib/warehouse";
import { Card } from "@/components/ui";

export default function WarehousesPage() {
  const { data: warehouses, isLoading, isError } = useWarehouses();

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-primary">Warehouse</h1>
        <p className="text-sm text-slate-500">{warehouses?.length ?? 0} warehouse{warehouses?.length === 1 ? "" : "s"}</p>
      </div>

      {isLoading && <p className="text-sm text-slate-500">Loading warehouses…</p>}
      {isError && (
        <p className="text-sm text-red-600 dark:text-red-400">
          Couldn&apos;t load warehouses. Is the API running at <code>NEXT_PUBLIC_API_URL</code>?
        </p>
      )}

      {!isLoading && !isError && (warehouses?.length ?? 0) === 0 && (
        <Card className="p-6 text-sm text-slate-500">No warehouses have been set up yet.</Card>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(warehouses ?? []).map((w) => {
          const totalOnHand = w.stockItems.reduce((sum, si) => sum + Number(si.onHandQty), 0);
          const lowStockCount = w.stockItems.filter((si) => Number(si.onHandQty) <= Number(si.product.reorderLevel)).length;
          return (
            <Link key={w.id} href={`/warehouse/${w.id}`}>
              <Card className="p-5 transition-shadow hover:shadow-md">
                <p className="text-xs font-medium text-slate-400">{w.code}</p>
                <h2 className="mb-3 text-base font-semibold text-primary">{w.name}</h2>
                <dl className="space-y-1.5 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">SKUs stocked</dt>
                    <dd className="font-medium text-primary">{w.stockItems.length}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Total units on hand</dt>
                    <dd className="font-medium text-primary">{totalOnHand.toLocaleString()}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Low stock items</dt>
                    <dd className={lowStockCount > 0 ? "font-medium text-red-600 dark:text-red-400" : "font-medium text-primary"}>{lowStockCount}</dd>
                  </div>
                </dl>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
