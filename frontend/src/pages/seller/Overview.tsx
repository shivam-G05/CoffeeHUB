import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../../api/client";
import { formatDate, money } from "../../lib/format";
import type { OrderStatus, Page, Product, Rfq, VendorOrder, VendorPayments, VendorProfile } from "../../types";
import Badge from "../../components/ui/Badge";
import StatCard from "../../components/ui/StatCard";
import { Card, EmptyState, ErrorNote, PageHeader, SkeletonGrid, SkeletonRows, VerifiedBadge } from "../../components/ui/Common";

const NEEDS_ACTION: OrderStatus[] = ["PLACED", "PAYMENT_CONFIRMED", "ACCEPTED", "PROCESSING", "READY_TO_SHIP"];

interface Data {
  vendor: VendorProfile;
  products: Product[];
  payments: VendorPayments;
  recent: VendorOrder[];
  needingAction: number;
  openInvitations: number;
}

export default function SellerOverview() {
  const [data, setData] = useState<Data | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<VendorProfile>("/api/vendor/me"),
      api.get<Product[]>("/api/products/mine"),
      api.get<VendorPayments>("/api/vendor/payments"),
      api.get<Page<VendorOrder>>("/api/vendor/orders", { params: { size: 5 } }),
      api.get<Page<Rfq>>("/api/vendor/rfqs", { params: { size: 50 } }),
      // One tiny request per status: the list endpoint filters by a single status.
      Promise.all(NEEDS_ACTION.map((status) => api.get<Page<VendorOrder>>("/api/vendor/orders", { params: { status, size: 1 } }))),
    ])
      .then(([vendor, products, payments, recent, rfqs, counts]) =>
        setData({
          vendor: vendor.data,
          products: products.data,
          payments: payments.data,
          recent: recent.data.content,
          needingAction: counts.reduce((sum, res) => sum + res.data.totalElements, 0),
          openInvitations: rfqs.data.content.filter((r) => r.status === "OPEN" && r.invitationStatus === "INVITED").length,
        })
      )
      .catch((err) => setError(apiErrorMessage(err, "Could not load your dashboard")));
  }, []);

  if (error) {
    return (
      <div>
        <PageHeader title="Seller dashboard" />
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div>
        <PageHeader title="Seller dashboard" />
        <div className="mt-6 space-y-6">
          <SkeletonRows count={1} />
          <SkeletonGrid count={6} className="h-28" />
        </div>
      </div>
    );
  }

  const { vendor, products, payments, recent } = data;

  return (
    <div>
      <PageHeader title="Seller dashboard" subtitle={vendor.businessName} />

      <div className="mt-6">
        <StatusBanner vendor={vendor} />
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Live products" value={products.filter((p) => p.status === "APPROVED").length} />
        <StatCard label="Products pending review" value={products.filter((p) => p.status === "PENDING").length} />
        <StatCard label="Orders needing action" value={data.needingAction} />
        <StatCard label="Open RFQ invitations" value={data.openInvitations} />
        <StatCard
          label="Eligible for payout"
          value={money(payments.eligible)}
          hint={payments.payoutOnHold ? "Payouts are on hold until your bank details are verified" : undefined}
        />
        <StatCard label="Pending payout" value={money(payments.pending)} hint="Becomes eligible once the order is delivered and paid" />
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-coffee-900">Recent orders</h2>
        <Link to="/seller/orders" className="text-sm font-semibold text-coffee-700 hover:underline">
          View all
        </Link>
      </div>

      <div className="mt-3">
        {recent.length === 0 ? (
          <EmptyState title="No orders yet" hint="Orders for your products will appear here." />
        ) : (
          <ul className="divide-y divide-coffee-100 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
            {recent.map((o) => (
              <li key={o.id}>
                <Link to={`/seller/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-coffee-100/50">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-coffee-900">{o.subOrderNumber}</p>
                    <p className="truncate text-xs text-coffee-500">
                      {formatDate(o.createdAt)} · {o.buyerName ?? "Buyer"}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-semibold text-coffee-800">{money(o.totalAmount)}</span>
                    <Badge>{o.status}</Badge>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function StatusBanner({ vendor }: { vendor: VendorProfile }) {
  const verificationLink = (
    <Link to="/seller/verification" className="mt-3 inline-block rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
      Go to verification
    </Link>
  );

  switch (vendor.status) {
    case "APPROVED":
      return (
        <Card className="border-green-200 bg-green-50">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold text-green-900">Your business is verified</p>
            <VerifiedBadge />
          </div>
          <p className="mt-1 text-sm text-green-800">You can submit products for review, receive orders and quote on RFQs.</p>
          <Link to={`/suppliers/${vendor.slug}`} className="mt-2 inline-block text-sm font-semibold text-green-900 underline">
            View your public storefront
          </Link>
        </Card>
      );
    case "PENDING_VERIFICATION":
    case "UNDER_REVIEW":
      return (
        <Card className="border-blue-200 bg-blue-50">
          <p className="font-semibold text-blue-900">Your verification is under review</p>
          <p className="mt-1 text-sm text-blue-800">
            Submitted {formatDate(vendor.submittedAt)}. We will notify you once an admin has reviewed your documents. You can draft products in the meantime.
          </p>
        </Card>
      );
    case "REJECTED":
    case "SUSPENDED":
      return (
        <Card className="border-red-200 bg-red-50">
          <p className="font-semibold text-red-900">
            {vendor.status === "REJECTED" ? "Your verification was not approved" : "Your seller account is suspended"}
          </p>
          {vendor.statusReason && <p className="mt-1 whitespace-pre-wrap text-sm text-red-800">{vendor.statusReason}</p>}
          {vendor.status === "REJECTED" && verificationLink}
        </Card>
      );
    default:
      return (
        <Card className="border-amber-200 bg-amber-50">
          <p className="font-semibold text-amber-900">Complete verification to start selling</p>
          {vendor.missingRequirements.length > 0 ? (
            <>
              <p className="mt-1 text-sm text-amber-800">Still needed:</p>
              <ul className="mt-1 list-disc pl-5 text-sm text-amber-800">
                {vendor.missingRequirements.map((m) => (
                  <li key={m}>{m.charAt(0).toUpperCase() + m.slice(1)}</li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-1 text-sm text-amber-800">Everything is in place. Submit your details for verification.</p>
          )}
          {verificationLink}
        </Card>
      );
  }
}
