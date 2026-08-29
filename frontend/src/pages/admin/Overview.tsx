import { useEffect, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { api } from "../../api/client";
import type { AdminStats } from "../../types";
import StatCard from "../../components/ui/StatCard";

export default function AdminOverview() {
  const [stats, setStats] = useState<AdminStats | null>(null);

  useEffect(() => {
    api.get<AdminStats>("/api/admin/stats").then((res) => setStats(res.data));
  }, []);

  if (!stats) {
    return <p className="text-coffee-400">Loading platform stats…</p>;
  }

  const userChartData = [
    { name: "Customers", count: stats.totalCustomers },
    { name: "Sellers", count: stats.totalSellers },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Super Admin — Master Control Panel</h1>
      <p className="mt-1 text-coffee-500">Platform-wide overview.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total orders" value={stats.totalOrders} />
        <StatCard label="Revenue (GMV)" value={`₹${stats.totalRevenue.toLocaleString("en-IN")}`} />
        <StatCard label="Products pending approval" value={stats.pendingProductApprovals} hint={`${stats.totalProducts} total products`} />
        <StatCard label="Cafés pending approval" value={stats.pendingCafeApprovals} hint={`${stats.totalCafes} total cafés`} />
      </div>

      <div className="mt-10 rounded-2xl border border-coffee-100 bg-cream-50 p-6">
        <h2 className="text-lg font-semibold text-coffee-900">Users by role</h2>
        <div className="mt-4 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={userChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#efe1d3" />
              <XAxis dataKey="name" stroke="#8c5e37" fontSize={12} />
              <YAxis stroke="#8c5e37" fontSize={12} allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#8c5e37" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
