import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { place } from "../../lib/format";
import type { VendorSummary } from "../../types";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Img, PageHeader, SkeletonGrid, VerifiedBadge } from "../../components/ui/Common";
import { StarRating } from "../../components/ui/StarRating";

export default function CustomerSavedSuppliers() {
  const { showToast } = useToast();
  const [suppliers, setSuppliers] = useState<VendorSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<number | null>(null);

  useEffect(() => {
    api
      .get<VendorSummary[]>("/api/saved-suppliers")
      .then((res) => setSuppliers(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your saved suppliers")));
  }, []);

  async function remove(vendor: VendorSummary) {
    setRemoving(vendor.id);
    try {
      const res = await api.post<{ saved: boolean }>(`/api/saved-suppliers/${vendor.id}/toggle`);
      if (!res.data.saved) {
        setSuppliers((prev) => prev?.filter((s) => s.id !== vendor.id) ?? prev);
        showToast(`${vendor.businessName} removed`, "info");
      }
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not remove this supplier"), "error");
    } finally {
      setRemoving(null);
    }
  }

  return (
    <div>
      <PageHeader title="Saved Suppliers" subtitle="Suppliers you bookmarked from their storefronts." />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !suppliers ? (
          <SkeletonGrid count={3} className="h-40" />
        ) : suppliers.length === 0 ? (
          <EmptyState
            title="No saved suppliers"
            hint="Save a supplier from their storefront to find them again quickly."
            action={
              <Link to="/suppliers" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
                Browse suppliers
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {suppliers.map((s) => {
              const location = place(s.city, s.state);
              return (
                <div key={s.id} className="flex flex-col rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm">
                  <div className="flex items-start gap-3">
                    <Img src={s.logoUrl} alt={s.businessName} className="h-14 w-14 shrink-0 rounded-xl" />
                    <div className="min-w-0">
                      <Link to={`/suppliers/${s.slug}`} className="break-words font-semibold text-coffee-900 hover:underline">
                        {s.businessName}
                      </Link>
                      {s.vendorTypeLabel && <p className="text-xs text-coffee-500">{s.vendorTypeLabel}</p>}
                      {s.verified && (
                        <div className="mt-1">
                          <VerifiedBadge compact />
                        </div>
                      )}
                    </div>
                  </div>
                  {location && (
                    <p className="mt-3 flex items-center gap-1 text-xs text-coffee-500">
                      <MapPin size={12} /> {location}
                    </p>
                  )}
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <StarRating rating={s.avgRating} count={s.reviewCount} size={12} />
                    <span className="text-xs text-coffee-400">
                      {s.productCount} {s.productCount === 1 ? "product" : "products"}
                    </span>
                  </div>
                  <div className="mt-auto flex flex-wrap gap-2 pt-4">
                    <Link
                      to={`/suppliers/${s.slug}`}
                      className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700"
                    >
                      View storefront
                    </Link>
                    <Button variant="ghost" onClick={() => remove(s)} disabled={removing === s.id}>
                      {removing === s.id ? "Removing…" : "Remove"}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
