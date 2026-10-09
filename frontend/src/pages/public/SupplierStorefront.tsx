import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Award, Bookmark, CalendarDays, Clock, Globe, MapPin, MessageSquare } from "lucide-react";
import { api, apiErrorMessage, track } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useToast } from "../../context/ToastContext";
import { VENDOR_TYPES } from "../../lib/constants";
import { formatDate, place } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { Page, Product, Review, Storefront, VendorSummary } from "../../types";
import { ReviewList } from "../../components/reviews/ReviewSection";
import Button from "../../components/ui/Button";
import { Card, EmptyState, ErrorNote, Img, Pagination, SkeletonGrid, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import ProductCard from "../../components/ui/ProductCard";
import { StarRating } from "../../components/ui/StarRating";
import { ContactSellerModal } from "./ProductDetail";

function responseTime(hours?: number): string | null {
  if (hours == null) return null;
  if (hours <= 1) return "Typically replies within an hour";
  if (hours < 48) return `Typically replies within ${Math.round(hours)} hours`;
  return `Typically replies within ${Math.round(hours / 24)} days`;
}

/** Only http(s) links are rendered: the website is supplier-entered text. */
function websiteHref(website?: string): string | null {
  if (!website) return null;
  const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
  try {
    return ["http:", "https:"].includes(new URL(url).protocol) ? url : null;
  } catch {
    return null;
  }
}

export default function SupplierStorefront() {
  const { slug } = useParams();
  const brand = useBrand();
  const { user } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const pageIndex = Math.max(0, Number(params.get("page")) || 0);

  const [store, setStore] = useState<Storefront | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [productsError, setProductsError] = useState<string | null>(null);
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [reviewsError, setReviewsError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const isBuyer = user?.role === "CUSTOMER";
  const vendor = store?.summary;
  const vendorId = vendor?.id;

  useEffect(() => {
    setStore(null);
    setError(null);
    api
      .get<Storefront>(`/api/suppliers/${slug}`)
      .then((res) => setStore(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Supplier not found")));
    if (slug) track("supplier_view", slug);
  }, [slug]);

  useEffect(() => {
    let stale = false;
    setProducts(null);
    setProductsError(null);
    api
      .get<Page<Product>>("/api/products", { params: { seller: slug, page: pageIndex, size: 12 } })
      .then((res) => !stale && setProducts(res.data))
      .catch((err) => !stale && setProductsError(apiErrorMessage(err, "Could not load products")));
    return () => {
      stale = true;
    };
  }, [slug, pageIndex]);

  useEffect(() => {
    if (vendorId == null) return;
    setReviews(null);
    setReviewsError(null);
    api
      .get<Review[]>("/api/reviews", { params: { vendorId } })
      .then((res) => setReviews(res.data))
      .catch((err) => setReviewsError(apiErrorMessage(err, "Could not load reviews")));
  }, [vendorId]);

  useEffect(() => {
    if (vendorId == null || !isBuyer) return;
    api
      .get<VendorSummary[]>("/api/saved-suppliers")
      .then((res) => setSaved(res.data.some((v) => v.id === vendorId)))
      .catch(() => undefined); // the toggle still works; it just starts as "not saved"
  }, [vendorId, isBuyer]);

  useSeo(
    {
      title: vendor?.businessName ?? "Supplier",
      description: vendor ? store?.about || `${vendor.businessName}: verified supplier on ${brand.name}.` : undefined,
      canonicalPath: slug ? `/suppliers/${slug}` : undefined,
    },
    brand.name,
  );

  async function toggleSaved() {
    if (vendorId == null) return;
    setSaving(true);
    try {
      const res = await api.post<{ saved: boolean }>(`/api/saved-suppliers/${vendorId}/toggle`);
      setSaved(res.data.saved);
      showToast(res.data.saved ? "Supplier saved" : "Supplier removed from saved", "info");
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not update saved suppliers"), "error");
    } finally {
      setSaving(false);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          title={error}
          hint="This supplier may not be verified yet, or the link is wrong."
          action={
            <Link to="/suppliers" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
              Browse suppliers
            </Link>
          }
        />
      </div>
    );
  }
  if (!store || !vendor) {
    return (
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <SkeletonRows count={3} />
      </div>
    );
  }

  const location = place(vendor.city, vendor.state);
  const typeLabel = vendor.vendorTypeLabel ?? VENDOR_TYPES.find((t) => t.value === vendor.vendorType)?.label;
  const replies = responseTime(store.avgResponseHours);
  const website = websiteHref(store.website);

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <Card>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          <Img src={vendor.logoUrl} alt={`${vendor.businessName} logo`} className="h-20 w-20 shrink-0 rounded-2xl" />
          <div className="min-w-0 flex-1">
            <h1 className="break-words text-2xl font-bold text-coffee-900">{vendor.businessName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              {vendor.verified ? (
                <VerifiedBadge />
              ) : (
                <span className="rounded-full bg-coffee-100 px-2 py-0.5 text-[11px] font-semibold text-coffee-600">Not verified</span>
              )}
              {typeLabel && <span className="text-sm text-coffee-600">{typeLabel}</span>}
              <StarRating rating={vendor.avgRating} count={vendor.reviewCount} />
            </div>
            <ul className="mt-3 flex flex-col gap-x-5 gap-y-1 text-sm text-coffee-500 sm:flex-row sm:flex-wrap">
              {location && (
                <li className="flex items-center gap-1">
                  <MapPin size={14} /> {location}
                </li>
              )}
              <li className="flex items-center gap-1">
                <CalendarDays size={14} /> Member since {formatDate(vendor.memberSince)}
              </li>
              {replies && (
                <li className="flex items-center gap-1">
                  <Clock size={14} /> {replies}
                </li>
              )}
              {website && (
                <li className="flex min-w-0 items-center gap-1">
                  <Globe size={14} className="shrink-0" />
                  <a href={website} target="_blank" rel="noopener noreferrer nofollow" className="truncate underline hover:text-coffee-800">
                    {store.website}
                  </a>
                </li>
              )}
            </ul>
          </div>
          {(isBuyer || !user) && (
            <div className="flex shrink-0 flex-wrap gap-2 sm:flex-col">
              <Button onClick={() => (user ? setMessaging(true) : navigate("/login", { state: { from: `/suppliers/${slug}` } }))}>
                <MessageSquare size={16} /> Message supplier
              </Button>
              {isBuyer && (
                <Button variant="secondary" onClick={toggleSaved} disabled={saving} aria-pressed={saved}>
                  <Bookmark size={16} className={saved ? "fill-coffee-800" : ""} /> {saved ? "Saved" : "Save supplier"}
                </Button>
              )}
            </div>
          )}
        </div>

        {store.about && (
          <div className="mt-5 border-t border-coffee-100 pt-4">
            <h2 className="text-sm font-semibold text-coffee-900">About</h2>
            <p className="mt-1 whitespace-pre-wrap break-words text-sm text-coffee-700">{store.about}</p>
          </div>
        )}
        {store.certifications.length > 0 && (
          <div className="mt-4 border-t border-coffee-100 pt-4">
            <h2 className="text-sm font-semibold text-coffee-900">Verified certifications</h2>
            <ul className="mt-2 flex flex-wrap gap-2">
              {store.certifications.map((c) => (
                <li key={c} className="inline-flex items-center gap-1 rounded-full bg-coffee-100 px-3 py-1 text-xs font-medium text-coffee-800">
                  <Award size={12} /> {c}
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      <section className="mt-8">
        <h2 className="text-xl font-bold text-coffee-900">Products{products ? ` (${products.totalElements})` : ""}</h2>
        <div className="mt-4">
          {productsError ? (
            <ErrorNote>{productsError}</ErrorNote>
          ) : products === null ? (
            <SkeletonGrid count={4} />
          ) : products.content.length === 0 ? (
            <EmptyState title="No products listed yet" hint="You can still message this supplier or post a requirement." />
          ) : (
            <>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {products.content.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
              <Pagination page={products} onChange={(p) => setParams(p > 0 ? { page: String(p) } : {})} />
            </>
          )}
        </div>
      </section>

      <section className="mt-10">
        <Card>
          <div className="mb-4 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold text-coffee-900">Buyer reviews</h2>
            <StarRating rating={vendor.avgRating} count={vendor.reviewCount} size={16} />
          </div>
          {reviewsError ? <ErrorNote>{reviewsError}</ErrorNote> : reviews === null ? <SkeletonRows count={2} /> : <ReviewList reviews={reviews} showProduct />}
        </Card>
      </section>

      {messaging && (
        <ContactSellerModal
          vendorId={vendor.id}
          vendorName={vendor.businessName}
          contextType="GENERAL"
          defaultSubject={`Enquiry for ${vendor.businessName}`.slice(0, 200)}
          onClose={() => setMessaging(false)}
        />
      )}
    </div>
  );
}
