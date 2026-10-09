import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BadgeCheck, ClipboardList, Coffee, Handshake, Lock, MessagesSquare, Scale } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useSeo } from "../../lib/seo";
import type { Category, ContentBlock, Page, Product, VendorSummary } from "../../types";
import SearchBar from "../../components/layout/SearchBar";
import heroImage from "../../components/layout/beans.jpg";
import { EmptyState, ErrorNote, Img, SkeletonGrid } from "../../components/ui/Common";
import ProductCard from "../../components/ui/ProductCard";
import { SupplierCard } from "./Suppliers";

const primaryCta = "inline-flex items-center justify-center gap-2 rounded-full bg-coffee-800 px-5 py-2.5 text-sm font-semibold text-cream-50 hover:bg-coffee-700";
const secondaryCta = "inline-flex items-center justify-center gap-2 rounded-full border border-coffee-300 bg-cream-50 px-5 py-2.5 text-sm font-semibold text-coffee-800 hover:bg-coffee-100";

const RFQ_STEPS = [
  { icon: ClipboardList, title: "Post your requirement", text: "Tell us what you need: product, quantity, target price and delivery location." },
  { icon: MessagesSquare, title: "Verified suppliers quote", text: "We review it and route it to matching verified suppliers, who send their quotes." },
  { icon: Scale, title: "Compare and select", text: "Compare price, lead time and supplier ratings side by side, then pick one." },
];

interface Loaded<T> {
  data: T | null;
  error: string | null;
}

