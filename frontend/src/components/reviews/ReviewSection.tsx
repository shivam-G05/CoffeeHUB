import { useCallback, useEffect, useState, type FormEvent } from "react";
import { BadgeCheck, MessageSquare } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../lib/format";
import type { Review, ReviewEligibility } from "../../types";
import { StarRating, StarRatingInput } from "../ui/StarRating";
import Button from "../ui/Button";
import { ErrorNote, SkeletonRows } from "../ui/Common";
import { Textarea } from "../ui/Input";

const OPTIONAL_RATINGS = [
  { key: "qualityRating", label: "Product quality" },
  { key: "packagingRating", label: "Packaging" },
  { key: "deliveryRating", label: "Delivery" },
  { key: "communicationRating", label: "Communication" },
] as const;

type OptionalKey = (typeof OPTIONAL_RATINGS)[number]["key"];

const noOptional: Record<OptionalKey, number> = { qualityRating: 0, packagingRating: 0, deliveryRating: 0, communicationRating: 0 };

/** Read-only list of reviews; `showProduct` adds the product name (used on supplier storefronts). */
export function ReviewList({ reviews, showProduct = false }: { reviews: Review[]; showProduct?: boolean }) {
  if (reviews.length === 0) {
    return (
      <p className="flex items-center gap-2 text-sm text-coffee-400">
        <MessageSquare size={16} /> No reviews yet.
      </p>
    );
  }
  return (
    <ul className="space-y-4">
      {reviews.map((r) => (
        <li key={r.id} className="border-b border-coffee-100 pb-4 last:border-0">
          <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
            <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-coffee-800">
              {r.customerName}
              {r.verifiedPurchase && (
                <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[11px] font-semibold text-green-800">
                  <BadgeCheck size={12} /> Verified purchase
                </span>
              )}
            </p>
            <span className="text-xs text-coffee-400">{formatDate(r.createdAt)}</span>
          </div>
          {showProduct && r.productName && <p className="text-xs text-coffee-500">{r.productName}</p>}
          <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1">
            <StarRating rating={r.rating} showCount={false} size={13} />
            {r.sellerRating != null && (
              <span className="flex items-center gap-1 text-xs text-coffee-500">
                Seller <StarRating rating={r.sellerRating} showCount={false} size={11} />
              </span>
            )}
          </div>
          {OPTIONAL_RATINGS.some((o) => r[o.key] != null) && (
            <p className="mt-1 text-xs text-coffee-500">
              {OPTIONAL_RATINGS.filter((o) => r[o.key] != null)
                .map((o) => `${o.label} ${r[o.key]}/5`)
                .join(" · ")}
            </p>
          )}
          {r.comment && <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-600">{r.comment}</p>}
        </li>
      ))}
    </ul>
  );
}

export default function ReviewSection({
  targetType,
  targetId,
  avgRating,
  reviewCount,
  onReviewAdded,
}: {
  targetType: "product" | "cafe";
  targetId: number;
  avgRating: number;
  reviewCount: number;
  onReviewAdded?: () => void;
}) {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [rating, setRating] = useState(0);
  const [sellerRating, setSellerRating] = useState(0);
  const [optional, setOptional] = useState(noOptional);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isProduct = targetType === "product";
  const paramKey = isProduct ? "productId" : "cafeId";
  const isBuyer = user?.role === "CUSTOMER";

  const load = useCallback(() => {
    setError(null);
    api
      .get<Review[]>("/api/reviews", { params: { [paramKey]: targetId } })
      .then((res) => setReviews(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load reviews")));
    if (isProduct) {
      api
        .get<ReviewEligibility>("/api/reviews/eligibility", { params: { productId: targetId } })
        .then((res) => setEligibility(res.data))
        .catch(() => setEligibility({ canReview: false }));
    }
  }, [paramKey, targetId, isProduct]);

  // user?.id: eligibility depends on who is signed in
  useEffect(load, [load, user?.id]);

  // Products: the server decides (verified purchase). Cafés: any buyer who hasn't reviewed yet.
  const canReview = isProduct
    ? eligibility?.canReview === true
    : isBuyer && reviews !== null && !reviews.some((r) => r.customerId === user?.id);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      showToast(isProduct ? "Please rate the product" : "Please select a star rating", "error");
      return;
    }
    if (isProduct && sellerRating === 0) {
      showToast("Please rate the seller", "error");
      return;
    }
    setSubmitting(true);
    try {
      const optionalRatings = Object.fromEntries(Object.entries(optional).filter(([, value]) => value > 0));
      await api.post("/api/reviews", {
        [paramKey]: targetId,
        rating,
        comment: comment.trim() || undefined,
        ...(isProduct ? { sellerRating, ...optionalRatings } : {}),
      });
      showToast("Thanks for your review!");
      setRating(0);
      setSellerRating(0);
      setOptional(noOptional);
      setComment("");
      load();
      onReviewAdded?.();
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not submit review"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <h2 className="text-lg font-semibold text-coffee-900">Reviews</h2>
        <StarRating rating={avgRating} count={reviewCount} size={16} />
      </div>

      {canReview ? (
        <form onSubmit={handleSubmit} className="mt-4 rounded-2xl border border-coffee-100 bg-cream-50 p-4">
          <p className="text-sm font-semibold text-coffee-800">Leave a review</p>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-semibold text-coffee-600">{isProduct ? "Product rating" : "Your rating"}</p>
              <StarRatingInput value={rating} onChange={setRating} />
            </div>
            {isProduct && (
              <div>
                <p className="mb-1 text-xs font-semibold text-coffee-600">Seller rating</p>
                <StarRatingInput value={sellerRating} onChange={setSellerRating} />
              </div>
            )}
          </div>
          {isProduct && (
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {OPTIONAL_RATINGS.map((o) => (
                <div key={o.key}>
                  <p className="mb-1 text-xs font-semibold text-coffee-600">{o.label} (optional)</p>
                  <StarRatingInput size={18} value={optional[o.key]} onChange={(v) => setOptional((prev) => ({ ...prev, [o.key]: v }))} />
                </div>
              ))}
            </div>
          )}
          <Textarea
            className="mt-4"
            rows={3}
            maxLength={1000}
            placeholder="Share your experience (optional)"
            aria-label="Review comment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit" className="mt-3" disabled={submitting}>
            {submitting ? "Posting…" : "Post review"}
          </Button>
        </form>
      ) : (
        isProduct && eligibility?.reason && <p className="mt-3 text-sm text-coffee-400">{eligibility.reason}</p>
      )}

      <div className="mt-5">
        {error ? <ErrorNote>{error}</ErrorNote> : reviews === null ? <SkeletonRows count={2} /> : <ReviewList reviews={reviews} />}
      </div>
    </div>
  );
}
