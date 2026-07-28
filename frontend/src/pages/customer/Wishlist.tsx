import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coffee, Cog, Heart, Wrench } from "lucide-react";
import { api } from "../../api/client";
import type { Wishlist as WishlistType } from "../../types";
import { StarRating } from "../../components/ui/StarRating";
import WishlistHeart from "../../components/ui/WishlistHeart";

const typeIcon: Record<string, typeof Coffee> = {
  BEAN: Coffee,
  MACHINE: Cog,
  ACCESSORY: Wrench,
};

export default function CustomerWishlist() {
  const [wishlist, setWishlist] = useState<WishlistType | null>(null);
  const [loading, setLoading] = useState(true);

  function load() {
    setLoading(true);
    api
      .get<WishlistType>("/api/wishlist/mine")
      .then((res) => setWishlist(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  const isEmpty = wishlist && wishlist.products.length === 0 && wishlist.cafes.length === 0;

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">My Wishlist</h1>

      {loading ? (
        <p className="mt-6 text-coffee-400">Loading…</p>
      ) : !wishlist ? (
        <p className="mt-6 text-coffee-400">Could not load your wishlist. Try refreshing.</p>
      ) : isEmpty ? (
        <div className="mt-8 rounded-2xl border border-dashed border-coffee-200 bg-cream-50 p-10 text-center">
          <Heart className="mx-auto text-coffee-300" size={32} />
          <p className="mt-3 text-coffee-500">Nothing saved yet. Tap the heart on any product or café to save it here.</p>
        </div>
      ) : (
        <div className="mt-6 space-y-10">
          {wishlist!.products.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-coffee-400">Products</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wishlist!.products.map((p) => {
                  const Icon = typeIcon[p.type] ?? Coffee;
                  return (
                    <div key={p.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-4">
                      <Link to={`/products/${p.id}`} className="relative flex h-24 items-center justify-center rounded-xl bg-coffee-100">
                        <Icon size={32} className="text-coffee-400" />
                        <WishlistHeart type="product" id={p.id} className="absolute right-2 top-2 h-7 w-7" />
                      </Link>
                      <Link to={`/products/${p.id}`}>
                        <h3 className="mt-3 text-sm font-semibold text-coffee-900 hover:underline">{p.name}</h3>
                      </Link>
                      <StarRating rating={p.avgRating} count={p.reviewCount} size={11} />
                      <p className="mt-1 text-sm font-bold text-coffee-900">₹{p.price.toLocaleString("en-IN")}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {wishlist!.cafes.length > 0 && (
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-coffee-400">Cafés</h2>
              <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wishlist!.cafes.map((c) => (
                  <div key={c.id} className="rounded-2xl border border-coffee-100 bg-cream-50 p-4">
                    <Link to={`/cafes/${c.id}`} className="relative flex h-24 items-center justify-center rounded-xl bg-coffee-100">
                      <Coffee size={28} className="text-coffee-400" />
                      <WishlistHeart type="cafe" id={c.id} className="absolute right-2 top-2 h-7 w-7" />
                    </Link>
                    <Link to={`/cafes/${c.id}`}>
                      <h3 className="mt-3 text-sm font-semibold text-coffee-900 hover:underline">{c.name}</h3>
                    </Link>
                    <p className="text-xs text-coffee-400">{c.city}</p>
                    <StarRating rating={c.avgRating} count={c.reviewCount} size={11} />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
