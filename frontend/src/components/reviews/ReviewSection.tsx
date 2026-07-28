import { useEffect, useState, type FormEvent } from "react";
import { MessageSquare } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Review } from "../../types";
import { StarRating, StarRatingInput } from "../ui/StarRating";
import Button from "../ui/Button";
import { Textarea } from "../ui/Input";

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
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const paramKey = targetType === "product" ? "productId" : "cafeId";

  function load() {
    setLoading(true);
    api
      .get<Review[]>("/api/reviews", { params: { [paramKey]: targetId } })
      .then((res) => setReviews(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [targetId]);

  const alreadyReviewed = user ? reviews.some((r) => r.customerId === user.id) : false;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (rating === 0) {
      showToast("Please select a star rating", "error");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/reviews", {
        [paramKey]: targetId,
        rating,
        comment,
      });
      showToast("Thanks for your review!");
      setRating(0);
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
      <div className="flex items-center gap-3">
        <h2 className="text-lg font-semibold text-coffee-900">Reviews</h2>
        <StarRating rating={avgRating} count={reviewCount} size={16} />
      </div>

      {user?.role === "CUSTOMER" && !alreadyReviewed && (
        <form onSubmit={handleSubmit} className="mt-4 rounded-xl border border-coffee-100 bg-cream-50 p-4">
          <p className="text-sm font-medium text-coffee-700">Leave a review</p>
          <div className="mt-2">
            <StarRatingInput value={rating} onChange={setRating} />
          </div>
          <Textarea
            className="mt-3"
            rows={2}
            placeholder="Share your experience (optional)"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
          />
          <Button type="submit" className="mt-3" disabled={submitting}>
            {submitting ? "Posting…" : "Post review"}
          </Button>
        </form>
      )}

      <div className="mt-5 space-y-4">
        {loading ? (
          <p className="text-sm text-coffee-400">Loading reviews…</p>
        ) : reviews.length === 0 ? (
          <p className="flex items-center gap-2 text-sm text-coffee-400">
            <MessageSquare size={16} /> No reviews yet — be the first!
          </p>
        ) : (
          reviews.map((r) => (
            <div key={r.id} className="border-b border-coffee-100 pb-4 last:border-0">
              <div className="flex items-center justify-between">
                <p className="text-sm font-semibold text-coffee-800">{r.customerName}</p>
                <span className="text-xs text-coffee-400">{new Date(r.createdAt).toLocaleDateString("en-IN")}</span>
              </div>
              <StarRating rating={r.rating} showCount={false} size={13} />
              {r.comment && <p className="mt-1 text-sm text-coffee-600">{r.comment}</p>}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
