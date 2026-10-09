import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, apiErrorMessage } from "../../api/client";
import { money } from "../../lib/format";
import type { AdminReport } from "../../types";
import StatCard from "../../components/ui/StatCard";
import { Card, ErrorNote, PageHeader, SkeletonGrid } from "../../components/ui/Common";

export default function AdminOverview() {
  const [report, setReport] = useState<AdminReport | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<AdminReport>("/api/admin/reports/summary", { params: { days: 30 } })
      .then((res) => setReport(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load the dashboard")));
  }, []);

  if (!report) {
    return (
      <div>
        <PageHeader title="Dashboard" subtitle="Marketplace health at a glance." />
        <div className="mt-6">{error ? <ErrorNote>{error}</ErrorNote> : <SkeletonGrid count={8} className="h-28" />}</div>
      </div>
    );
  }

  const s = report.stats;
  const attention = [
    { label: "Vendors awaiting verification", count: s.pendingVendors, to: "/admin/vendors" },
    { label: "Products awaiting moderation", count: s.pendingProducts, to: "/admin/products" },
    { label: "Open disputes", count: s.openDisputes, to: "/admin/disputes" },
  ].filter((a) => a.count > 0);
  const chart = report.salesByDay.map((d) => ({ ...d, day: d.date.slice(5) }));

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Marketplace health at a glance." />

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="GMV" value={money(s.gmv)} hint="Excludes cancelled and refunded orders" />
        <StatCard label="Platform revenue" value={money(s.platformRevenue)} hint="Commission earned" />
        <StatCard label="Orders" value={s.totalOrders} />
        <StatCard label="Average order value" value={money(s.averageOrderValue)} />
        <StatCard label="Active vendors" value={s.activeVendors} />
        <StatCard label="Pending vendors" value={s.pendingVendors} />
        <StatCard label="Products" value={s.totalProducts} />
        <StatCard label="Pending products" value={s.pendingProducts} />
        <StatCard label="RFQs" value={s.totalRfqs} />
        <StatCard label="Quotes" value={s.totalQuotes} />
        <StatCard label="Quote acceptance rate" value={`${s.quoteAcceptanceRate}%`} />
        <StatCard label="Open disputes" value={s.openDisputes} />
        <StatCard label="Refunds" value={money(s.refundTotal)} />
      </div>

      <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_20rem]">
        <Card>
          <h2 className="text-lg font-semibold text-coffee-900">Sales, last 30 days</h2>
          <div className="mt-4 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chart}>
                <CartesianGrid strokeDasharray="3 3" stroke="#efe1d3" />
                <XAxis dataKey="day" stroke="#8c5e37" fontSize={11} minTickGap={16} />
                <YAxis stroke="#8c5e37" fontSize={11} width={48} />
                <Tooltip formatter={(value) => [money(Number(value)), "Sales"]} />
                <Bar dataKey="sales" fill="#8c5e37" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <h2 className="text-lg font-semibold text-coffee-900">Needs attention</h2>
          {attention.length === 0 ? (
            <p className="mt-3 text-sm text-coffee-500">Nothing is waiting on you right now.</p>
          ) : (
            <ul className="mt-3 divide-y divide-coffee-100">
              {attention.map((a) => (
                <li key={a.to}>
                  <Link to={a.to} className="flex items-center justify-between gap-3 py-3 text-sm text-coffee-800 hover:text-coffee-900">
                    <span>{a.label}</span>
                    <span className="flex items-center gap-1">
                      <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">{a.count}</span>
                      <ChevronRight size={16} className="text-coffee-400" />
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}
