import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Heart, Sparkles } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import type { Order } from "../../types";
import StatCard from "../../components/ui/StatCard";
import Badge from "../../components/ui/Badge";

export default function CustomerOverview() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get<Order[]>("/api/orders/mine").then((res) => setOrders(res.data));
  }, []);

  const totalSpent = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Welcome back, {user?.name?.split(" ")[0]} 👋</h1>
      <p className="mt-1 text-coffee-500">Here&rsquo;s a snapshot of your CoffeeHub activity.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total orders" value={orders.length} />
        <StatCard label="Total spent" value={`₹${totalSpent.toLocaleString("en-IN")}`} />
        <StatCard label="Pending orders" value={orders.filter((o) => o.status === "PENDING").length} />
        <StatCard label="Loyalty points" value={user?.loyaltyPoints ?? 0} hint="1 pt per ₹100 spent" />
      </div>

      <div className="mt-10 flex flex-wrap gap-3">
        <Link to="/products" className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50">
          Buy beans &amp; machines
        </Link>
        <Link to="/cafes" className="rounded-full bg-coffee-100 px-4 py-2 text-sm font-semibold text-coffee-800">
          Discover cafés
        </Link>
        <Link
          to="/customer/wishlist"
          className="flex items-center gap-1.5 rounded-full bg-coffee-100 px-4 py-2 text-sm font-semibold text-coffee-800"
        >
          <Heart size={14} /> Wishlist
        </Link>
      </div>

      <div className="mt-6 flex items-center gap-2 rounded-xl bg-amber-accent/10 px-4 py-3 text-sm text-coffee-700">
        <Sparkles size={16} className="text-amber-accent" />
        Refer friends from your{" "}
        <Link to="/customer/profile" className="font-semibold underline">
          profile page
        </Link>{" "}
        and earn 50 bonus points each.
      </div>

      <div className="mt-10">
        <h2 className="text-lg font-semibold text-coffee-900">Recent orders</h2>
        {orders.length === 0 ? (
          <p className="mt-2 text-sm text-coffee-400">No orders yet.</p>
        ) : (
          <div className="mt-3 divide-y divide-coffee-100 rounded-xl border border-coffee-100 bg-cream-50">
            {orders.slice(0, 5).map((o) => (
              <div key={o.id} className="flex items-center justify-between px-4 py-3 text-sm">
                <span className="font-medium text-coffee-800">Order #{o.id}</span>
                <span className="text-coffee-500">₹{o.totalAmount.toLocaleString("en-IN")}</span>
                <Badge tone={o.status}>{o.status}</Badge>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
