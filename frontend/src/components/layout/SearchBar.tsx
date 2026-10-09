import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Store, Tag } from "lucide-react";
import { api, track } from "../../api/client";
import { money } from "../../lib/format";
import type { SearchResults } from "../../types";
import { Img, VerifiedBadge } from "../ui/Common";
import { productPath } from "../ui/ProductCard";

const DEBOUNCE_MS = 250;

/** Global search: products, suppliers and categories from one server-side query (nothing is preloaded). */
export default function SearchBar({
  className,
  onNavigate,
  large = false,
}: {
  className?: string;
  onNavigate?: () => void;
  large?: boolean;
}) {
  const navigate = useNavigate();
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResults | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(() => {
      api
        .get<SearchResults>("/api/search", { params: { q: term } })
        .then((res) => {
          if (!cancelled) setResults(res.data);
        })
        .catch(() => undefined);
    }, DEBOUNCE_MS);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(path: string) {
    setOpen(false);
    setQuery("");
    onNavigate?.();
    navigate(path);
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const term = query.trim();
    if (term) track("search", term);
    setOpen(false);
    onNavigate?.();
    navigate(term ? `/products?q=${encodeURIComponent(term)}` : "/products");
  }

  const term = query.trim();
  const showDropdown = open && term.length >= 2 && results !== null;
  const empty = results && results.products.length === 0 && results.suppliers.length === 0 && results.categories.length === 0;

  return (
    <div ref={wrapperRef} className={`relative ${className ?? ""}`}>
      <form onSubmit={onSubmit} role="search">
        <div className={`flex items-center gap-2 rounded-full border border-coffee-100 bg-white ${large ? "px-5 py-3" : "px-4 py-2"}`}>
          <Search size={large ? 18 : 16} className="shrink-0 text-coffee-400" />
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={(e) => e.key === "Escape" && setOpen(false)}
            placeholder="Search products, suppliers, categories…"
            aria-label="Search the marketplace"
            className={`min-w-0 flex-1 bg-transparent text-coffee-900 outline-none placeholder:text-coffee-400 ${large ? "text-base" : "text-sm"}`}
          />
          {large && (
            <button type="submit" className="shrink-0 rounded-full bg-coffee-800 px-4 py-1.5 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
              Search
            </button>
          )}
        </div>
      </form>

      {showDropdown && results && (
        <div className="absolute inset-x-0 top-full z-50 mt-2 max-h-[70vh] overflow-y-auto rounded-2xl border border-coffee-100 bg-cream-50 text-left shadow-lg">
          {empty && <p className="px-4 py-3 text-sm text-coffee-400">Nothing matches “{term}”.</p>}

          {results.categories.length > 0 && (
            <div className="border-b border-coffee-100 px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-coffee-400">Categories</p>
              {results.categories.map((c) => (
                <button key={c.id} type="button" onClick={() => go(`/category/${c.slug}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-coffee-800 hover:bg-coffee-100/60">
                  <Tag size={14} className="text-coffee-400" /> {c.name}
                </button>
              ))}
            </div>
          )}

          {results.products.length > 0 && (
            <div className="border-b border-coffee-100 px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-coffee-400">Products</p>
              {results.products.map((p) => (
                <button key={p.id} type="button" onClick={() => go(productPath(p))} className="flex w-full items-center gap-3 rounded-lg px-2 py-1.5 text-left hover:bg-coffee-100/60">
                  <Img src={p.imageUrl} alt="" className="h-9 w-9 shrink-0 rounded-lg" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-coffee-900">{p.name}</span>
                    <span className="block truncate text-xs text-coffee-400">{p.vendorName ?? p.categoryName}</span>
                  </span>
                  <span className="shrink-0 text-sm font-semibold text-coffee-700">{money(p.price)}</span>
                </button>
              ))}
            </div>
          )}

          {results.suppliers.length > 0 && (
            <div className="border-b border-coffee-100 px-2 py-2">
              <p className="px-2 pb-1 text-[11px] font-semibold uppercase tracking-wide text-coffee-400">Suppliers</p>
              {results.suppliers.map((s) => (
                <button key={s.id} type="button" onClick={() => go(`/suppliers/${s.slug}`)} className="flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm text-coffee-800 hover:bg-coffee-100/60">
                  <Store size={14} className="shrink-0 text-coffee-400" />
                  <span className="min-w-0 flex-1 truncate">{s.businessName}</span>
                  {s.verified && <VerifiedBadge compact />}
                </button>
              ))}
            </div>
          )}

          <button type="button" onClick={onSubmit} className="block w-full px-4 py-2.5 text-left text-xs font-semibold text-coffee-600 hover:bg-coffee-100/50">
            See all {results.totalProducts > 0 ? `${results.totalProducts} ` : ""}product results for “{term}”
          </button>
        </div>
      )}
    </div>
  );
}
