import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Coffee, Cog, Search, Wrench } from "lucide-react";
import { api } from "../../api/client";
import type { Product } from "../../types";

const typeIcon: Record<string, typeof Coffee> = {
  BEAN: Coffee,
  MACHINE: Cog,
  ACCESSORY: Wrench,
};

const MAX_SUGGESTIONS = 6;

// Small module-level cache so the desktop and mobile search bars (both
// mounted at once, just toggled with CSS/AnimatePresence) share one fetch
// instead of hitting the API twice for the same near-static catalog.
let productsCache: Product[] | null = null;
let productsPromise: Promise<Product[]> | null = null;

function loadProducts(): Promise<Product[]> {
  if (productsCache) return Promise.resolve(productsCache);
  if (!productsPromise) {
    productsPromise = api
      .get<Product[]>("/api/products")
      .then((res) => {
        productsCache = res.data;
        return res.data;
      })
      .catch(() => []);
  }
  return productsPromise;
}

export default function SearchBar({
  className,
  onNavigate,
}: {
  className?: string;
  onNavigate?: () => void;
}) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  useEffect(() => {
    loadProducts().then(setProducts);
  }, []);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  const suggestions = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return products
      .filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.category?.toLowerCase().includes(q) ?? false) ||
          (p.description?.toLowerCase().includes(q) ?? false),
      )
      .slice(0, MAX_SUGGESTIONS);
  }, [products, query]);

  function goToProduct(p: Product) {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate(`/products/${p.id}`);
  }

  function goToAllResults(q: string) {
    setOpen(false);
    onNavigate?.();
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (activeIndex >= 0 && suggestions[activeIndex]) {
      goToProduct(suggestions[activeIndex]);
    } else {
      goToAllResults(query.trim());
    }
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (!open || suggestions.length === 0) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => (i + 1) % suggestions.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => (i <= 0 ? suggestions.length - 1 : i - 1));
    }
  }

  const showDropdown = open && query.trim().length > 0;

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <form onSubmit={onSubmit}>
        <div className="flex items-center gap-2 rounded-full border border-coffee-100 bg-white px-4 py-2">
          <Search size={16} className="text-coffee-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            placeholder="Search coffee, equipment, brands…"
            className="min-w-0 flex-1 bg-transparent text-sm text-coffee-900 outline-none placeholder:text-coffee-400"
            role="combobox"
            aria-expanded={showDropdown}
            aria-autocomplete="list"
          />
        </div>
      </form>

      {showDropdown && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50 shadow-lg">
          {suggestions.length > 0 ? (
            <ul>
              {suggestions.map((p, i) => {
                const Icon = typeIcon[p.type] ?? Coffee;
                return (
                  <li key={p.id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => goToProduct(p)}
                      onMouseEnter={() => setActiveIndex(i)}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition ${
                        i === activeIndex ? "bg-coffee-100/70" : "hover:bg-coffee-100/50"
                      }`}
                    >
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coffee-100">
                        <Icon size={15} className="text-coffee-500" />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-coffee-900">
                          {p.name}
                        </span>
                        <span className="block truncate text-xs text-coffee-400">
                          {p.category ?? p.type}
                        </span>
                      </span>
                      <span className="shrink-0 text-sm font-semibold text-coffee-700">
                        ₹{p.price.toLocaleString("en-IN")}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="px-4 py-3 text-sm text-coffee-400">No products match “{query.trim()}”.</p>
          )}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => goToAllResults(query.trim())}
            className="block w-full border-t border-coffee-100 px-4 py-2.5 text-left text-xs font-semibold text-coffee-600 hover:bg-coffee-100/50"
          >
            See all results for “{query.trim()}”
          </button>
        </div>
      )}
    </div>
  );
}
