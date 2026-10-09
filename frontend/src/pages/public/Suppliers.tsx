import { useEffect, useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MapPin, Package } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { INDIAN_STATES, VENDOR_TYPES } from "../../lib/constants";
import { place } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { Page, VendorSummary } from "../../types";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Img, PageHeader, Pagination, SkeletonGrid, VerifiedBadge } from "../../components/ui/Common";
import { Input, Select } from "../../components/ui/Input";
import { StarRating } from "../../components/ui/StarRating";

export function SupplierCard({ supplier }: { supplier: VendorSummary }) {
  const location = place(supplier.city, supplier.state);
  const typeLabel = supplier.vendorTypeLabel ?? VENDOR_TYPES.find((t) => t.value === supplier.vendorType)?.label;
  return (
    <Link
      to={`/suppliers/${supplier.slug}`}
      className="flex flex-col rounded-2xl border border-coffee-100 bg-cream-50 p-4 shadow-sm transition hover:shadow-md"
    >
      <div className="flex items-start gap-3">
        <Img src={supplier.logoUrl} alt={`${supplier.businessName} logo`} className="h-14 w-14 shrink-0 rounded-xl" />
        <div className="min-w-0">
          <p className="line-clamp-2 font-semibold text-coffee-900">{supplier.businessName}</p>
          {typeLabel && <p className="text-xs text-coffee-500">{typeLabel}</p>}
        </div>
      </div>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {supplier.verified && <VerifiedBadge />}
        <StarRating rating={supplier.avgRating} count={supplier.reviewCount} size={12} />
      </div>
      <div className="mt-auto flex flex-wrap items-center justify-between gap-x-3 gap-y-1 pt-3 text-xs text-coffee-500">
        {location && (
          <span className="flex items-center gap-1">
            <MapPin size={12} /> {location}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Package size={12} /> {supplier.productCount} {supplier.productCount === 1 ? "product" : "products"}
        </span>
      </div>
    </Link>
  );
}

export default function Suppliers() {
  const brand = useBrand();
  const [params, setParams] = useSearchParams();
  const q = params.get("q") ?? "";
  const type = params.get("type") ?? "";
  const state = params.get("state") ?? "";
  const pageIndex = Math.max(0, Number(params.get("page")) || 0);

  const [result, setResult] = useState<Page<VendorSummary> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState(q);

  useSeo(
    {
      title: "Verified coffee suppliers",
      description: `Browse verified coffee estates, roasters, brands and equipment suppliers on ${brand.name}.`,
      canonicalPath: "/suppliers",
    },
    brand.name,
  );

  useEffect(() => setSearch(q), [q]);

  useEffect(() => {
    let stale = false;
    setResult(null);
    setError(null);
    api
      .get<Page<VendorSummary>>("/api/suppliers", {
        params: { q: q || undefined, type: type || undefined, state: state || undefined, page: pageIndex, size: 12 },
      })
      .then((res) => {
        if (!stale) setResult(res.data);
      })
      .catch((err) => {
        if (!stale) setError(apiErrorMessage(err, "Could not load suppliers"));
      });
    return () => {
      stale = true;
    };
  }, [q, type, state, pageIndex]);

  // Changing a filter returns to the first page.
  function update(key: string, value: string) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });
  }

  function onSearch(e: FormEvent) {
    e.preventDefault();
    update("q", search.trim());
  }

  const filtered = Boolean(q || type || state);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <PageHeader title="Supplier directory" subtitle="Every supplier listed here has been approved by our team. Look for the verified badge." />

      <form onSubmit={onSearch} className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_14rem_14rem_auto]">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by supplier name" aria-label="Search suppliers" />
        <Select value={type} onChange={(e) => update("type", e.target.value)} aria-label="Supplier type">
          <option value="">All supplier types</option>
          {VENDOR_TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </Select>
        <Select value={state} onChange={(e) => update("state", e.target.value)} aria-label="State">
          <option value="">All states</option>
          {INDIAN_STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </Select>
        <Button type="submit">Search</Button>
      </form>

      <div className="mt-6">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : result === null ? (
          <SkeletonGrid count={8} className="h-40" />
        ) : result.content.length === 0 ? (
          <EmptyState
            title={filtered ? "No suppliers match these filters" : "No verified suppliers yet"}
            hint={filtered ? "Try a different name, type or state." : "Check back soon: new suppliers are being verified."}
            action={
              filtered ? (
                <Button variant="secondary" onClick={() => setParams({})}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : (
          <>
            <p className="mb-3 text-sm text-coffee-500">
              {result.totalElements} {result.totalElements === 1 ? "supplier" : "suppliers"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {result.content.map((s) => (
                <SupplierCard key={s.id} supplier={s} />
              ))}
            </div>
            <Pagination page={result} onChange={(p) => update("page", p > 0 ? String(p) : "")} />
          </>
        )}
      </div>
    </div>
  );
}
