import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import type { Product } from "../../types";
import { money, place } from "../../lib/format";
import { Img, VerifiedBadge } from "./Common";
import { StarRating } from "./StarRating";
import WishlistHeart from "./WishlistHeart";

/** Canonical product URL: slug when there is one (SEO-readable), id for older listings. */
export function productPath(product: { id: number; slug?: string | null }): string {
  return `/products/${product.slug ?? product.id}`;
}

export default function ProductCard({ product }: { product: Product }) {
  const location = place(product.vendorCity, product.vendorState);
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50 shadow-sm transition hover:shadow-md">
      <Link to={productPath(product)} className="relative block">
        <Img src={product.imageUrl} alt={product.name} className="h-44 w-full" />
        <WishlistHeart type="product" id={product.id} className="absolute right-3 top-3" />
        {product.status === "OUT_OF_STOCK" && (
          <span className="absolute left-3 top-3 rounded-full bg-coffee-900/80 px-2 py-0.5 text-[11px] font-semibold text-cream-50">
            Out of stock
          </span>
        )}
      </Link>
      <div className="flex flex-1 flex-col p-4">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-coffee-400">{product.categoryName ?? product.type}</p>
        <Link to={productPath(product)} className="mt-1 line-clamp-2 font-semibold text-coffee-900 hover:underline">
          {product.name}
        </Link>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-coffee-500">
          {product.vendorSlug ? (
            <Link to={`/suppliers/${product.vendorSlug}`} className="font-medium hover:underline">
              {product.vendorName}
            </Link>
          ) : (
            <span>{product.sellerName}</span>
          )}
          {product.vendorVerified && <VerifiedBadge compact />}
        </div>
        {location && (
          <p className="mt-1 flex items-center gap-1 text-xs text-coffee-400">
            <MapPin size={12} /> {location}
          </p>
        )}
        <div className="mt-2">
          <StarRating rating={product.avgRating} count={product.reviewCount} size={12} />
        </div>
        <div className="mt-auto flex items-end justify-between gap-2 pt-3">
          <div>
            <p className="text-lg font-bold text-coffee-900">
              {money(product.price)}
              {product.priceUnit && <span className="text-xs font-medium text-coffee-400"> / {product.priceUnit}</span>}
            </p>
            {product.moq != null && product.moq > 1 && (
              <p className="text-[11px] text-coffee-500">
                MOQ {product.moq} {product.priceUnit ?? "units"}
              </p>
            )}
          </div>
          <Link
            to={productPath(product)}
            className="shrink-0 rounded-full bg-coffee-800 px-3 py-1.5 text-xs font-semibold text-cream-50 hover:bg-coffee-700"
          >
            View Product
          </Link>
        </div>
      </div>
    </article>
  );
}
