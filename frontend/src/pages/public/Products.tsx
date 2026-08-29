import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Coffee, Cog, Scale, Wrench } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import type { Product, ProductType } from "../../types";
import Button from "../../components/ui/Button";
import { StarRating } from "../../components/ui/StarRating";
import WishlistHeart from "../../components/ui/WishlistHeart";

const typeFilters: { value: ProductType | ""; label: string }[] = [
  { value: "", label: "All" },
  { value: "BEAN", label: "Beans" },
  { value: "MACHINE", label: "Machines" },
  { value: "ACCESSORY", label: "Accessories" },
];

const typeIcon: Record<string, typeof Coffee> = {
  BEAN: Coffee,
  MACHINE: Cog,
  ACCESSORY: Wrench,
};

const VALID_TYPES: ProductType[] = ["BEAN", "MACHINE", "ACCESSORY"];

export default function Products() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [searchParams, setSearchParams] = useSearchParams();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [orderingId, setOrderingId] = useState<number | null>(null);
  const [compareIds, setCompareIds] = useState<number[]>([]);

  // Filters are driven by the URL so nav/category links and search are shareable.
  const typeParam = searchParams.get("type");
  const type: ProductType | "" = VALID_TYPES.includes(typeParam as ProductType)
    ? (typeParam as ProductType)
    : "";
  const query = searchParams.get("q")?.trim().toLowerCase() ?? "";

  function setType(next: ProductType | "") {
    setSearchParams((prev) => {
      const p = new URLSearchParams(prev);
      if (next) p.set("type", next);
      else p.delete("type");
      return p;
    });
  }

  useEffect(() => {
    setLoading(true);
    api
      .get<Product[]>("/api/products", { params: type ? { type } : {} })
      .then((res) => setProducts(res.data))
      .finally(() => setLoading(false));
  }, [type]);

  const visibleProducts = useMemo(() => {
    if (!query) return products;
    return products.filter(
      (p) =>
        p.name.toLowerCase().includes(query) ||
        (p.description?.toLowerCase().includes(query) ?? false) ||
        (p.category?.toLowerCase().includes(query) ?? false) ||
        p.sellerName.toLowerCase().includes(query),
    );
  }, [products, query]);

  async function orderNow(product: Product) {
    if (!user) {
      navigate("/login", { state: { from: "/products" } });
      return;
    }
    if (user.role !== "CUSTOMER") {
      showToast("Only customer accounts can place orders", "info");
      return;
    }
    setOrderingId(product.id);
    try {
      await api.post("/api/orders", { items: [{ productId: product.id, quantity: 1 }] });
      showToast(`Order placed for ${product.name}!`);
      setProducts((prev) => prev.map((p) => (p.id === product.id ? { ...p, stock: p.stock - 1 } : p)));
      refreshUser();
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not place order"), "error");
    } finally {
      setOrderingId(null);
    }
  }

  function toggleCompare(id: number) {
    setCompareIds((prev) => {
      if (prev.includes(id)) return prev.filter((i) => i !== id);
      if (prev.length >= 3) {
        showToast("You can compare up to 3 machines at a time", "info");
        return prev;
      }
      return [...prev, id];
    });
  }

  return (
    <div className="mx-auto max-w-6xl px-6 py-12 pb-28">
      <h1 className="text-3xl font-bold text-coffee-900">Beans &amp; Machines</h1>
      <p className="mt-1 text-coffee-500">
        {query
          ? `Showing results for “${query}”`
          : "Buy coffee beans, machines and accessories from verified sellers."}
      </p>

      <div className="mt-6 flex flex-wrap gap-2">
        {typeFilters.map((f) => (
          <button
            key={f.value}
            onClick={() => setType(f.value)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium ${
              type === f.value ? "bg-coffee-800 text-cream-50" : "bg-coffee-100 text-coffee-700"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="mt-10 text-coffee-400">Loading products…</p>
      ) : visibleProducts.length === 0 ? (
        <p className="mt-10 text-coffee-400">
          {query
            ? `No products match “${query}”.`
            : "No approved products yet — check back soon."}
        </p>
      ) : (
        <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {visibleProducts.map((p) => {
            const Icon = typeIcon[p.type] ?? Coffee;
            return (
              <div key={p.id} className="flex flex-col rounded-2xl border border-coffee-100 bg-cream-50 p-5 shadow-sm transition hover:shadow-md">
                <Link to={`/products/${p.id}`} className="relative flex h-32 items-center justify-center rounded-xl bg-coffee-100">
                  <Icon size={40} className="text-coffee-400" />
                  <WishlistHeart type="product" id={p.id} className="absolute right-2 top-2 h-8 w-8" />
                </Link>
                <Link to={`/products/${p.id}`}>
                  <h3 className="mt-4 font-semibold text-coffee-900 hover:underline">{p.name}</h3>
                </Link>
                <p className="text-xs text-coffee-400">by {p.sellerName}</p>
                <div className="mt-1">
                  <StarRating rating={p.avgRating} count={p.reviewCount} size={12} />
                </div>
                <p className="mt-2 line-clamp-2 text-sm text-coffee-500">{p.description}</p>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-lg font-bold text-coffee-900">₹{p.price.toLocaleString("en-IN")}</span>
                  <span className="text-xs text-coffee-400">{p.stock} in stock</span>
                </div>
                <Button
                  className="mt-4"
                  disabled={p.stock <= 0 || orderingId === p.id}
                  onClick={() => orderNow(p)}
                >
                  {p.stock <= 0 ? "Out of stock" : orderingId === p.id ? "Placing order…" : "Order now"}
                </Button>
                {p.type === "MACHINE" && (
                  <label className="mt-3 flex items-center gap-2 text-xs text-coffee-500">
                    <input
                      type="checkbox"
                      checked={compareIds.includes(p.id)}
                      onChange={() => toggleCompare(p.id)}
                      className="rounded border-coffee-300"
                    />
                    Add to compare
                  </label>
                )}
              </div>
            );
          })}
        </div>
      )}

      {compareIds.length > 0 && (
        <div className="fixed inset-x-0 bottom-6 z-30 flex justify-center px-4">
          <div className="flex items-center gap-4 rounded-full bg-coffee-900 px-6 py-3 text-cream-50 shadow-xl">
            <span className="flex items-center gap-2 text-sm font-medium">
              <Scale size={16} /> {compareIds.length} machine{compareIds.length > 1 ? "s" : ""} selected
            </span>
            <Link
              to={`/products/compare?ids=${compareIds.join(",")}`}
              className="rounded-full bg-cream-50 px-4 py-1.5 text-sm font-semibold text-coffee-900 hover:bg-cream-200"
            >
              Compare
            </Link>
            <button onClick={() => setCompareIds([])} className="text-xs text-coffee-300 hover:text-cream-50">
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