function useLoad<T>(load: () => Promise<T>, fallbackError: string): Loaded<T> {
  const [state, setState] = useState<Loaded<T>>({ data: null, error: null });
  useEffect(() => {
    let stale = false;
    load()
      .then((data) => !stale && setState({ data, error: null }))
      .catch((err) => !stale && setState({ data: null, error: apiErrorMessage(err, fallbackError) }));
    return () => {
      stale = true;
    };
    // each loader is a fixed request: run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return state;
}

/** Featured categories first (at any depth); top-level ones fill in when few are marked featured. */
function pickCategories(tree: Category[]): Category[] {
  const all = tree.flatMap((c) => [c, ...c.children]);
  const featured = all.filter((c) => c.featured);
  const rest = tree.filter((c) => !c.featured);
  return (featured.length >= 4 ? featured : [...featured, ...rest]).slice(0, 8);
}

async function loadSuppliers(): Promise<VendorSummary[]> {
  const featured = (await api.get<VendorSummary[]>("/api/suppliers/featured")).data;
  if (featured.length > 0) return featured.slice(0, 4);
  return (await api.get<Page<VendorSummary>>("/api/suppliers", { params: { size: 4 } })).data.content;
}

function Section({ title, subtitle, link, children }: { title: string; subtitle?: string; link?: { to: string; text: string }; children: ReactNode }) {
  return (
    <section className="mx-auto max-w-7xl px-4 py-10 sm:px-6">
      <div className="mb-5 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-xl font-bold text-coffee-900 sm:text-2xl">{title}</h2>
          {subtitle && <p className="mt-1 text-sm text-coffee-500">{subtitle}</p>}
        </div>
        {link && (
          <Link to={link.to} className="inline-flex items-center gap-1 text-sm font-semibold text-coffee-700 hover:underline">
            {link.text} <ArrowRight size={14} />
          </Link>
        )}
      </div>
      {children}
    </section>
  );
}

function Banner({ banner }: { banner: ContentBlock }) {
  const inner = (
    <>
      <span className="font-semibold">{banner.title}</span>
      {banner.body && <span className="text-coffee-200"> {banner.body}</span>}
    </>
  );
  const cls = "block px-4 py-2 text-center text-sm text-cream-50";
  // Internal links stay in the SPA; only http(s) URLs are rendered as external links.
  if (!banner.linkUrl || !/^(\/(?!\/)|https?:\/\/)/i.test(banner.linkUrl)) return <p className={cls}>{inner}</p>;
  return banner.linkUrl.startsWith("/") ? (
    <Link to={banner.linkUrl} className={`${cls} hover:underline`}>
      {inner}
    </Link>
  ) : (
    <a href={banner.linkUrl} target="_blank" rel="noopener noreferrer" className={`${cls} hover:underline`}>
      {inner}
    </a>
  );
}

export default function Home() {
  const brand = useBrand();
  const { user } = useAuth();
  const banners = useLoad(() => api.get<ContentBlock[]>("/api/content", { params: { type: "BANNER" } }).then((r) => r.data), "");
  const categories = useLoad(() => api.get<Category[]>("/api/categories").then((r) => pickCategories(r.data)), "Could not load categories");
  const suppliers = useLoad(loadSuppliers, "Could not load suppliers");
  const products = useLoad(() => api.get<Product[]>("/api/products/featured").then((r) => r.data), "Could not load products");

  useSeo(
    {
      title: brand.tagline,
      description: `${brand.name} is a multi-vendor coffee marketplace: buy coffee, equipment and supplies from verified suppliers, or post a bulk requirement and compare quotes.`,
      canonicalPath: "/",
    },
    brand.name,
  );

  const trust = [
    { icon: BadgeCheck, title: "Verified Sellers", text: "Business documents are checked by our team before a supplier can list anything." },
    { icon: Handshake, title: "B2B Sourcing", text: "Post a bulk requirement once and receive comparable quotes from several suppliers." },
    { icon: Lock, title: "Secure Transactions", text: "Orders, payments and messages stay on the platform, with dispute support if something goes wrong." },
    { icon: Coffee, title: "Coffee-Focused Marketplace", text: "Green and roasted coffee, equipment, accessories and café supplies. Nothing else." },
  ];

  return (
    <div>
      {banners.data && banners.data.length > 0 && (
        <div className="divide-y divide-coffee-700 bg-coffee-800">
          {banners.data.map((b) => (
            <Banner key={b.id} banner={b} />
          ))}
        </div>
      )}

      {/* 1. Hero */}
      <section className="border-b border-coffee-100 bg-cream-100">
        <div className="mx-auto grid max-w-7xl items-center gap-8 px-4 py-10 sm:px-6 lg:grid-cols-[3fr_2fr] lg:py-14">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-coffee-500">{brand.tagline}</p>
            <h1 className="mt-2 font-serif text-3xl font-bold leading-tight text-coffee-900 sm:text-4xl lg:text-5xl">
              Buy and source coffee from verified suppliers
            </h1>
            <p className="mt-3 max-w-xl text-coffee-600">
              One marketplace for coffee, equipment and café supplies from many independent sellers. Order directly, or
              post a bulk requirement and compare supplier quotes.
            </p>
            <SearchBar large className="mt-6 max-w-xl" />
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <Link to="/products" className={primaryCta}>
                Explore Marketplace <ArrowRight size={16} />
              </Link>
              <Link to="/post-requirement" className={secondaryCta}>
                Post Requirement
              </Link>
            </div>
          </div>
          <img src={heroImage} alt="Roasted coffee beans" decoding="async" className="hidden h-80 w-full rounded-2xl object-cover lg:block" />
        </div>
      </section>

      {/* 2. Shop by category */}
      {(categories.error || categories.data === null || categories.data.length > 0) && (
        <Section title="Shop by Category" link={{ to: "/products", text: "All products" }}>
          {categories.error ? (
            <ErrorNote>{categories.error}</ErrorNote>
          ) : categories.data === null ? (
            <SkeletonGrid count={4} className="h-32" />
          ) : (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
              {categories.data.map((c) => (
                <Link
                  key={c.id}
                  to={`/category/${c.slug}`}
                  className="group overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50 shadow-sm transition hover:shadow-md"
                >
                  <Img src={c.imageUrl} alt="" className="h-24 w-full sm:h-28" />
                  <p className="px-3 py-2.5 text-sm font-semibold text-coffee-900 group-hover:underline">{c.name}</p>
                </Link>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 3. B2B sourcing */}
      <section className="bg-coffee-900 text-cream-50">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-xs font-semibold uppercase tracking-wide text-amber-accent">Bulk &amp; B2B sourcing</p>
              <h2 className="mt-1 text-2xl font-bold sm:text-3xl">Need a large or custom order? Let suppliers come to you.</h2>
              <p className="mt-2 text-sm text-coffee-200">
                For cafés, hotels, offices, retailers and private-label brands. Posting a requirement is free.
              </p>
            </div>
            <Link
              to="/post-requirement"
              className="inline-flex shrink-0 items-center justify-center gap-2 rounded-full bg-amber-accent px-6 py-3 text-sm font-bold text-coffee-900 hover:brightness-105"
            >
              Post Requirement <ArrowRight size={16} />
            </Link>
          </div>
          <ol className="mt-8 grid gap-4 md:grid-cols-3">
            {RFQ_STEPS.map((step, i) => (
              <li key={step.title} className="rounded-2xl border border-coffee-700 bg-coffee-800 p-5">
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-coffee-700 text-amber-accent">
                    <step.icon size={18} />
                  </span>
                  <p className="font-semibold">
                    {i + 1}. {step.title}
                  </p>
                </div>
                <p className="mt-3 text-sm text-coffee-200">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* 4. Verified suppliers */}
      {(suppliers.error || suppliers.data === null || suppliers.data.length > 0) && (
        <Section title="Verified Suppliers" subtitle="Businesses whose documents our team has reviewed and approved." link={{ to: "/suppliers", text: "All suppliers" }}>
          {suppliers.error ? (
            <ErrorNote>{suppliers.error}</ErrorNote>
          ) : suppliers.data === null ? (
            <SkeletonGrid count={4} className="h-40" />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {suppliers.data.map((s) => (
                <SupplierCard key={s.id} supplier={s} />
              ))}
            </div>
          )}
        </Section>
      )}

      {/* 5. Featured products */}
      <Section title="Featured Products" link={{ to: "/products", text: "Explore marketplace" }}>
        {products.error ? (
          <ErrorNote>{products.error}</ErrorNote>
        ) : products.data === null ? (
          <SkeletonGrid count={4} />
        ) : products.data.length === 0 ? (
          <EmptyState title="No products listed yet" hint="Listings appear here as soon as verified suppliers publish them." />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {products.data.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        )}
      </Section>

      {/* 6. Trust */}
      <section className="border-y border-coffee-100 bg-cream-100">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 py-10 sm:grid-cols-2 sm:px-6 lg:grid-cols-4">
          {trust.map((t) => (
            <div key={t.title} className="flex gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-coffee-800 text-cream-50">
                <t.icon size={18} />
              </span>
              <div>
                <h3 className="font-semibold text-coffee-900">{t.title}</h3>
                <p className="mt-1 text-sm text-coffee-600">{t.text}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* 7. Sell */}
      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 rounded-2xl border border-coffee-100 bg-cream-50 p-6 shadow-sm sm:p-8 lg:flex-row lg:items-center lg:justify-between">
          <div className="max-w-2xl">
            <h2 className="text-xl font-bold text-coffee-900 sm:text-2xl">Sell on {brand.name}</h2>
            <p className="mt-1 text-sm text-coffee-600">
              Estates, roasters, brands and equipment suppliers: register your business, get verified, then list
              products and receive bulk enquiries from buyers across India.
            </p>
          </div>
          {user?.role === "SELLER" ? (
            <Link to="/seller" className={`${primaryCta} shrink-0`}>
              Go to seller dashboard
            </Link>
          ) : (
            <Link to="/register/seller" className={`${primaryCta} shrink-0`}>
              Sell on {brand.name} <ArrowRight size={16} />
            </Link>
          )}
        </div>
      </section>
    </div>
  );
}
