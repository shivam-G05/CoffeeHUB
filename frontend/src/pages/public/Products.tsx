import { useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, SlidersHorizontal, X } from "lucide-react";
import { api, apiErrorMessage, track } from "../../api/client";
import { useBrand } from "../../context/BrandContext";
import { label } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { AttributeDef, Category, Page, Product } from "../../types";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Pagination, SkeletonGrid } from "../../components/ui/Common";
import { Field, Input, Select } from "../../components/ui/Input";
import ProductCard from "../../components/ui/ProductCard";

const SORTS = [
  { value: "", label: "Newest" },
  { value: "price_asc", label: "Price: low to high" },
  { value: "price_desc", label: "Price: high to low" },
  { value: "rating", label: "Top rated" },
];

// Params that are not part of the filter panel's draft state.
const NON_FILTER = ["q", "sort", "page", "category"];
// Filters that can arrive by link (e.g. /products?type=BEAN) but have no control in the panel.
const LINK_ONLY: Record<string, string> = { type: "Type", seller: "Seller", maxMoq: "Max MOQ" };

type Filters = Record<string, string>;

function filtersOf(params: URLSearchParams): Filters {
  const filters: Filters = {};
  params.forEach((value, key) => {
    if (!NON_FILTER.includes(key) && value) filters[key] = value;
  });
  return filters;
}

