import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import type { Product } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, PageHeader, SkeletonRows } from "../../components/ui/Common";
import { Input } from "../../components/ui/Input";

const LOW_STOCK = 5;

interface Edit {
  stock: string;
  price: string;
}

export default function SellerInventory() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [edits, setEdits] = useState<Record<number, Edit>>({});
  const [error, setError] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    api
      .get<Product[]>("/api/products/mine")
      .then((res) => setProducts(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your products")));
  }, []);

  const editOf = (p: Product): Edit => edits[p.id] ?? { stock: String(p.stock), price: String(p.price) };

  function change(p: Product, patch: Partial<Edit>) {
    setEdits((all) => ({ ...all, [p.id]: { ...editOf(p), ...patch } }));
  }

  async function save(p: Product) {
    const edit = editOf(p);
    const stock = Number(edit.stock);
    const price = Number(edit.price);
    if (edit.stock.trim() === "" || !Number.isInteger(stock) || stock < 0) {
      setRowError({ id: p.id, message: "Stock must be a whole number, 0 or more" });
      return;
    }
    if (edit.price.trim() === "" || !(price > 0)) {
      setRowError({ id: p.id, message: "Price must be greater than zero" });
      return;
    }
    setSavingId(p.id);
    setRowError(null);
    try {
      const res = await api.patch<Product>(`/api/products/${p.id}/inventory`, { stock, price });
      setProducts((list) => list?.map((x) => (x.id === p.id ? res.data : x)) ?? null);
      setEdits((all) => {
        const next = { ...all };
        delete next[p.id];
        return next;
      });
      showToast(`Updated ${p.name}`, "success");
    } catch (err) {
      setRowError({ id: p.id, message: apiErrorMessage(err, "Could not update inventory") });
    } finally {
      setSavingId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Stock and price changes apply immediately and do not need re-approval." />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : products === null ? (
          <SkeletonRows />
        ) : products.length === 0 ? (
          <EmptyState
            title="No products yet"
            hint="Add a product to manage its stock and price here."
            action={
              <Link to="/seller/products/new" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
                + Add product
              </Link>
            }
          />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-xs text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Stock</th>
                  <th className="px-4 py-3">Price (₹)</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {products.map((p) => {
                  const edit = editOf(p);
                  const dirty = edit.stock !== String(p.stock) || edit.price !== String(p.price);
                  const out = p.stock === 0;
                  const low = !out && p.stock <= LOW_STOCK;
                  return (
                    <tr key={p.id} className={out ? "bg-red-50" : low ? "bg-amber-50" : ""}>
                      <td className="min-w-[10rem] px-4 py-3">
                        <p className="font-medium text-coffee-900">{p.name}</p>
                        <p className="text-xs">
                          {out ? (
                            <span className="font-semibold text-red-700">Out of stock</span>
                          ) : low ? (
                            <span className="font-semibold text-amber-700">Low stock</span>
                          ) : (
                            <span className="text-coffee-400">{p.categoryName}</span>
                          )}
                        </p>
                        {rowError?.id === p.id && <p className="mt-1 text-xs text-red-600">{rowError.message}</p>}
                      </td>
                      <td className="px-4 py-3">
                        <Badge>{p.status}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Input
                          type="number"
                          min="0"
                          step="1"
                          className="min-w-[5rem]"
                          aria-label={`Stock for ${p.name}`}
                          value={edit.stock}
                          onChange={(e) => change(p, { stock: e.target.value })}
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1">
                          <Input
                            type="number"
                            min="0"
                            step="0.01"
                            className="min-w-[6rem]"
                            aria-label={`Price for ${p.name}`}
                            value={edit.price}
                            onChange={(e) => change(p, { price: e.target.value })}
                          />
                          {p.priceUnit && <span className="whitespace-nowrap text-xs text-coffee-400">/ {p.priceUnit}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Button onClick={() => save(p)} disabled={!dirty || savingId === p.id}>
                          {savingId === p.id ? "Saving…" : "Save"}
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
