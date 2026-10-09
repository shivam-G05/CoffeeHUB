import { useCallback, useEffect, useState, type FormEvent } from "react";
import { Star } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { formatDate, label, money } from "../../lib/format";
import type { Page, Product, ProductStatus } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import { EmptyState, ErrorNote, Img, Modal, PageHeader, Pagination, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";
import { Field, Input, Select, Textarea } from "../../components/ui/Input";

type Action = "APPROVE" | "REJECT" | "SUSPEND";

const STATUSES: ProductStatus[] = ["PENDING", "APPROVED", "OUT_OF_STOCK", "REJECTED", "SUSPENDED", "DRAFT"];

function actionsFor(status: ProductStatus): Action[] {
  switch (status) {
    case "PENDING":
      return ["APPROVE", "REJECT"];
    case "APPROVED":
    case "OUT_OF_STOCK":
      return ["SUSPEND"];
    case "REJECTED":
    case "SUSPENDED":
      return ["APPROVE"];
    default:
      return []; // a draft has not been submitted for review
  }
}

export default function AdminProducts() {
  const { showToast } = useToast();
  const [status, setStatus] = useState<ProductStatus | "">("PENDING");
  const [search, setSearch] = useState("");
  const [q, setQ] = useState("");
  const [pageNo, setPageNo] = useState(0);
  const [products, setProducts] = useState<Page<Product> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [detail, setDetail] = useState<Product | null>(null);
  const [decision, setDecision] = useState<{ product: Product; action: "REJECT" | "SUSPEND" } | null>(null);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const load = useCallback(() => {
    setError(null);
    api
      .get<Page<Product>>("/api/admin/products", { params: { status: status || undefined, q: q || undefined, page: pageNo } })
      .then((res) => setProducts(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load products")));
  }, [status, q, pageNo]);

  useEffect(load, [load]);

  function submitSearch(e: FormEvent) {
    e.preventDefault();
    setQ(search.trim());
    setPageNo(0);
  }

  async function moderate(product: Product, action: Action, why?: string) {
    setBusy(true);
    setActionError(null);
    try {
      await api.put(`/api/admin/products/${product.id}/moderate`, { action, reason: why });
      showToast(`Product ${action === "APPROVE" ? "approved" : action === "REJECT" ? "rejected" : "suspended"}`, "success");
      setDetail(null);
      setDecision(null);
      load();
    } catch (err) {
      setActionError(apiErrorMessage(err, "Could not update the product"));
    } finally {
      setBusy(false);
    }
  }

  function start(product: Product, action: Action) {
    setActionError(null);
    if (action === "APPROVE") {
      moderate(product, action);
    } else {
      setDetail(null);
      setReason("");
      setDecision({ product, action });
    }
  }

  async function toggleFeatured(product: Product) {
    setBusy(true);
    try {
      const res = await api.put<Product>(`/api/admin/products/${product.id}/featured`, null, { params: { featured: !product.featured } });
      showToast(res.data.featured ? "Marked as featured" : "Removed from featured", "success");
      setDetail((d) => (d && d.id === product.id ? res.data : d));
      load();
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not update featured"), "error");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <PageHeader title="Product Moderation" subtitle="Review listings before they go live. Rejecting or suspending needs a reason, which the seller sees." />

      <form onSubmit={submitSearch} className="mt-6 flex flex-wrap gap-2">
        <Select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as ProductStatus | "");
            setPageNo(0);
          }}
          className="w-auto"
          aria-label="Filter by status"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {label(s)}
            </option>
          ))}
          <option value="">All statuses</option>
        </Select>
        <div className="min-w-0 flex-1 basis-48">
          <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search products…" aria-label="Search products" />
        </div>
        <Button type="submit" variant="secondary">
          Search
        </Button>
      </form>

      <div className="mt-4">
        {error ? (
          <ErrorNote>{error}</ErrorNote>
        ) : !products ? (
          <SkeletonRows />
        ) : products.content.length === 0 ? (
          <EmptyState title="No products here" hint={status === "PENDING" ? "The moderation queue is clear." : "Try a different status or search."} />
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-coffee-100 bg-cream-50">
            <table className="w-full text-left text-sm">
              <thead className="bg-coffee-100 text-coffee-600">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Vendor</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-coffee-100">
                {products.content.map((p) => (
                  <tr key={p.id}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <Img src={p.imageUrl} alt={p.name} className="h-11 w-11 shrink-0 rounded-lg" />
                        <div className="min-w-0">
                          <p className="font-medium text-coffee-900">{p.name}</p>
                          {p.featured && (
                            <p className="flex items-center gap-1 text-xs text-amber-700">
                              <Star size={11} className="fill-current" /> Featured
                            </p>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-coffee-600">
                      <p>{p.vendorName ?? p.sellerName}</p>
                      {p.vendorVerified ? <VerifiedBadge compact /> : <span className="text-xs text-red-700">Vendor not verified</span>}
                    </td>
                    <td className="px-4 py-3 text-coffee-500">{p.categoryName ?? "—"}</td>
                    <td className="whitespace-nowrap px-4 py-3 text-coffee-600">
                      {money(p.price)}
                      {p.priceUnit ? ` / ${p.priceUnit}` : ""}
                    </td>
                    <td className="px-4 py-3">
                      <Badge>{p.status}</Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        variant="secondary"
                        onClick={() => {
                          setActionError(null);
                          setDetail(p);
                        }}
                      >
                        Review
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Pagination page={products} onChange={setPageNo} />
      </div>

      {detail && (
        <Modal title={detail.name} onClose={() => setDetail(null)}>
          <div className="space-y-4 text-sm">
            <Img src={detail.imageUrl} alt={detail.name} className="h-48 w-full rounded-xl" />
            {detail.imageUrls.length > 1 && (
              <div className="flex flex-wrap gap-2">
                {detail.imageUrls.slice(1).map((url) => (
                  <Img key={url} src={url} alt={detail.name} className="h-14 w-14 rounded-lg" />
                ))}
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              <Badge>{detail.status}</Badge>
              {detail.featured && <Badge tone="pending">Featured</Badge>}
              <span className="text-xs text-coffee-400">Listed {formatDate(detail.createdAt)}</span>
            </div>
            {detail.rejectionReason && <p className="rounded-lg bg-red-50 px-3 py-2 text-red-700">Reason on record: {detail.rejectionReason}</p>}

            <div className="rounded-xl bg-coffee-100/50 p-3">
              <p className="font-semibold text-coffee-900">{detail.vendorName ?? detail.sellerName}</p>
              <div className="mt-1">
                {detail.vendorVerified ? (
                  <VerifiedBadge />
                ) : (
                  <span className="text-xs font-semibold text-red-700">Vendor is not verified: this product cannot be approved until the vendor is.</span>
                )}
              </div>
            </div>

            <dl className="grid grid-cols-2 gap-x-4 gap-y-3">
              <Fact term="Price" value={`${money(detail.price)}${detail.priceUnit ? ` / ${detail.priceUnit}` : ""}`} />
              <Fact term="Minimum order" value={detail.moq != null ? String(detail.moq) : "—"} />
              <Fact term="Stock" value={String(detail.stock)} />
              <Fact term="Category" value={detail.categoryName ?? "—"} />
              <Fact term="Shipping charge" value={detail.shippingCharge != null ? money(detail.shippingCharge) : "—"} />
              <Fact term="Dispatch time" value={detail.dispatchDays != null ? `${detail.dispatchDays} day(s)` : "—"} />
              <Fact term="Ships from" value={detail.shipsFrom || "—"} />
            </dl>

            {Object.keys(detail.attributes).length > 0 && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Attributes</p>
                <dl className="mt-2 grid grid-cols-2 gap-x-4 gap-y-3">
                  {Object.entries(detail.attributes).map(([key, value]) => (
                    <Fact key={key} term={label(key.replace(/([a-z])([A-Z])/g, "$1_$2"))} value={value} />
                  ))}
                </dl>
              </div>
            )}

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-coffee-400">Description</p>
              <p className="mt-1 whitespace-pre-wrap break-words text-coffee-700">{detail.description || "No description provided."}</p>
            </div>

            <ErrorNote>{actionError}</ErrorNote>
            <div className="flex flex-wrap justify-end gap-2 border-t border-coffee-100 pt-4">
              <Button variant="ghost" disabled={busy} onClick={() => toggleFeatured(detail)}>
                {detail.featured ? "Remove from featured" : "Mark as featured"}
              </Button>
              {actionsFor(detail.status).map((action) => (
                <Button key={action} variant={action === "APPROVE" ? "primary" : "danger"} disabled={busy} onClick={() => start(detail, action)}>
                  {label(action)}
                </Button>
              ))}
            </div>
          </div>
        </Modal>
      )}

      {decision && (
        <Modal title={`${label(decision.action)} "${decision.product.name}"`} onClose={() => setDecision(null)}>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              moderate(decision.product, decision.action, reason.trim());
            }}
            className="space-y-4"
          >
            <p className="text-sm text-coffee-600">
              {decision.action === "REJECT"
                ? "The seller is told why and can edit and resubmit the listing."
                : "The listing is taken off the marketplace immediately and the seller is told why."}
            </p>
            <Field label="Reason (shown to the seller)">
              <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} maxLength={1000} required />
            </Field>
            <ErrorNote>{actionError}</ErrorNote>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setDecision(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="danger" disabled={busy || !reason.trim()}>
                {busy ? "Saving…" : label(decision.action)}
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  );
}

function Fact({ term, value }: { term: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-xs text-coffee-400">{term}</dt>
      <dd className="break-words font-medium text-coffee-900">{value}</dd>
    </div>
  );
}
