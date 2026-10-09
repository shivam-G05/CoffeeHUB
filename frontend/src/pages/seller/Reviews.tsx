import { useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate } from "../../lib/format";
import type { Review, VendorProfile } from "../../types";
import { StarRating } from "../../components/ui/StarRating";
import { Card, EmptyState, ErrorNote, PageHeader, SkeletonRows } from "../../components/ui/Common";

const DIMENSIONS: { key: "qualityRating" | "packagingRating" | "deliveryRating" | "communicationRating"; name: string }[] = [
  { key: "qualityRating", name: "Quality" },
  { key: "packagingRating", name: "Packaging" },
  { key: "deliveryRating", name: "Delivery" },
  { key: "communicationRating", name: "Communication" },
];

export default function SellerReviews() {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [vendor, setVendor] = useState<VendorProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([api.get<Review[]>("/api/vendor/reviews"), api.get<VendorProfile>("/api/vendor/me")])
      .then(([r, v]) => {
        setReviews(r.data);
        setVendor(v.data);
      })
      .catch((err) => setError(apiErrorMessage(err, "Could not load your reviews")));
  }, []);

  return (
    <div>
      <PageHeader title="Reviews" subtitle="What buyers say about your products and your service." />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : reviews === null || vendor === null ? (
          <SkeletonRows />
        ) : (
          <>
            <Card>
              <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Overall seller rating</p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <p className="text-3xl font-bold text-coffee-900">{vendor.avgRating > 0 ? vendor.avgRating.toFixed(1) : "—"}</p>
                <StarRating rating={vendor.avgRating} size={18} showCount={false} />
                <p className="text-sm text-coffee-500">
                  {vendor.reviewCount} {vendor.reviewCount === 1 ? "rating" : "ratings"}
                </p>
              </div>
            </Card>

            <div className="mt-6">
              {reviews.length === 0 ? (
                <EmptyState title="No reviews yet" hint="Buyers can review a product after their order is delivered." />
              ) : (
                <ul className="space-y-3">
                  {reviews.map((r) => (
                    <li key={r.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-4 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="break-words font-semibold text-coffee-900">{r.productName ?? "Product"}</p>
                          <p className="text-xs text-coffee-500">
                            {r.customerName} · {formatDate(r.createdAt)}
                          </p>
                        </div>
                        {r.verifiedPurchase && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                            <BadgeCheck size={13} /> Verified purchase
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex flex-wrap gap-x-6 gap-y-2 text-xs text-coffee-600">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold">Product</span>
                          <StarRating rating={r.rating} showCount={false} />
                        </div>
                        {r.sellerRating != null && (
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Seller</span>
                            <StarRating rating={r.sellerRating} showCount={false} />
                          </div>
                        )}
                        {DIMENSIONS.map((d) => {
                          const value = r[d.key];
                          return value == null ? null : (
                            <div key={d.key} className="flex items-center gap-2">
                              <span>{d.name}</span>
                              <StarRating rating={value} size={12} showCount={false} />
                            </div>
                          );
                        })}
                      </div>

                      {r.comment && <p className="mt-3 whitespace-pre-wrap break-words text-sm text-coffee-800">{r.comment}</p>}
                      {r.hidden && (
                        <p className="mt-3 rounded-lg bg-coffee-100/60 px-3 py-2 text-xs text-coffee-600">
                          Hidden from the public by a moderator{r.moderationNote ? `: ${r.moderationNote}` : "."}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
