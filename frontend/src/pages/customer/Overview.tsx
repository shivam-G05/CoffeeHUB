import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MailWarning, Sparkles } from "lucide-react";
import { api, apiErrorMessage } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useToast } from "../../context/ToastContext";
import { formatDate, money } from "../../lib/format";
import type { Order, Page, Rfq } from "../../types";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import { ErrorNote, SkeletonRows } from "../../components/ui/Common";

export default function CustomerOverview() {
  const { user } = useAuth();
  const brand = useBrand();
  const { showToast } = useToast();
  const [orders, setOrders] = useState<Page<Order> | null>(null);
  const [rfqs, setRfqs] = useState<Page<Rfq> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    api
      .get<Page<Order>>("/api/orders/mine", { params: { size: 3 } })
      .then((res) => setOrders(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your orders")));
    // A larger page than the three shown, so the RFQ and quote counters cover recent activity.
    api
      .get<Page<Rfq>>("/api/rfqs/mine", { params: { size: 50 } })
      .then((res) => setRfqs(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load your requirements")));
  }, []);

  async function resendVerification() {
    setResending(true);
    try {
      await api.post("/api/auth/resend-verification");
      showToast("Verification email sent. Check your inbox.", "success");
    } catch (err) {
      showToast(apiErrorMessage(err, "Could not send the verification email"), "error");
    } finally {
      setResending(false);
    }
  }

  const openRfqs = rfqs?.content.filter((r) => r.status === "SUBMITTED" || r.status === "OPEN").length;
  const quotesReceived = rfqs?.content.reduce((sum, r) => sum + r.quoteCount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Welcome back, {user?.name?.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-coffee-500">Here&rsquo;s a snapshot of your {brand.name} activity.</p>

      {user && !user.emailVerified && (
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="flex items-start gap-2 text-sm text-amber-900">
            <MailWarning size={18} className="mt-0.5 shrink-0" />
            <span>
              Your email address <span className="break-all font-semibold">{user.email}</span> is not verified yet.
            </span>
          </p>
          <Button variant="secondary" onClick={resendVerification} disabled={resending}>
            {resending ? "Sending…" : "Resend verification email"}
          </Button>
        </div>
      )}

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Orders" value={orders?.totalElements ?? "—"} />
        <StatCard label="Open RFQs" value={openRfqs ?? "—"} />
        <StatCard label="Quotes received" value={quotesReceived ?? "—"} />
        <StatCard label="Loyalty points" value={user?.loyaltyPoints ?? 0} hint="1 pt per ₹100 spent" />
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <Link to="/products" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700">
          Explore Marketplace
        </Link>
        <Link to="/post-requirement" className="rounded-full bg-coffee-100 px-4 py-2 text-sm font-semibold text-coffee-800 hover:bg-coffee-200">
          Post Requirement
        </Link>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-x-1 gap-y-1 rounded-xl bg-amber-accent/10 px-4 py-3 text-sm text-coffee-700">
        <Sparkles size={16} className="mr-1 shrink-0 text-amber-accent" />
        Refer friends with your code{" "}
        <code className="rounded bg-cream-50 px-1.5 py-0.5 font-semibold text-coffee-900">{user?.referralCode}</code>: you
        both earn 50 bonus points when they sign up.
      </div>

      <div className="mt-6">
        <ErrorNote>{error}</ErrorNote>
      </div>

      <div className="mt-4 grid gap-8 lg:grid-cols-2">
        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-coffee-900">Recent orders</h2>
            <Link to="/customer/orders" className="text-sm font-medium text-coffee-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3">
            {!orders ? (
              !error && <SkeletonRows count={3} />
            ) : orders.content.length === 0 ? (
              <p className="text-sm text-coffee-400">No orders yet.</p>
            ) : (
              <ul className="divide-y divide-coffee-100 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
                {orders.content.map((o) => (
                  <li key={o.id}>
                    <Link to={`/customer/orders/${o.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-coffee-100/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-coffee-900">{o.orderNumber}</p>
                        <p className="text-xs text-coffee-400">
                          {formatDate(o.createdAt)} · {money(o.totalAmount)}
                        </p>
                      </div>
                      <Badge>{o.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>

        <section>
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-coffee-900">Recent requirements</h2>
            <Link to="/customer/rfqs" className="text-sm font-medium text-coffee-600 hover:underline">
              View all
            </Link>
          </div>
          <div className="mt-3">
            {!rfqs ? (
              !error && <SkeletonRows count={3} />
            ) : rfqs.content.length === 0 ? (
              <p className="text-sm text-coffee-400">No requirements posted yet.</p>
            ) : (
              <ul className="divide-y divide-coffee-100 overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
                {rfqs.content.slice(0, 3).map((r) => (
                  <li key={r.id}>
                    <Link to={`/customer/rfqs/${r.id}`} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 hover:bg-coffee-100/50">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-coffee-900">{r.title}</p>
                        <p className="text-xs text-coffee-400">
                          {r.quantity} {r.unit} · {r.quoteCount} {r.quoteCount === 1 ? "quote" : "quotes"}
                        </p>
                      </div>
                      <Badge>{r.status}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
