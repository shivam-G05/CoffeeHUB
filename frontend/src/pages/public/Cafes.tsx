import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coffee, Search } from "lucide-react";
import { api } from "../../api/client";
import type { Cafe } from "../../types";
import { StarRating } from "../../components/ui/StarRating";
import WishlistHeart from "../../components/ui/WishlistHeart";

export default function Cafes() {
  const [cafes, setCafes] = useState<Cafe[]>([]);
  const [city, setCity] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api
      .get<Cafe[]>("/api/cafes", { params: city ? { city } : {} })
      .then((res) => setCafes(res.data))
      .finally(() => setLoading(false));
  }, [city]);

  return (
    <div className="mx-auto max-w-6xl px-6 py-12">
      <h1 className="text-3xl font-bold text-coffee-900">Discover Cafés</h1>
      <p className="mt-1 text-coffee-500">Find cafés listed on CoffeeHub across India.</p>

      <div className="relative mt-6 max-w-xs">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-coffee-300" />
        <input
          value={city}
          onChange={(e) => setCity(e.target.value)}
          placeholder="Filter by city…"
          className="w-full rounded-lg border border-coffee-200 bg-cream-50 py-2 pl-9 pr-3 text-sm focus:border-coffee-500 focus:outline-none"
        />
      </div>

      {loading ? (
        <p className="mt-10 text-coffee-400">Loading cafés…</p>
      ) : cafes.length === 0 ? (
        <p className="mt-10 text-coffee-400">No approved cafés yet — check back soon.</p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {cafes.map((c) => (
            <div key={c.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm transition hover:shadow-md">
              <Link to={`/cafes/${c.id}`} className="relative flex h-32 items-center justify-center rounded-xl bg-coffee-100">
                <Coffee size={40} className="text-coffee-400" />
                <WishlistHeart type="cafe" id={c.id} className="absolute right-2 top-2 h-8 w-8" />
              </Link>
              <Link to={`/cafes/${c.id}`}>
                <h3 className="mt-4 font-semibold text-coffee-900 hover:underline">{c.name}</h3>
              </Link>
              <p className="text-xs text-coffee-400">{c.city}</p>
              <div className="mt-1">
                <StarRating rating={c.avgRating} count={c.reviewCount} size={12} />
              </div>
              <p className="mt-2 line-clamp-2 text-sm text-coffee-500">{c.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
