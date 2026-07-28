import { useEffect, useState } from "react";
import { CalendarDays, Users } from "lucide-react";
import { api } from "../../api/client";
import type { Reservation } from "../../types";
import Badge from "../../components/ui/Badge";

export default function CustomerReservations() {
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get<Reservation[]>("/api/reservations/mine")
      .then((res) => setReservations(res.data))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">My Reservations</h1>

      {loading ? (
        <p className="mt-6 text-coffee-400">Loading…</p>
      ) : reservations.length === 0 ? (
        <p className="mt-6 text-coffee-400">
          No table reservations yet — find a café and reserve a table from its page.
        </p>
      ) : (
        <div className="mt-6 space-y-3">
          {reservations.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-coffee-100 bg-cream-50 p-5">
              <div>
                <p className="font-semibold text-coffee-900">{r.cafeName}</p>
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
              <Badge tone={r.status === "CONFIRMED" ? "approved" : r.status === "CANCELLED" ? "CANCELLED" : "pending"}>
                {r.status}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
