import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Download } from "lucide-react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api, apiErrorMessage, openProtected } from "../../api/client";
import { useToast } from "../../context/ToastContext";
import { label, money } from "../../lib/format";
import type { AdminReport } from "../../types";
import Button from "../../components/ui/Button";
import StatCard from "../../components/ui/StatCard";
import { Card, ErrorNote, PageHeader, SkeletonGrid } from "../../components/ui/Common";

const WINDOWS = [7, 30, 90];

export default function AdminReports() {
  const { showToast } = useToast();
  const [days, setDays] = useState(30);
  const [report, setReport] = useState<AdminReport | null>(null);
  const [funnel, setFunnel] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [funnelError, setFunnelError] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    setReport(null);
    setFunnel(null);
    setError(null);
    setFunnelError(null);
    api
      .get<AdminReport>("/api/admin/reports/summary", { params: { days } })
      .then((res) => setReport(res.data))
      .catch((err) => setError(apiErrorMessage(err, "Could not load the report")));
    api
      .get<Record<string, number>>("/api/admin/analytics", { params: { days } })
      .then((res) => setFunnel(res.data))
      .catch((err) => setFunnelError(apiErrorMessage(err, "Could not load the conversion funnel")));
  }, [days]);

  async function exportCsv(path: string, name: string) {
    setExporting(true);
    try {
      await openProtected(path, name);
    } catch (err) {
      showToast(apiErrorMessage(err, "Export failed"), "error");
    } finally {
      setExporting(false);
    }
  }

  const s = report?.stats;
  const periodSales = report?.salesByDay.reduce((sum, d) => sum + d.sales, 0) ?? 0;
  const periodOrders = report?.salesByDay.reduce((sum, d) => sum + d.orders, 0) ?? 0;
  const chart = report?.salesByDay.map((d) => ({ ...d, day: d.date.slice(5) })) ?? [];
  const steps = funnel ? Object.entries(funnel) : [];
  const widest = Math.max(1, ...steps.map(([, count]) => count));

  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="Sales, vendors and the buyer funnel."
        action={
          <div className="flex gap-1 rounded-full bg-coffee-100 p-1">
            {WINDOWS.map((w) => (
              <button
                key={w}
                onClick={() => setDays(w)}
                className={`rounded-full px-3 py-1.5 text-sm font-semibold ${days === w ? "bg-coffee-800 text-cream-50" : "text-coffee-700"}`}
              >
                {w} days
              </button>
            ))}
          </div>
        }
      />

      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="secondary" disabled={exporting} onClick={() => exportCsv(`/api/admin/reports/transactions.csv?days=${days}`, "coffeehub-transactions.csv")}>
          <Download size={15} /> Transactions CSV ({days} days)
        </Button>
        <Button variant="secondary" disabled={exporting} onClick={() => exportCsv("/api/admin/reports/settlements.csv", "coffeehub-settlements.csv")}>
          <Download size={15} /> Settlements CSV
        </Button>
      </div>

      {error ? (
        <div className="mt-6">
          <ErrorNote>{error}</ErrorNote>
        </div>
      ) : !report || !s ? (
        <div className="mt-6">
          <SkeletonGrid count={8} className="h-28" />
        </div>
      ) : (
        <>
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={`Sales, last ${days} days`} value={money(periodSales)} hint={`${periodOrders} vendor orders`} />
            <StatCard label="GMV (all time)" value={money(s.gmv)} />
            <StatCard label="Platform revenue (all time)" value={money(s.platformRevenue)} />
            <StatCard label="Average order value" value={money(s.averageOrderValue)} />
            <StatCard label="Orders (all time)" value={s.totalOrders} />
            <StatCard label="Active vendors" value={s.activeVendors} />
            <StatCard label="Quote acceptance rate" value={`${s.quoteAcceptanceRate}%`} hint={`${s.totalQuotes} quotes on ${s.totalRfqs} RFQs`} />
            <StatCard label="Refunds (all time)" value={money(s.refundTotal)} hint={`${s.openDisputes} open disputes`} />
          </div>

          <Card className="mt-6">
            <h2 className="text-lg font-semibold text-coffee-900">Sales by day</h2>
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

          <Card className="mt-4">
            <h2 className="text-lg font-semibold text-coffee-900">Top vendors, last {days} days</h2>
            {report.topVendors.length === 0 ? (
              <p className="mt-3 text-sm text-coffee-500">No sales in this period.</p>
            ) : (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="text-coffee-500">
                    <tr>
                      <th className="py-2 pr-4">Vendor</th>
                      <th className="py-2 pr-4">Sales</th>
                      <th className="py-2 pr-4">Orders</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-coffee-100">
                    {report.topVendors.map((v) => (
                      <tr key={v.vendorId}>
                        <td className="py-2 pr-4">
                          <Link to={`/admin/vendors/${v.vendorId}`} className="font-medium text-coffee-900 hover:underline">
                            {v.vendorName}
                          </Link>
                        </td>
                        <td className="whitespace-nowrap py-2 pr-4 text-coffee-700">{money(v.sales)}</td>
                        <td className="py-2 pr-4 text-coffee-600">{v.orders}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </>
      )}

      <Card className="mt-4">
        <h2 className="text-lg font-semibold text-coffee-900">Conversion funnel, last {days} days</h2>
        {funnelError ? (
          <div className="mt-3">
            <ErrorNote>{funnelError}</ErrorNote>
          </div>
        ) : !funnel ? (
          <div className="mt-3 h-40 animate-pulse rounded-xl bg-coffee-100/70" />
        ) : steps.every(([, count]) => count === 0) ? (
          <p className="mt-3 text-sm text-coffee-500">No activity recorded in this period.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {steps.map(([name, count]) => (
              <li key={name} className="grid grid-cols-[minmax(0,9rem)_1fr_auto] items-center gap-3 text-sm">
                <span className="truncate text-coffee-700">{label(name)}</span>
                <span className="h-3 overflow-hidden rounded-full bg-coffee-100">
                  <span className="block h-full rounded-full bg-coffee-700" style={{ width: `${(count / widest) * 100}%` }} />
                </span>
                <span className="w-12 text-right font-semibold text-coffee-900">{count.toLocaleString("en-IN")}</span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
