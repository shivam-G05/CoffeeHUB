import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Coffee, Cog, PackageCheck, Wrench } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Product } from "../../types";
import Button from "../../components/ui/Button";
import { StarRating } from "../../components/ui/StarRating";
import WishlistHeart from "../../components/ui/WishlistHeart";
import ReviewSection from "../../components/reviews/ReviewSection";

const typeIcon: Record<string, typeof Coffee> = {
  BEAN: Coffee,
  MACHINE: Cog,
  ACCESSORY: Wrench,
};

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, refreshUser } = useAuth();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [ordering, setOrdering] = useState(false);
  const [quantity, setQuantity] = useState(1);

  function load() {
    setLoading(true);
    api
      .get<Product>(`/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .finally(() => setLoading(false));
  }

  useEffect(load, [id]);

  async function orderNow() {
    if (!product) return;
    if (!user) {
      navigate("/login", { state: { from: `/products/${id}` } });
      return;
    }
    if (user.role !== "CUSTOMER") {
      showToast("Only customer accounts can place orders", "info");
      return;
    }
    setOrdering(true);
    try {
      await api.post("/api/orders", { items: [{ productId: product.id, quantity }] });
      showToast(`Order placed for ${quantity} × ${product.name}`);
      load();
      refreshUser();
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not place order"), "error");
    } finally {
      setOrdering(false);
    }
  }

  if (loading) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-coffee-400">Loading product…</div>;
  }
  if (!product) {
    return <div className="mx-auto max-w-5xl px-6 py-16 text-coffee-400">Product not found.</div>;
  }

  const Icon = typeIcon[product.type] ?? Coffee;

  return (
    <div className="mx-auto max-w-5xl px-6 py-10">
      <Link to="/products" className="inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
        <ArrowLeft size={16} /> Back to Beans &amp; Machines
      </Link>

      <div className="mt-6 grid gap-8 md:grid-cols-2">
        <div className="relative flex h-72 items-center justify-center rounded-2xl bg-coffee-100">
          <Icon size={72} className="text-coffee-400" />
          <WishlistHeart type="product" id={product.id} className="absolute right-4 top-4" />
        </div>

        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">{product.category ?? product.type}</p>
          <h1 className="mt-1 text-3xl font-bold text-coffee-900">{product.name}</h1>
          <div className="mt-2">
            <StarRating rating={product.avgRating} count={product.reviewCount} />
          </div>
          <p className="mt-4 text-sm text-coffee-500">{product.description}</p>

          <div className="mt-6 flex items-baseline gap-3">
            <span className="text-3xl font-bold text-coffee-900">₹{product.price.toLocaleString("en-IN")}</span>
            <span className="text-sm text-coffee-400">by {product.sellerName}</span>
          </div>

          <div className="mt-2 flex items-center gap-2 text-sm text-coffee-500">
            <PackageCheck size={16} className={product.stock > 0 ? "text-green-600" : "text-red-500"} />
            {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
          </div>

          <div className="mt-6 flex items-center gap-3">
            <div className="flex items-center rounded-full border border-coffee-200">
              <button
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="px-3 py-2 text-coffee-600 hover:text-coffee-900"
              >
                −
              </button>
              <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
              <button
                onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                className="px-3 py-2 text-coffee-600 hover:text-coffee-900"
              >
                +
              </button>
            </div>
            <Button disabled={product.stock <= 0 || ordering} onClick={orderNow}>
              {ordering ? "Placing order…" : "Order now"}
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-14 border-t border-coffee-100 pt-8">
        <ReviewSection
          targetType="product"
          targetId={product.id}
          avgRating={product.avgRating}
          reviewCount={product.reviewCount}
          onReviewAdded={load}
        />
      </div>
    </div>
  );
}
