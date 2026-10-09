import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { money } from "../../lib/format";
import type { Product, VendorProfile } from "../../types";
import Badge from "../../components/ui/Badge";
import { productPath } from "../../components/ui/ProductCard";
import { EmptyState, ErrorNote, Img, PageHeader, SkeletonRows } from "../../components/ui/Common";

const addLink = (
  <Link to="/seller/products/new" className="inline-flex items-center rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
    + Add product
  </Link>
);

const actionClass = "text-sm font-semibold hover:underline disabled:cursor-not-allowed disabled:opacity-50";

export default function SellerProducts() {
  const { showToast } = useToast();
  const [products, setProducts] = useState<Product[] | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [rowError, setRowError] = useState<{ id: number; message: string } | null>(null);

  useEffect(() => {
    api
      .get<Product[]>("/api/products/mine")
      .then((res) => setProducts(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your products")));
    api
      .get<VendorProfile>("/api/vendor/me")
      .then((res) => setVendor(res.data))
      .catch(() => undefined);
  }, []);

  async function act(product: Product, action: "submit" | "unpublish", done: string) {
    setBusyId(product.id);
    setRowError(null);
    try {
      const res = await api.post<Product>(`/api/products/${product.id}/${action}`);
      setProducts((list) => list?.map((p) => (p.id === product.id ? res.data : p)) ?? null);
      showToast(done, "success");
    } catch (err) {
      setRowError({ id: product.id, message: apiErrorMessage(err, "Could not update the product") });
    } finally {
      setBusyId(null);
    }
  }

  async function remove(product: Product) {
    if (!confirm(`Delete "${product.name}"? This cannot be undone.`)) return;
    setBusyId(product.id);
    setRowError(null);
    try {
      await api.delete(`/api/products/${product.id}`);
      setProducts((list) => list?.filter((p) => p.id !== product.id) ?? null);
      showToast("Product deleted", "success");
    } catch (err) {
      setRowError({ id: product.id, message: apiErrorMessage(err, "Could not delete the product") });
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div>
      <PageHeader title="Products" subtitle="Listings go live after an admin approves them." action={addLink} />

      {vendor && vendor.status !== "APPROVED" && (
        <p className="mt-4 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
          Your business is not verified yet. You can draft products now, but they can only be submitted for review after verification.{" "}
          <Link to="/seller/verification" className="font-semibold underline">
            Check verification status
          </Link>
        </p>
      )}

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : products === null ? (
          <SkeletonRows />
        ) : products.length === 0 ? (
          <EmptyState title="No products yet" hint="Add your first product, save it as a draft and submit it for review when it is ready." action={addLink} />
        ) : (
          <ul className="space-y-3">
            {products.map((p) => {
              const busy = busyId === p.id;
              return (
                <li key={p.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-4 shadow-sm">
                  <div className="flex gap-4">
                    <Img src={p.imageUrl} alt={p.name} className="h-16 w-16 shrink-0 rounded-lg sm:h-20 sm:w-20" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <p className="min-w-0 break-words font-semibold text-coffee-900">{p.name}</p>
                        <Badge>{p.status}</Badge>
                      </div>
                      <p className="mt-0.5 text-xs text-coffee-500">{p.categoryName ?? "No category"}</p>
                      <p className="mt-1 text-sm text-coffee-700">
                        {money(p.price)}
                        {p.priceUnit ? ` / ${p.priceUnit}` : ""} · Stock: {p.stock}
                      </p>
                    </div>
                  </div>

                  {(p.status === "REJECTED" || p.status === "SUSPENDED") && p.rejectionReason && (
                    <p className="mt-3 whitespace-pre-wrap rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
                      <span className="font-semibold">{p.status === "REJECTED" ? "Rejected: " : "Suspended: "}</span>
                      {p.rejectionReason}
                    </p>
                  )}

                  {rowError?.id === p.id && (
                    <div className="mt-3">
                      <ErrorNote>{rowError.message}</ErrorNote>
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 border-t border-coffee-100 pt-3">
                    <Link to={`/seller/products/${p.id}/edit`} className={`${actionClass} text-coffee-700`}>
                      Edit
                    </Link>
                    {(p.status === "DRAFT" || p.status === "REJECTED") && (
                      <button onClick={() => act(p, "submit", "Submitted for review")} disabled={busy} className={`${actionClass} text-coffee-700`}>
                        {busy ? "Working…" : "Submit for review"}
                      </button>
                    )}
                    {(p.status === "PENDING" || p.status === "APPROVED" || p.status === "OUT_OF_STOCK") && (
                      <button onClick={() => act(p, "unpublish", "Product unpublished")} disabled={busy} className={`${actionClass} text-coffee-700`}>
                        {busy ? "Working…" : "Unpublish"}
                      </button>
                    )}
                    {(p.status === "APPROVED" || p.status === "OUT_OF_STOCK") && (
                      <Link to={productPath(p)} className={`${actionClass} text-coffee-700`}>
                        View
                      </Link>
                    )}
                    <button onClick={() => remove(p)} disabled={busy} className={`${actionClass} text-red-600`}>
                      Delete
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
