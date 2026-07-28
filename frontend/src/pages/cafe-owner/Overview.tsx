import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Cafe } from "../../types";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";

export default function CafeOwnerOverview() {
  const [cafes, setCafes] = useState<Cafe[]>([]);

  useEffect(() => {
    api.get<Cafe[]>("/api/cafes/mine").then((res) => setCafes(res.data));
  }, []);

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Café Owner Dashboard</h1>
      <p className="mt-1 text-coffee-500">Manage your café listings on CoffeeHub.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <StatCard label="Cafés listed" value={cafes.length} />
        <StatCard label="Approved" value={cafes.filter((c) => c.approved).length} />
      </div>

      {cafes.length === 0 ? (
        <div className="mt-8 rounded-2xl border border-dashed border-coffee-200 bg-cream-50 p-8 text-center">
          <p className="text-coffee-600">You haven&rsquo;t listed a café yet.</p>
          <Link
            to="/cafe-owner/my-cafe"
            className="mt-4 inline-block rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50"
          >
            List your café
          </Link>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {cafes.map((c) => (
            <div key={c.id} className="flex items-center justify-between rounded-xl border border-coffee-100 bg-cream-50 px-4 py-3">
              <div>
                <p className="font-semibold text-coffee-900">{c.name}</p>
                <p className="text-xs text-coffee-400">{c.city}</p>
              </div>
              <Badge tone={c.approved ? "approved" : "pending"}>{c.approved ? "Approved" : "Pending"}</Badge>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
