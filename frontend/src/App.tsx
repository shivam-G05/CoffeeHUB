import { lazy, Suspense } from "react";
import { Routes, Route, Outlet } from "react-router-dom";
import PublicLayout from "./components/layout/PublicLayout";
import DashboardLayout from "./components/layout/DashboardLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";

// Every page is its own chunk so visitors only download the screens they open.
const Home = lazy(() => import("./pages/public/Home"));
const Login = lazy(() => import("./pages/public/Login"));
const Register = lazy(() => import("./pages/public/Register"));
const RegisterSeller = lazy(() => import("./pages/public/RegisterSeller"));
const ForgotPassword = lazy(() => import("./pages/public/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/public/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/public/VerifyEmail"));
const Products = lazy(() => import("./pages/public/Products"));
const ProductDetail = lazy(() => import("./pages/public/ProductDetail"));
const CompareMachines = lazy(() => import("./pages/public/CompareMachines"));
const Suppliers = lazy(() => import("./pages/public/Suppliers"));
const SupplierStorefront = lazy(() => import("./pages/public/SupplierStorefront"));
const PostRequirement = lazy(() => import("./pages/public/PostRequirement"));
const Cart = lazy(() => import("./pages/public/Cart"));
const Checkout = lazy(() => import("./pages/public/Checkout"));
const OrderSuccess = lazy(() => import("./pages/public/OrderSuccess"));
const PolicyPage = lazy(() => import("./pages/public/PolicyPage"));
const Help = lazy(() => import("./pages/public/Help"));
const Cafes = lazy(() => import("./pages/public/Cafes"));
const CafeDetail = lazy(() => import("./pages/public/CafeDetail"));

const Profile = lazy(() => import("./pages/shared/Profile"));
const Messages = lazy(() => import("./pages/shared/Messages"));

const CustomerOverview = lazy(() => import("./pages/customer/Overview"));
const CustomerOrders = lazy(() => import("./pages/customer/Orders"));
const CustomerOrderDetail = lazy(() => import("./pages/customer/OrderDetail"));
const CustomerInvoice = lazy(() => import("./pages/customer/Invoice"));
const CustomerRfqs = lazy(() => import("./pages/customer/Rfqs"));
const CustomerRfqDetail = lazy(() => import("./pages/customer/RfqDetail"));
const CustomerWishlist = lazy(() => import("./pages/customer/Wishlist"));
const CustomerSavedSuppliers = lazy(() => import("./pages/customer/SavedSuppliers"));
const CustomerAddresses = lazy(() => import("./pages/customer/Addresses"));
const CustomerDisputes = lazy(() => import("./pages/customer/Disputes"));
const CustomerReservations = lazy(() => import("./pages/customer/Reservations"));

const SellerOverview = lazy(() => import("./pages/seller/Overview"));
const SellerVerification = lazy(() => import("./pages/seller/Verification"));
const SellerStoreProfile = lazy(() => import("./pages/seller/StoreProfile"));
const SellerProducts = lazy(() => import("./pages/seller/Products"));
const SellerProductForm = lazy(() => import("./pages/seller/ProductForm"));
const SellerInventory = lazy(() => import("./pages/seller/Inventory"));
const SellerOrders = lazy(() => import("./pages/seller/Orders"));
const SellerOrderDetail = lazy(() => import("./pages/seller/OrderDetail"));
const SellerRfqs = lazy(() => import("./pages/seller/Rfqs"));
const SellerRfqDetail = lazy(() => import("./pages/seller/RfqDetail"));
const SellerQuotes = lazy(() => import("./pages/seller/Quotes"));
const SellerPayments = lazy(() => import("./pages/seller/Payments"));
const SellerReviews = lazy(() => import("./pages/seller/Reviews"));
const SellerDisputes = lazy(() => import("./pages/seller/Disputes"));

