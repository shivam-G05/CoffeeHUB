import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Coffee } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import type { Wishlist as WishlistType } from "../../types";
import { EmptyState, ErrorNote, PageHeader, SkeletonGrid } from "../../components/ui/Common";
import ProductCard from "../../components/ui/ProductCard";
import { StarRating } from "../../components/ui/StarRating";
import WishlistHeart from "../../components/ui/WishlistHeart";

export default function CustomerWishlist() {
  const [wishlist, setWishlist] = useState<WishlistType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<WishlistType>("/api/wishlist/mine")
      .then((res) => setWishlist(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your wishlist")));
  }, []);

  return (
    <div>
      <PageHeader title="My Wishlist" />

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !wishlist ? (
          <SkeletonGrid count={4} />
        ) : wishlist.products.length === 0 && wishlist.cafes.length === 0 ? (
          <EmptyState title="Nothing saved yet" hint="Tap the heart on any product or café to save it here." />
        ) : (
          <div className="space-y-10">
            {wishlist.products.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-coffee-400">Products</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {wishlist.products.map((p) => (
                    <ProductCard key={p.id} product={p} />
                  ))}
                </div>
              </div>
            )}

            {wishlist.cafes.length > 0 && (
              <div>
                <h2 className="text-sm font-semibold uppercase tracking-wide text-coffee-400">Cafés</h2>
                <div className="mt-3 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {wishlist.cafes.map((c) => (
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
    </div>
  );
}
