import { useEffect, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { api } from "../../api/client";
import type { Reservation, ReservationStatus } from "../../types";
import Badge from "../../components/ui/Badge";
import { Select } from "../../components/ui/Input";

const statusOptions: ReservationStatus[] = ["PENDING", "CONFIRMED", "CANCELLED"];

export default function CafeOwnerReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<Reservation[]>("/api/reservations/cafe")
      .then((res) => setReservations(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  async function updateStatus(id: number, status: ReservationStatus) {
    await api.put(`/api/reservations/${id}/status`, { status });
    setReservations((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
  }

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Table Bookings</h1>
      <p className="mt-1 text-coffee-500">Reservations customers made at your café.</p>

      {loading ? (
        <p className="mt-6 text-coffee-400">Loading…</p>
      ) : reservations.length === 0 ? (
        <p className="mt-6 text-coffee-400">No reservations yet.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coffee-100 bg-cream-50 p-5">
              <div>
                <p className="font-semibold text-coffee-900">{r.customerName}</p>
                <p className="mt-1 flex items-center gap-3 text-sm text-coffee-500">
                  <span className="flex items-center gap-1">
                    <CalendarDays size={14} /> {r.reservationDate} at {r.reservationTime.slice(0, 5)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users size={14} /> {r.partySize}
                  </span>
                </p>
                {r.notes && <p className="mt-1 text-xs text-coffee-400">{r.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <Badge tone={r.status === "CONFIRMED" ? "approved" : r.status === "CANCELLED" ? "CANCELLED" : "pending"}>
                  {r.status}
                </Badge>
                <Select value={r.status} onChange={(e) => updateStatus(r.id, e.target.value as ReservationStatus)} className="w-auto">
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>
                      Mark {s}
                    </option>
                  ))}
                </Select>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