const AdminOverview = lazy(() => import("./pages/admin/Overview"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminVendors = lazy(() => import("./pages/admin/Vendors"));
const AdminVendorDetail = lazy(() => import("./pages/admin/VendorDetail"));
const AdminProducts = lazy(() => import("./pages/admin/Products"));
const AdminCategories = lazy(() => import("./pages/admin/Categories"));
const AdminOrders = lazy(() => import("./pages/admin/Orders"));
const AdminRfqs = lazy(() => import("./pages/admin/Rfqs"));
const AdminRfqDetail = lazy(() => import("./pages/admin/RfqDetail"));
const AdminQuotes = lazy(() => import("./pages/admin/Quotes"));
const AdminSettlements = lazy(() => import("./pages/admin/Settlements"));
const AdminReviews = lazy(() => import("./pages/admin/Reviews"));
const AdminDisputes = lazy(() => import("./pages/admin/Disputes"));
const AdminReports = lazy(() => import("./pages/admin/Reports"));
const AdminContent = lazy(() => import("./pages/admin/Content"));
const AdminSettings = lazy(() => import("./pages/admin/Settings"));
const AdminAuditLog = lazy(() => import("./pages/admin/AuditLog"));
const AdminConversations = lazy(() => import("./pages/admin/Conversations"));
const AdminCafes = lazy(() => import("./pages/admin/Cafes"));

function PageLoading() {
  return <div className="flex min-h-[40vh] items-center justify-center text-sm text-coffee-400">Loading…</div>;
}

function Lazy() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Outlet />
    </Suspense>
  );
}

function NotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center text-center">
      <h1 className="text-3xl font-bold text-coffee-900">404</h1>
      <p className="mt-2 text-coffee-500">This page doesn&rsquo;t exist.</p>
    </div>
  );
}

const customerNav = [
  { to: "/customer", label: "Overview", end: true },
  { to: "/customer/orders", label: "Orders" },
  { to: "/customer/rfqs", label: "RFQs & Quotes" },
  { to: "/customer/messages", label: "Messages" },
  { to: "/customer/wishlist", label: "Wishlist" },
  { to: "/customer/saved-suppliers", label: "Saved Suppliers" },
  { to: "/customer/addresses", label: "Addresses" },
  { to: "/customer/disputes", label: "Support & Disputes" },
  { to: "/customer/reservations", label: "Café Reservations" },
  { to: "/customer/profile", label: "Profile" },
];

const sellerNav = [
  { to: "/seller", label: "Overview", end: true },
  { to: "/seller/verification", label: "Verification & Documents" },
  { to: "/seller/store", label: "Store Profile" },
  { to: "/seller/products", label: "Products" },
  { to: "/seller/inventory", label: "Inventory" },
  { to: "/seller/orders", label: "Orders" },
  { to: "/seller/rfqs", label: "RFQs" },
  { to: "/seller/quotes", label: "Quotes" },
  { to: "/seller/messages", label: "Messages" },
  { to: "/seller/payments", label: "Payments" },
  { to: "/seller/reviews", label: "Reviews" },
  { to: "/seller/disputes", label: "Disputes" },
  { to: "/seller/profile", label: "Settings" },
];

const adminNav = [
  { to: "/admin", label: "Dashboard", end: true },
  { to: "/admin/users", label: "Users" },
  { to: "/admin/vendors", label: "Vendor Verification" },
  { to: "/admin/products", label: "Product Moderation" },
  { to: "/admin/categories", label: "Categories & Commission" },
  { to: "/admin/orders", label: "Orders & Payments" },
  { to: "/admin/rfqs", label: "RFQs" },
  { to: "/admin/quotes", label: "Quotes" },
  { to: "/admin/settlements", label: "Settlements" },
  { to: "/admin/reviews", label: "Reviews" },
  { to: "/admin/disputes", label: "Disputes" },
  { to: "/admin/conversations", label: "Flagged Messages" },
  { to: "/admin/reports", label: "Reports" },
  { to: "/admin/content", label: "Content (CMS)" },
  { to: "/admin/cafes", label: "Café Approvals" },
  { to: "/admin/settings", label: "Settings" },
  { to: "/admin/audit-log", label: "Audit Log" },
];