function AttributeFilter({ def, value, onChange }: { def: AttributeDef; value: string; onChange: (value: string, commit: boolean) => void }) {
  const title = def.unit ? `${def.label} (${def.unit})` : def.label;
  if (def.type === "BOOLEAN") {
    return (
      <label className="flex items-center gap-2 text-sm text-coffee-800">
        <input type="checkbox" checked={value === "true"} onChange={(e) => onChange(e.target.checked ? "true" : "", true)} className="h-4 w-4 accent-coffee-800" />
        {def.label}
      </label>
    );
  }
  if (def.type === "SELECT") {
    return (
      <Field label={title}>
        <Select value={value} onChange={(e) => onChange(e.target.value, true)}>
          <option value="">Any</option>
          {def.options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </Field>
    );
  }
  return (
    <Field label={title}>
      <Input value={value} maxLength={100} onChange={(e) => onChange(e.target.value, false)} />
    </Field>
  );
}

export default function Products() {
  const brand = useBrand();
  const navigate = useNavigate();
  const { categorySlug: routeSlug } = useParams();
  const [params, setParams] = useSearchParams();

  // All filter, sort and page state lives in the URL so any view can be shared as a link.
  const categorySlug = routeSlug ?? params.get("category") ?? "";
  const q = params.get("q")?.trim() ?? "";
  const sort = params.get("sort") ?? "";
  const pageIndex = Math.max(0, Number(params.get("page")) || 0);
  const query = params.toString();

  const [tree, setTree] = useState<Category[]>([]);
  const [category, setCategory] = useState<Category | null>(null);
  const [result, setResult] = useState<Page<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Filters>(() => filtersOf(params));
  const [filtersOpen, setFiltersOpen] = useState(false);

  useSeo(
    {
      title: category?.name ?? (q ? `Search: ${q}` : "Marketplace"),
      description: category
        ? `Buy ${category.name.toLowerCase()} from verified suppliers on ${brand.name}.`
        : `Browse coffee, equipment and supplies from verified suppliers on ${brand.name}.`,
      canonicalPath: routeSlug ? `/category/${routeSlug}` : "/products",
    },
    brand.name,
  );

  useEffect(() => {
    api
      .get<Category[]>("/api/categories")
      .then((res) => setTree(res.data))
      .catch(() => undefined); // the category filter is simply not offered
  }, []);

  useEffect(() => {
    setCategory(null);
    if (!categorySlug) return;
    let stale = false;
    api
      .get<Category>(`/api/categories/${encodeURIComponent(categorySlug)}`)
      .then((res) => !stale && setCategory(res.data))
      .catch(() => undefined); // an unknown category is reported by the product search below
    return () => {
      stale = true;
    };
  }, [categorySlug]);

  useEffect(() => {
    let stale = false;
    setResult(null);
    setError(null);
    const current = new URLSearchParams(query);
    api
      .get<Page<Product>>("/api/products", {
        params: { ...Object.fromEntries(current), category: categorySlug || undefined, page: pageIndex, size: 12 },
      })
      .then((res) => !stale && setResult(res.data))
      .catch((err) => !stale && setError(apiErrorMessage(err, "Could not load products")));
    return () => {
      stale = true;
    };
  }, [query, categorySlug, pageIndex]);

  useEffect(() => setDraft(filtersOf(new URLSearchParams(query))), [query]);

  useEffect(() => {
    if (q) track("search", q);
  }, [q]);

  function searchFor(filters: Filters, nextSort = sort): URLSearchParams {
    const next = new URLSearchParams();
    if (q) next.set("q", q);
    if (nextSort) next.set("sort", nextSort);
    // only the legacy /products?category= form keeps the slug in the query string
    if (!routeSlug && categorySlug) next.set("category", categorySlug);
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) next.set(key, value.trim());
    });
    return next;
  }

  /** Text fields update the draft only; selects and checkboxes commit straight to the URL. */
  function setFilter(key: string, value: string, commit: boolean) {
    const next = { ...draft, [key]: value };
    setDraft(next);
    if (commit) setParams(searchFor(next));
  }

  function applyDraft(e: FormEvent) {
    e.preventDefault();
    setParams(searchFor(draft));
    setFiltersOpen(false);
  }

  // Attribute filters belong to one category, so they are dropped when it changes.
  function changeCategory(slug: string) {
    const kept = Object.fromEntries(Object.entries(draft).filter(([key]) => !key.startsWith("attr_")));
    const next = searchFor(kept);
    next.delete("category");
    const search = next.toString();
    navigate(`${slug ? `/category/${slug}` : "/products"}${search ? `?${search}` : ""}`);
  }

  function clearAll() {
    if (routeSlug) setParams(q ? { q } : {});
    else navigate(q ? `/products?q=${encodeURIComponent(q)}` : "/products");
  }

  function goToPage(page: number) {
    setParams((prev) => {
      const next = new URLSearchParams(prev);
      if (page > 0) next.set("page", String(page));
      else next.delete("page");
      return next;
    });
    window.scrollTo({ top: 0 });
  }

  const attributeFilters = (category?.attributes ?? []).filter((a) => a.filterable && a.type !== "NUMBER");
  const activeCount = Object.keys(filtersOf(params)).length;
  const linkOnly = Object.keys(LINK_ONLY).filter((key) => params.get(key));
  const heading = category?.name ?? (q ? `Results for “${q}”` : "Marketplace");

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {category?.parentSlug && (
        <Link to={`/category/${category.parentSlug}`} className="mb-2 inline-flex items-center gap-1 text-sm font-medium text-coffee-500 hover:text-coffee-800">
          <ArrowLeft size={14} /> {category.parentName}
        </Link>
      )}
      <h1 className="text-2xl font-bold text-coffee-900">{heading}</h1>
      <p className="mt-1 text-sm text-coffee-500">
        {category && q ? `Results for “${q}” in this category. ` : ""}
        Products are sold and shipped by independent verified suppliers.
      </p>

      {category && category.children.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {category.children.map((child) => (
            <Link key={child.id} to={`/category/${child.slug}`} className="rounded-full bg-coffee-100 px-3 py-1.5 text-sm font-medium text-coffee-800 hover:bg-coffee-200">
              {child.name}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <aside>
          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            aria-expanded={filtersOpen}
            aria-controls="product-filters"
            className="flex w-full items-center justify-between rounded-2xl border border-coffee-200 bg-cream-50 px-4 py-2.5 text-sm font-semibold text-coffee-800 lg:hidden"
          >
            <span className="flex items-center gap-2">
              <SlidersHorizontal size={16} /> Filters{activeCount > 0 ? ` (${activeCount})` : ""}
            </span>
            <span className="text-xs font-medium text-coffee-500">{filtersOpen ? "Hide" : "Show"}</span>
          </button>

          <form
            id="product-filters"
            onSubmit={applyDraft}
            className={`${filtersOpen ? "mt-3 block" : "hidden"} space-y-4 rounded-2xl border border-coffee-100 bg-cream-50 p-4 lg:mt-0 lg:block`}
          >
            {tree.length > 0 && (
              <Field label="Category">
                <Select value={categorySlug} onChange={(e) => changeCategory(e.target.value)}>
                  <option value="">All categories</option>
                  {tree.map((root) => [
                    <option key={root.id} value={root.slug}>
                      {root.name}
                    </option>,
                    ...root.children.map((child) => (
                      <option key={child.id} value={child.slug}>
                        {"   "}
                        {child.name}
                      </option>
                    )),
                  ])}
                </Select>
              </Field>
            )}

            <div>
              <span className="mb-1 block text-xs font-semibold text-coffee-600">Price (₹)</span>
              <div className="grid grid-cols-2 gap-2">
                <Input type="number" min={0} inputMode="decimal" placeholder="Min" aria-label="Minimum price" value={draft.minPrice ?? ""} onChange={(e) => setFilter("minPrice", e.target.value, false)} />
                <Input type="number" min={0} inputMode="decimal" placeholder="Max" aria-label="Maximum price" value={draft.maxPrice ?? ""} onChange={(e) => setFilter("maxPrice", e.target.value, false)} />
              </div>
            </div>

            <Field label="Supplier location">
              <Input placeholder="City or state" maxLength={100} value={draft.location ?? ""} onChange={(e) => setFilter("location", e.target.value, false)} />
            </Field>

            <Field label="Minimum rating">
              <Select value={draft.minRating ?? ""} onChange={(e) => setFilter("minRating", e.target.value, true)}>
                <option value="">Any rating</option>
                <option value="4">4 stars &amp; up</option>
                <option value="3">3 stars &amp; up</option>
                <option value="2">2 stars &amp; up</option>
              </Select>
            </Field>

            <label className="flex items-center gap-2 text-sm text-coffee-800">
              <input type="checkbox" checked={draft.inStock === "true"} onChange={(e) => setFilter("inStock", e.target.checked ? "true" : "", true)} className="h-4 w-4 accent-coffee-800" />
              In stock only
            </label>

            {attributeFilters.length > 0 && (
              <div className="space-y-4 border-t border-coffee-100 pt-4">
                {attributeFilters.map((def) => (
                  <AttributeFilter key={def.key} def={def} value={draft[`attr_${def.key}`] ?? ""} onChange={(value, commit) => setFilter(`attr_${def.key}`, value, commit)} />
                ))}
              </div>
            )}

            <div className="flex gap-2 pt-1">
              <Button type="submit" className="flex-1">
                Apply
              </Button>
              <Button type="button" variant="secondary" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </form>
        </aside>

        <div className="min-w-0">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-coffee-500">
              {result ? `${result.totalElements} ${result.totalElements === 1 ? "product" : "products"}` : " "}
            </p>
            <label className="flex items-center gap-2 text-sm text-coffee-600">
              Sort by
              <Select value={sort} onChange={(e) => setParams(searchFor(filtersOf(params), e.target.value))} className="!w-auto">
                {SORTS.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </Select>
            </label>
          </div>

          {linkOnly.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-2">
              {linkOnly.map((key) => (
                <button
                  key={key}
                  onClick={() => setFilter(key, "", true)}
                  className="inline-flex items-center gap-1 rounded-full bg-coffee-100 px-3 py-1 text-xs font-medium text-coffee-800 hover:bg-coffee-200"
                  aria-label={`Remove ${LINK_ONLY[key]} filter`}
                >
                  {LINK_ONLY[key]}: {key === "type" ? label(params.get(key)) : params.get(key)} <X size={12} />
                </button>
              ))}
            </div>
          )}

          {error ? (
            <ErrorNote>{error}</ErrorNote>
          ) : result === null ? (
            <SkeletonGrid count={6} />
          ) : result.content.length === 0 ? (
            <EmptyState
              title="No products match"
              hint="Try removing a filter or searching for something else. For bulk or custom needs, post a requirement and let suppliers quote."
              action={
                <div className="flex flex-wrap justify-center gap-2">
                  {activeCount > 0 && (
                    <Button variant="secondary" onClick={clearAll}>
                      Clear filters
                    </Button>
                  )}
                  <Button onClick={() => navigate("/post-requirement")}>Post Requirement</Button>
                </div>
              }
            />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {result.content.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination page={result} onChange={goToPage} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
