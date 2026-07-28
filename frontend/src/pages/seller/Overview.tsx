import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../../api/client";
import type { Order, Product } from "../../types";
import StatCard from "../../components/ui/StatCard";

export default function SellerOverview() {
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    api.get<Product[]>("/api/products/mine").then((res) => setProducts(res.data));
    api.get<Order[]>("/api/orders/seller").then((res) => setOrders(res.data));
  }, []);

  const revenue = orders
    .filter((o) => o.status !== "CANCELLED")
    .reduce((sum, o) => sum + o.totalAmount, 0);

  return (
    <div>
      <h1 className="text-2xl font-bold text-coffee-900">Seller Dashboard</h1>
      <p className="mt-1 text-coffee-500">Manage your products, stock, and incoming orders.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Products listed" value={products.length} />
        <StatCard label="Pending approval" value={products.filter((p) => !p.approved).length} />
        <StatCard label="Orders received" value={orders.length} />
        <StatCard label="Revenue" value={`₹${revenue.toLocaleString("en-IN")}`} />
      </div>

      <Link
        to="/seller/products"
        className="mt-8 inline-block rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50"
      >
        Manage products
      </Link>
    </div>
  );
}
