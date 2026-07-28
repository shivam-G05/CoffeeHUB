import { Routes, Route } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

import Home from "./pages/public/Home";
import Login from "./pages/public/Login";
import Register from "./pages/public/Register";
import Products from "./pages/public/Products";
import ProductDetail from "./pages/public/ProductDetail";
import CompareMachines from "./pages/public/CompareMachines";
import Cafes from "./pages/public/Cafes";
import CafeDetail from "./pages/public/CafeDetail";

import Profile from "./pages/shared/Profile";

import CustomerOverview from "./pages/customer/Overview";
import CustomerOrders from "./pages/customer/Orders";
import CustomerWishlist from "./pages/customer/Wishlist";
import CustomerReservations from "./pages/customer/Reservations";

import SellerOverview from "./pages/seller/Overview";
import SellerProducts from "./pages/seller/Products";
import SellerOrders from "./pages/seller/Orders";

import CafeOwnerOverview from "./pages/cafe-owner/Overview";
import MyCafe from "./pages/cafe-owner/MyCafe";
import CafeOwnerReservations from "./pages/cafe-owner/Reservations";

import AdminOverview from "./pages/admin/Overview";
import AdminUsers from "./pages/admin/Users";
import AdminProducts from "./pages/admin/Products";
import AdminCafes from "./pages/admin/Cafes";
import AdminOrders from "./pages/admin/Orders";

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold text-coffee-900">404</h1>
      <p className="mt-2 text-coffee-500">This page doesn&rsquo;t exist.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/compare" element={<CompareMachines />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/cafes" element={<Cafes />} />
        <Route path="/cafes/:id" element={<CafeDetail />} />
      </Route>

      <Route element={<ProtectedRoute allow={["CUSTOMER"]} />}>
        <Route
          path="/customer"
          element={
            <DashboardLayout
              title="Customer"
              navItems={[
                { to: "/customer", label: "Overview", end: true },
                { to: "/products", label: "Buy Beans & Machines" },
                { to: "/cafes", label: "Discover Cafés" },
                { to: "/customer/orders", label: "My Orders" },
                { to: "/customer/wishlist", label: "Wishlist" },
                { to: "/customer/reservations", label: "My Reservations" },
                { to: "/customer/profile", label: "Profile" },
              ]}
            />
          }
        >
          <Route index element={<CustomerOverview />} />
          <Route path="orders" element={<CustomerOrders />} />
          <Route path="wishlist" element={<CustomerWishlist />} />
          <Route path="reservations" element={<CustomerReservations />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["SELLER"]} />}>
        <Route
          path="/seller"
          element={
            <DashboardLayout
              title="Seller"
              navItems={[
                { to: "/seller", label: "Overview", end: true },
                { to: "/seller/products", label: "My Products" },
                { to: "/seller/orders", label: "Orders" },
                { to: "/seller/profile", label: "Profile" },
              ]}
            />
          }
        >
          <Route index element={<SellerOverview />} />
          <Route path="products" element={<SellerProducts />} />
          <Route path="orders" element={<SellerOrders />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["CAFE_OWNER"]} />}>
        <Route
          path="/cafe-owner"
          element={
            <DashboardLayout
              title="Café Owner"
              navItems={[
                { to: "/cafe-owner", label: "Overview", end: true },
                { to: "/cafe-owner/my-cafe", label: "My Café" },
                { to: "/cafe-owner/reservations", label: "Table Bookings" },
                { to: "/cafe-owner/profile", label: "Profile" },
              ]}
            />
          }
        >
          <Route index element={<CafeOwnerOverview />} />
          <Route path="my-cafe" element={<MyCafe />} />
          <Route path="reservations" element={<CafeOwnerReservations />} />
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
        <Route
          path="/admin"
          element={
            <DashboardLayout
              title="Super Admin"
              navItems={[
                { to: "/admin", label: "Overview", end: true },
                { to: "/admin/users", label: "Users" },
                { to: "/admin/products", label: "Product Approvals" },
                { to: "/admin/cafes", label: "Café Approvals" },
                { to: "/admin/orders", label: "All Orders" },
              ]}
            />
          }
        >
          <Route index element={<AdminOverview />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="products" element={<AdminProducts />} />
          <Route path="cafes" element={<AdminCafes />} />
          <Route path="orders" element={<AdminOrders />} />
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
