import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarDays, Coffee, MapPin } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Cafe } from "../../types";
import Button from "../../components/ui/Button";
import { StarRating } from "../../components/ui/StarRating";
import WishlistHeart from "../../components/ui/WishlistHeart";
import ReviewSection from "../../components/reviews/ReviewSection";
import { Field, Input, Textarea } from "../../components/ui/Input";

export default function CafeDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { showToast } = useToast();
  const [cafe, setCafe] = useState<Cafe | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ date: "", time: "19:00", partySize: 2, notes: "" });

  function load() {
    setLoading(true);
    api
      .get<Cafe>(`/api/cafes/${id}`)
      .then((res) => setCafe(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function handleReserve(e: FormEvent) {
    e.preventDefault();
    if (!cafe) return;
    if (!user) {
      navigate("/login", { state: { from: `/cafes/${id}` } });
      return;
    }
    if (user.role !== "CUSTOMER") {
      showToast("Only customer accounts can reserve tables", "info");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/api/reservations", {
        cafeId: cafe.id,
        reservationDate: form.date,
        reservationTime: `${form.time}:00`,
        partySize: form.partySize,
        notes: form.notes,
      });
      showToast("Table reserved! Check My Reservations for status.");
      setForm({ date: "", time: "19:00", partySize: 2, notes: "" });
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not reserve a table"), "error");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-coffee-400">Loading café…</div>;
  }
  if (!cafe) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-coffee-400">Café not found.</div>;
  }

  const minDate = new Date().toISOString().slice(0, 10);

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/cafes" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
        <ArrowLeft size={16} /> Back to Discover Cafés
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="relative flex h-72 items-center justify-center rounded-2xl bg-coffee-100">
          <Coffee size={72} className="text-coffee-400" />
          <WishlistHeart type="cafe" id={cafe.id} className="absolute right-4 top-4" />
        </div>

        <div>
          <p className="flex items-center gap-1 text-xs font-semibold uppercase tracking-wide text-coffee-400">
            <MapPin size={13} /> {cafe.city}
          </p>
          <h1 className="mt-1 text-3xl font-bold text-coffee-900">{cafe.name}</h1>
          <div className="mt-2">
            <StarRating rating={cafe.avgRating} count={cafe.reviewCount} />
          </div>
          <p className="mt-4 text-sm text-coffee-500">{cafe.description}</p>
          {cafe.address && <p className="mt-2 text-sm text-coffee-400">{cafe.address}</p>}

          <form onSubmit={handleReserve} className="mt-6 rounded-2xl border border-coffee-100 bg-cream-50 p-5">
            <p className="flex items-center gap-2 text-sm font-semibold text-coffee-800">
              <CalendarDays size={16} /> Reserve a table
            </p>
            <div className="mt-3 grid grid-cols-2 gap-3">
              <Field label="Date">
                <Input
                  type="date"
                  required
                  min={minDate}
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </Field>
              <Field label="Time">
                <Input
                  type="time"
                  required
                  value={form.time}
                  onChange={(e) => setForm({ ...form, time: e.target.value })}
                />
              </Field>
              <Field label="Party size">
                <Input
                  type="number"
                  min={1}
                  required
                  value={form.partySize}
                  onChange={(e) => setForm({ ...form, partySize: Number(e.target.value) })}
                />
              </Field>
            </div>
            <div className="mt-3">
              <Field label="Notes (optional)">
                <Textarea
                  rows={2}
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  placeholder="Window seat, birthday celebration, etc."
                />
              </Field>
            </div>
            <Button type="submit" className="mt-4 w-full" disabled={submitting}>
              {submitting ? "Reserving…" : "Reserve table"}
            </Button>
          </form>
        </div>
      </div>

      <div className="mt-14 border-t border-coffee-100 pt-8">
        <ReviewSection
          targetType="cafe"
          targetId={cafe.id}
          avgRating={cafe.avgRating}
          reviewCount={cafe.reviewCount}
          onReviewAdded={load}
        />
      </div>
    </div>
  );
}
