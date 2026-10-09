import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { MapPin, MessageSquare, Minus, Plus, Truck } from "lucide-react";
import { api, apiErrorMessage, fileUrl, track } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useCart } from "../../context/CartContext";
import { useToast } from "../../context/ToastContext";
import { label, money, place } from "../../lib/format";
import { useSeo } from "../../lib/seo";
import type { AttributeDef, Category, Conversation, ConversationContext, Product } from "../../types";
import ReviewSection from "../../components/reviews/ReviewSection";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { Card, EmptyState, ErrorNote, Img, Modal, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import { Field, Input, Textarea } from "../../components/ui/Input";
import { productPath } from "../../components/ui/ProductCard";
import { StarRating } from "../../components/ui/StarRating";
import WishlistHeart from "../../components/ui/WishlistHeart";

/** Starts a buyer-to-supplier conversation and opens it in the buyer's inbox. Also used by the supplier storefront. */
export function ContactSellerModal({
  vendorId,
  vendorName,
  contextType,
  contextId,
  defaultSubject,
  onClose,
}: {
  vendorId: number;
  vendorName: string;
  contextType: ConversationContext;
  contextId?: number;
  defaultSubject: string;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [subject, setSubject] = useState(defaultSubject);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(e: FormEvent) {
    e.preventDefault();
    setSending(true);
    setError(null);
    try {
      const res = await api.post<Conversation>("/api/conversations", {
        vendorId,
        contextType,
        contextId,
        subject: subject.trim() || defaultSubject,
        message: message.trim(),
      });
      navigate(`/customer/messages/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err, "Could not send message"));
      setSending(false);
    }
  }

  return (
    <Modal title={`Message ${vendorName}`} onClose={onClose}>
      <form onSubmit={send} className="space-y-4">
        <Field label="Subject">
          <Input value={subject} maxLength={200} onChange={(e) => setSubject(e.target.value)} />
        </Field>
        <Field label="Message">
          <Textarea rows={4} required maxLength={4000} value={message} onChange={(e) => setMessage(e.target.value)} placeholder="What would you like to know?" />
        </Field>
        <p className="text-xs text-coffee-400">Conversations stay on the platform. Phone numbers and email addresses are hidden automatically.</p>
        <ErrorNote>{error}</ErrorNote>
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={sending || !message.trim()}>
            {sending ? "Sending…" : "Send message"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}

/** "roastLevel" -> "Roast level", for attributes the category no longer defines. */
function humanise(key: string): string {
  return label(key.replace(/([a-z0-9])([A-Z])/g, "$1_$2"));
}

function specRows(product: Product, defs: AttributeDef[]): { key: string; name: string; value: string }[] {
  const byKey = new Map(defs.map((d) => [d.key, d]));
  const known = defs.filter((d) => product.attributes[d.key]).map((d) => d.key);
  const others = Object.keys(product.attributes).filter((key) => !byKey.has(key) && product.attributes[key]);
  return [...known, ...others].map((key) => {
    const def = byKey.get(key);
    const raw = product.attributes[key];
    const value = def?.type === "BOOLEAN" ? (raw === "true" ? "Yes" : "No") : def?.unit ? `${raw} ${def.unit}` : raw;
    return { key, name: def?.label ?? humanise(key), value };
  });
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const brand = useBrand();
  const { add } = useCart();
  const { showToast } = useToast();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [defs, setDefs] = useState<AttributeDef[]>([]);
  const [activeImage, setActiveImage] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState(false);
  const [messaging, setMessaging] = useState(false);

  const load = useCallback(() => {
    return api
      .get<Product>(`/api/products/${id}`)
      .then((res) => setProduct(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Product not found")));
  }, [id]);

  useEffect(() => {
    setProduct(null);
    setError(null);
    setActiveImage(0);
    load();
  }, [load]);

  const productId = product?.id;
  const categorySlug = product?.categorySlug;
  const minQuantity = Math.max(1, product?.moq ?? 1);

  useEffect(() => {
    if (productId != null) track("product_view", productId);
  }, [productId]);

  useEffect(() => setQuantity(minQuantity), [productId, minQuantity]);

  useEffect(() => {
    setDefs([]);
    if (!categorySlug) return;
    api
      .get<Category>(`/api/categories/${categorySlug}`)
      .then((res) => setDefs(res.data.attributes))
      .catch(() => undefined); // specifications fall back to the raw attribute keys
  }, [categorySlug]);

  const images = product ? (product.imageUrls.length > 0 ? product.imageUrls : product.imageUrl ? [product.imageUrl] : []) : [];
  const live = product?.status === "APPROVED" || product?.status === "OUT_OF_STOCK";
  const purchasable = product != null && product.status === "APPROVED" && product.stock >= minQuantity;
  const sellerName = product?.vendorName ?? product?.sellerName ?? "";

  useSeo(
    {
      title: product?.name ?? "Product",
      description: product ? product.description || `${product.name} from ${sellerName} on ${brand.name}.` : undefined,
      canonicalPath: product ? productPath(product) : undefined,
      jsonLd: product
        ? {
            "@context": "https://schema.org",
            "@type": "Product",
            name: product.name,
            image: images.map((url) => fileUrl(url)),
            description: product.description,
            category: product.categoryName,
            offers: {
              "@type": "Offer",
              price: product.price,
              priceCurrency: "INR",
              availability: purchasable ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
              url: window.location.origin + productPath(product),
              seller: { "@type": "Organization", name: sellerName },
            },
            ...(product.reviewCount > 0
              ? { aggregateRating: { "@type": "AggregateRating", ratingValue: product.avgRating, reviewCount: product.reviewCount } }
              : {}),
          }
        : undefined,
    },
    brand.name,
  );

  if (error) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <EmptyState
          title={error}
          hint="This listing may have been removed or is not available yet."
          action={
            <Link to="/products" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
              Explore marketplace
            </Link>
          }
        />
      </div>
    );
  }
  if (!product) {
    return (
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-2">
        <div className="aspect-square animate-pulse rounded-2xl bg-coffee-100/70" />
        <SkeletonRows count={4} />
      </div>
    );
  }

  const isBuyer = user?.role === "CUSTOMER";
  const unit = product.priceUnit ?? "unit";
  const location = place(product.vendorCity, product.vendorState);
  const specs = specRows(product, defs);

  /** Guests are sent to log in and brought back; sellers and admins cannot buy. */
  function requireBuyer(action: string): boolean {
    if (!product) return false;
    if (!user) {
      navigate("/login", { state: { from: productPath(product) } });
      return false;
    }
    if (!isBuyer) {
      showToast(`Only buyer accounts can ${action}`, "info");
      return false;
    }
    return true;
  }

  async function addToCart(thenCheckout: boolean) {
    if (!product || !requireBuyer("purchase")) return;
    setBusy(true);
    try {
      await add(product.id, quantity);
      if (thenCheckout) navigate("/checkout");
      else showToast("Added to cart");
    } catch (err) {
      showToast(err instanceof Error ? err.message : "Could not add to cart", "error");
    } finally {
      setBusy(false);
    }
  }

  function clampQuantity(value: number) {
    setQuantity(Math.min(Math.max(minQuantity, Math.floor(value) || minQuantity), Math.max(minQuantity, product?.stock ?? minQuantity)));
  }

  const sellerLine = (
    <span className="flex flex-wrap items-center gap-2">
      {product.vendorSlug ? (
        <Link to={`/suppliers/${product.vendorSlug}`} className="font-semibold text-coffee-800 hover:underline">
          {sellerName}
        </Link>
      ) : (
        <span className="font-semibold text-coffee-800">{sellerName}</span>
      )}
      {product.vendorVerified && <VerifiedBadge />}
    </span>
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <nav className="flex flex-wrap items-center gap-1 text-xs text-coffee-500" aria-label="Breadcrumb">
        <Link to="/products" className="hover:underline">
          Marketplace
        </Link>
        {product.categorySlug && (
          <>
            <span>/</span>
            <Link to={`/category/${product.categorySlug}`} className="hover:underline">
              {product.categoryName}
            </Link>
          </>
        )}
      </nav>

      {!live && (
        <p className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-amber-100 px-3 py-2 text-sm text-amber-800">
          This listing is not public. <Badge>{product.status}</Badge>
          {product.rejectionReason && <span>{product.rejectionReason}</span>}
        </p>
      )}

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        {/* Gallery */}
        <div className="min-w-0">
          <div className="relative overflow-hidden rounded-2xl border border-coffee-100">
            <Img src={images[activeImage]} alt={product.name} className="aspect-square w-full" />
            <WishlistHeart type="product" id={product.id} className="absolute right-3 top-3" />
          </div>
          {images.length > 1 && (
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {images.map((url, i) => (
                <button
                  key={url}
                  onClick={() => setActiveImage(i)}
                  aria-label={`Show image ${i + 1}`}
                  aria-current={i === activeImage}
                  className={`h-16 w-16 shrink-0 overflow-hidden rounded-lg border-2 ${i === activeImage ? "border-coffee-800" : "border-transparent"}`}
                >
                  <Img src={url} alt="" className="h-full w-full" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Buy box */}
        <div className="min-w-0">
          {product.categoryName && <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">{product.categoryName}</p>}
          <h1 className="mt-1 break-words text-2xl font-bold text-coffee-900 sm:text-3xl">{product.name}</h1>
          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-sm">
            {sellerLine}
            <StarRating rating={product.avgRating} count={product.reviewCount} />
          </div>

          <p className="mt-5 text-3xl font-bold text-coffee-900">
            {money(product.price)} <span className="text-sm font-medium text-coffee-400">/ {unit}</span>
          </p>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <div>
              <dt className="text-xs text-coffee-500">Minimum order</dt>
              <dd className="font-semibold text-coffee-800">
                {minQuantity} {unit}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-coffee-500">Availability</dt>
              <dd className={`font-semibold ${purchasable ? "text-green-700" : "text-red-700"}`}>
                {purchasable ? `In stock (${product.stock} available)` : product.stock > 0 && product.status === "APPROVED" ? "Not enough stock for the minimum order" : "Out of stock"}
              </dd>
            </div>
          </dl>

          {purchasable && (
            <div className="mt-5">
              <span className="mb-1 block text-xs font-semibold text-coffee-600">Quantity</span>
              <div className="inline-flex items-center rounded-full border border-coffee-200">
                <button onClick={() => clampQuantity(quantity - 1)} disabled={quantity <= minQuantity} aria-label="Decrease quantity" className="flex h-10 w-10 items-center justify-center text-coffee-700 disabled:opacity-40">
                  <Minus size={16} />
                </button>
                <input
                  type="number"
                  value={quantity}
                  min={minQuantity}
                  max={product.stock}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                  onBlur={() => clampQuantity(quantity)}
                  aria-label="Quantity"
                  className="w-16 bg-transparent text-center text-sm font-semibold text-coffee-900 outline-none"
                />
                <button onClick={() => clampQuantity(quantity + 1)} disabled={quantity >= product.stock} aria-label="Increase quantity" className="flex h-10 w-10 items-center justify-center text-coffee-700 disabled:opacity-40">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}

          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            <Button disabled={!purchasable || busy} onClick={() => addToCart(false)}>
              {busy ? "Adding…" : "Add to Cart"}
            </Button>
            <Button variant="secondary" disabled={!purchasable || busy} onClick={() => addToCart(true)}>
              Buy now
            </Button>
            <Link
              to={`/post-requirement?productId=${product.id}`}
              className="inline-flex items-center justify-center rounded-full border border-coffee-300 px-4 py-2 text-sm font-semibold text-coffee-800 hover:bg-coffee-100"
            >
              Request Quote
            </Link>
            {(isBuyer || !user) && product.vendorId != null && (
              <Button variant="ghost" className="border border-coffee-200" onClick={() => requireBuyer("message sellers") && setMessaging(true)}>
                <MessageSquare size={16} /> Message seller
              </Button>
            )}
          </div>
          <p className="mt-2 text-xs text-coffee-400">Need a bulk or custom order? Request a quote and compare offers from verified suppliers.</p>

          <div className="mt-5 rounded-2xl border border-coffee-100 bg-cream-100 p-4 text-sm text-coffee-700">
            <p className="flex items-center gap-2 font-semibold text-coffee-900">
              <Truck size={16} /> Sold and shipped by {sellerName}
            </p>
            <ul className="mt-2 space-y-1">
              {product.attributes.origin && <li>Origin: {product.attributes.origin}</li>}
              {product.shipsFrom && <li>Ships from: {product.shipsFrom}</li>}
              {product.dispatchDays != null && (
                <li>
                  Dispatched within {product.dispatchDays} {product.dispatchDays === 1 ? "day" : "days"}
                </li>
              )}
              <li>
                Shipping:{" "}
                {product.shippingCharge == null ? "calculated at checkout" : product.shippingCharge > 0 ? money(product.shippingCharge) : "Free"}
              </li>
            </ul>
            <p className="mt-2 text-xs text-coffee-500">
              {brand.name} is a marketplace: this item is fulfilled by the seller, not by {brand.name}.
            </p>
          </div>
        </div>
      </div>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1fr_20rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <h2 className="text-lg font-semibold text-coffee-900">Product details</h2>
            {product.description ? (
              <p className="mt-2 whitespace-pre-wrap break-words text-sm text-coffee-700">{product.description}</p>
            ) : (
              <p className="mt-2 text-sm text-coffee-400">The seller has not added a description.</p>
            )}
          </Card>

          {specs.length > 0 && (
            <Card>
              <h2 className="text-lg font-semibold text-coffee-900">Specifications</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-sm">
                  <tbody>
                    {specs.map((row) => (
                      <tr key={row.key} className="border-b border-coffee-100 last:border-0">
                        <th scope="row" className="w-2/5 py-2 pr-4 text-left align-top font-medium text-coffee-500">
                          {row.name}
                        </th>
                        <td className="break-words py-2 text-coffee-800">{row.value}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          )}

          <Card>
            <ReviewSection targetType="product" targetId={product.id} avgRating={product.avgRating} reviewCount={product.reviewCount} onReviewAdded={load} />
          </Card>
        </div>

        <aside>
          <Card>
            <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Seller</p>
            <div className="mt-2 text-sm">{sellerLine}</div>
            {location && (
              <p className="mt-2 flex items-center gap-1 text-sm text-coffee-500">
                <MapPin size={14} /> {location}
              </p>
            )}
            {product.vendorSlug && (
              <Link
                to={`/suppliers/${product.vendorSlug}`}
                className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-coffee-100 px-4 py-2 text-sm font-semibold text-coffee-800 hover:bg-coffee-200"
              >
                View storefront
              </Link>
            )}
          </Card>
        </aside>
      </div>

      {messaging && product.vendorId != null && (
        <ContactSellerModal
          vendorId={product.vendorId}
          vendorName={sellerName}
          contextType="PRODUCT"
          contextId={product.id}
          defaultSubject={`Enquiry: ${product.name}`.slice(0, 200)}
          onClose={() => setMessaging(false)}
        />
      )}
    </div>
  );
}
