import { useCallback, useEffect, useState, type FormEvent } from "react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDate } from "../../lib/format";
import type { Page, Review } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Modal, PageHeader, Pagination, SkeletonRows } from "../../components/ui/Common";
import { Field, Textarea } from "../../components/ui/Input";
import { StarRating } from "../../components/ui/StarRating";

export default function AdminReviews() {
  const { showToast } = useToast();
  const [pageNo, setPageNo] = useState(0);
  const [reviews, setReviews] = useState<Page<Review> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [hiding, setHiding] = useState<Review | null>(null);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Page<Review>>("/api/admin/reviews", { params: { page: pageNo } })
      .then((res) => setReviews(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load reviews")));
  }, [pageNo]);

  useEffect(load, [load]);

  async function setHidden(review: Review, hidden: boolean, why?: string) {
    setBusy(true);
    setActionError(null);
    try {
      await api.put(`/api/admin/reviews/${review.id}`, { hidden, note: why });
      showToast(hidden ? "Review hidden" : "Review restored", "success");
      setHiding(null);
      load();
    } catch (err) {
      const message = apiErrorMessage(err, "Could not update the review");
      if (hidden) setActionError(message);
      else showToast(message, "error");
    } finally {
      setBusy(false);
    }
  }

  function submitHide(e: FormEvent) {
    e.preventDefault();
    if (hiding) setHidden(hiding, true, note.trim());
  }

  return (
    <div>
      <PageHeader title="Reviews" subtitle="Hide reviews that break the rules. Hidden reviews stop counting towards ratings; every change is audit-logged." />

      <div className="mt-6 space-y-3">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !reviews ? (
          <SkeletonRows />
        ) : reviews.content.length === 0 ? (
          <EmptyState title="No reviews yet" />
        ) : (
          reviews.content.map((r) => {
            const subRatings: [string, number | undefined][] = [
              ["Seller", r.sellerRating],
              ["Quality", r.qualityRating],
              ["Packaging", r.packagingRating],
              ["Delivery", r.deliveryRating],
              ["Communication", r.communicationRating],
            ];
            return (
              <div key={r.id} className={`rounded-2xl border p-4 shadow-sm ${r.hidden ? "border-red-200 bg-red-50/40" : "border-coffee-100 bg-cream-50"}`}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-coffee-900">{r.productName ?? (r.cafeId != null ? `Café #${r.cafeId}` : "Review")}</p>
                    <p className="text-sm text-coffee-500">
                      {r.vendorName ? `${r.vendorName} · ` : ""}by {r.customerName} · {formatDate(r.createdAt)}
                    </p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <StarRating rating={r.rating} showCount={false} />
                      {r.verifiedPurchase && <Badge tone="approved">Verified purchase</Badge>}
                      {r.hidden && <Badge tone="CANCELLED">Hidden</Badge>}
                    </div>
                  </div>
                  {r.hidden ? (
                    <Button variant="secondary" disabled={busy} onClick={() => setHidden(r, false)}>
                      Restore
                    </Button>
                  ) : (
                    <Button
                      variant="danger"
                      disabled={busy}
                      onClick={() => {
                        setNote("");
                        setActionError(null);
                        setHiding(r);
                      }}
                    >
                      Hide
                    </Button>
                  )}
                </div>

                {subRatings.some(([, value]) => value != null) && (
                  <p className="mt-2 text-xs text-coffee-500">
                    {subRatings
                      .filter(([, value]) => value != null)
                      .map(([name, value]) => `${name} ${value}/5`)
                      .join(" · ")}
                  </p>
                )}
                <p className="mt-2 whitespace-pre-wrap break-words text-sm text-coffee-700">{r.comment || "No written comment."}</p>
                {r.moderationNote && <p className="mt-2 text-xs text-red-700">Moderation note: {r.moderationNote}</p>}
              </div>
            );
          })
        )}
        <Pagination page={reviews} onChange={setPageNo} />
      </div>

      {hiding && (
        <Modal title="Hide review" onClose={() => setHiding(null)}>
          <form onSubmit={submitHide} className="space-y-4">
            <p className="text-sm text-coffee-600">
              The review by {hiding.customerName} disappears from the storefront and stops counting towards ratings. You can restore it later.
            </p>
            <Field label="Moderation note (why it is being hidden)">
              <Textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} maxLength={255} required />
            </Field>
            <ErrorNote>{actionError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setHiding(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={busy || !note.trim()}>
                {busy ? "Saving…" : "Hide review"}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}