export default function App() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route element={<Lazy />}>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/register/seller" element={<RegisterSeller />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/products" element={<Products />} />
          <Route path="/category/:categorySlug" element={<Products />} />
          <Route path="/products/compare" element={<CompareMachines />} />
          <Route path="/products/:id" element={<ProductDetail />} />
          <Route path="/suppliers" element={<Suppliers />} />
          <Route path="/suppliers/:slug" element={<SupplierStorefront />} />
          <Route path="/post-requirement" element={<PostRequirement />} />
          <Route path="/policies/:slug" element={<PolicyPage />} />
          <Route path="/help" element={<Help />} />
          <Route path="/cafes" element={<Cafes />} />
          <Route path="/cafes/:id" element={<CafeDetail />} />

          <Route element={<ProtectedRoute allow={["CUSTOMER"]} />}>
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["CUSTOMER"]} />}>
        {/* Printable invoice: no dashboard chrome around it. */}
        <Route element={<Lazy />}>
          <Route path="/customer/orders/:id/invoice" element={<CustomerInvoice />} />
        </Route>
        <Route path="/customer" element={<DashboardLayout title="Buyer" navItems={customerNav} />}>
          <Route element={<Lazy />}>
            <Route index element={<CustomerOverview />} />
            <Route path="orders" element={<CustomerOrders />} />
            <Route path="orders/:id" element={<CustomerOrderDetail />} />
            <Route path="rfqs" element={<CustomerRfqs />} />
            <Route path="rfqs/:id" element={<CustomerRfqDetail />} />
            <Route path="messages" element={<Messages basePath="/customer/messages" />} />
            <Route path="messages/:id" element={<Messages basePath="/customer/messages" />} />
            <Route path="wishlist" element={<CustomerWishlist />} />
            <Route path="saved-suppliers" element={<CustomerSavedSuppliers />} />
            <Route path="addresses" element={<CustomerAddresses />} />
            <Route path="disputes" element={<CustomerDisputes />} />
            <Route path="reservations" element={<CustomerReservations />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["SELLER"]} />}>
        <Route path="/seller" element={<DashboardLayout title="Seller" navItems={sellerNav} />}>
          <Route element={<Lazy />}>
            <Route index element={<SellerOverview />} />
            <Route path="verification" element={<SellerVerification />} />
            <Route path="store" element={<SellerStoreProfile />} />
            <Route path="products" element={<SellerProducts />} />
            <Route path="products/new" element={<SellerProductForm />} />
            <Route path="products/:id/edit" element={<SellerProductForm />} />
            <Route path="inventory" element={<SellerInventory />} />
            <Route path="orders" element={<SellerOrders />} />
            <Route path="orders/:id" element={<SellerOrderDetail />} />
            <Route path="rfqs" element={<SellerRfqs />} />
            <Route path="rfqs/:id" element={<SellerRfqDetail />} />
            <Route path="quotes" element={<SellerQuotes />} />
            <Route path="messages" element={<Messages basePath="/seller/messages" />} />
            <Route path="messages/:id" element={<Messages basePath="/seller/messages" />} />
            <Route path="payments" element={<SellerPayments />} />
            <Route path="reviews" element={<SellerReviews />} />
            <Route path="disputes" element={<SellerDisputes />} />
            <Route path="profile" element={<Profile />} />
          </Route>
        </Route>
      </Route>

      <Route element={<ProtectedRoute allow={["ADMIN"]} />}>
        <Route path="/admin" element={<DashboardLayout title="Admin" navItems={adminNav} />}>
          <Route element={<Lazy />}>
            <Route index element={<AdminOverview />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="vendors" element={<AdminVendors />} />
            <Route path="vendors/:id" element={<AdminVendorDetail />} />
            <Route path="products" element={<AdminProducts />} />
            <Route path="categories" element={<AdminCategories />} />
            <Route path="orders" element={<AdminOrders />} />
            <Route path="rfqs" element={<AdminRfqs />} />
            <Route path="rfqs/:id" element={<AdminRfqDetail />} />
            <Route path="quotes" element={<AdminQuotes />} />
            <Route path="settlements" element={<AdminSettlements />} />
            <Route path="reviews" element={<AdminReviews />} />
            <Route path="disputes" element={<AdminDisputes />} />
            <Route path="conversations" element={<AdminConversations />} />
            <Route path="reports" element={<AdminReports />} />
            <Route path="content" element={<AdminContent />} />
            <Route path="cafes" element={<AdminCafes />} />
            <Route path="settings" element={<AdminSettings />} />
            <Route path="audit-log" element={<AdminAuditLog />} />
          </Route>
        </Route>
      </Route>

      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
