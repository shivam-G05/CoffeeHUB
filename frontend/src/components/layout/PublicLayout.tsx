import { useEffect, useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Heart, Menu, ShoppingCart, User, X } from "lucide-react";
import { api } from "../../api/client";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import { useCart } from "../../context/CartContext";
import { POLICY_LINKS } from "../../lib/constants";
import { dashboardHome } from "../../routes/roleHome";
import type { Category } from "../../types";
import NotificationBell from "./NotificationBell";
import SearchBar from "./SearchBar";

const staticLinks = [
  { to: "/products", label: "Marketplace" },
  { to: "/suppliers", label: "Verified Suppliers" },
  { to: "/post-requirement", label: "Post Requirement" },
];

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const brand = useBrand();
  const { itemCount } = useCart();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    api
      .get<Category[]>("/api/categories")
      .then((res) => setCategories(res.data))
      .catch(() => undefined);
  }, []);

  function closeMenu() {
    setMenuOpen(false);
  }

  const accountLink = user ? dashboardHome(user.role) : "/login";
  const isBuyer = user?.role === "CUSTOMER";
  const navLinks = [...staticLinks, ...categories.map((c) => ({ to: `/category/${c.slug}`, label: c.name }))];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-coffee-100 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2" onClick={closeMenu}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coffee-800 text-cream-50">
              <Coffee size={18} />
            </span>
            <span className="font-serif text-lg font-bold tracking-tight text-coffee-900">{brand.name}</span>
          </Link>

          <SearchBar className="mx-auto hidden max-w-xl flex-1 md:block" />

          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <NotificationBell />
            <Link
              to={accountLink}
              className="flex flex-col items-center rounded-lg px-2 py-1 text-coffee-700 hover:bg-coffee-100/70"
              title={user ? "My Dashboard" : "Sign in"}
            >
              <User size={20} />
              <span className="hidden text-[10px] font-medium lg:block">{user ? "Account" : "Sign in"}</span>
            </Link>
            {(!user || isBuyer) && (
              <>
                <Link
                  to={isBuyer ? "/customer/wishlist" : "/login"}
                  className="hidden flex-col items-center rounded-lg px-2 py-1 text-coffee-700 hover:bg-coffee-100/70 sm:flex"
                  title="Wishlist"
                >
                  <Heart size={20} />
                  <span className="hidden text-[10px] font-medium lg:block">Wishlist</span>
                </Link>
                <Link
                  to={isBuyer ? "/cart" : "/login"}
                  className="relative flex flex-col items-center rounded-lg px-2 py-1 text-coffee-700 hover:bg-coffee-100/70"
                  title="Cart"
                  aria-label={`Cart, ${itemCount} items`}
                >
                  <ShoppingCart size={20} />
                  {itemCount > 0 && (
                    <span className="absolute -top-0.5 right-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-amber-accent px-1 text-[10px] font-bold text-coffee-900">
                      {itemCount > 99 ? "99+" : itemCount}
                    </span>
                  )}
                  <span className="hidden text-[10px] font-medium lg:block">Cart</span>
                </Link>
              </>
            )}

            {user ? (
              <button
                onClick={logout}
                className="ml-1 hidden rounded-full border border-coffee-200 px-4 py-2 text-sm font-medium text-coffee-700 hover:bg-coffee-100 lg:block"
              >
                Log out
              </button>
            ) : (
              <Link
                to="/register/seller"
                className="ml-1 hidden rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700 lg:block"
              >
                Sell on {brand.name}
              </Link>
            )}

            <button
              onClick={() => setMenuOpen((o) => !o)}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-coffee-700 md:hidden"
              aria-label="Toggle menu"
            >
              {menuOpen ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>

        <nav className="hidden border-t border-coffee-100 md:block">
          <div className="mx-auto flex max-w-7xl items-center gap-6 overflow-x-auto px-6 py-2 text-sm font-medium text-coffee-700">
            {navLinks.map((link) => (
              <NavLink
                key={link.to}
                to={link.to}
                className={({ isActive }) => `whitespace-nowrap hover:text-coffee-900 ${isActive ? "text-coffee-900 underline underline-offset-4" : ""}`}
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-coffee-100 md:hidden"
            >
              <div className="flex flex-col gap-1 px-4 py-4">
                <SearchBar className="mb-2" onNavigate={closeMenu} />
                {navLinks.map((link) => (
                  <Link
                    key={link.to}
                    to={link.to}
                    onClick={closeMenu}
                    className="rounded-lg px-3 py-2 text-sm font-medium text-coffee-700 hover:bg-coffee-100"
                  >
                    {link.label}
                  </Link>
                ))}
                <div className="mt-2 flex flex-col gap-2 border-t border-coffee-100 pt-3">
                  {user ? (
                    <>
                      <Link
                        to={dashboardHome(user.role)}
                        onClick={closeMenu}
                        className="rounded-full bg-coffee-800 px-4 py-2 text-center text-sm font-semibold text-cream-50"
                      >
                        My Dashboard
                      </Link>
                      <button
                        onClick={() => {
                          logout();
                          closeMenu();
                        }}
                        className="text-sm font-medium text-coffee-400"
                      >
                        Log out
                      </button>
                    </>
                  ) : (
                    <>
                      <Link to="/login" onClick={closeMenu} className="rounded-full border border-coffee-200 px-4 py-2 text-center text-sm font-semibold text-coffee-800">
                        Log in
                      </Link>
                      <Link to="/register" onClick={closeMenu} className="rounded-full bg-coffee-800 px-4 py-2 text-center text-sm font-semibold text-cream-50">
                        Register to buy
                      </Link>
                      <Link to="/register/seller" onClick={closeMenu} className="rounded-full border border-coffee-200 px-4 py-2 text-center text-sm font-semibold text-coffee-800">
                        Sell on {brand.name}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      <main className="flex-1" key={location.pathname}>
        <Outlet />
      </main>

      <footer className="border-t border-coffee-100 bg-coffee-900 text-cream-100">
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-accent text-coffee-900">
                <Coffee size={18} />
              </span>
              <p className="font-serif text-lg font-semibold text-cream-50">{brand.name}</p>
            </div>
            <p className="mt-3 max-w-sm text-sm text-coffee-200">
              {brand.tagline}. Discover verified coffee suppliers, buy coffee and equipment, and source in bulk by
              posting a requirement.
            </p>
            <p className="mt-3 max-w-sm text-xs text-coffee-300">
              {brand.name} is a marketplace. Products are sold and fulfilled by independent third-party vendors unless
              stated otherwise.
            </p>
            <p className="mt-3 text-sm text-coffee-200">
              Support:{" "}
              <a href={`mailto:${brand.supportEmail}`} className="underline hover:text-cream-50">
                {brand.supportEmail}
              </a>
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream-50">Marketplace</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-coffee-300">
              <Link to="/products" className="hover:text-cream-50">Explore Marketplace</Link>
              <Link to="/suppliers" className="hover:text-cream-50">Verified Suppliers</Link>
              <Link to="/post-requirement" className="hover:text-cream-50">Post Requirement</Link>
              <Link to="/cafes" className="hover:text-cream-50">Discover Cafés</Link>
              <Link to="/help" className="hover:text-cream-50">Help &amp; FAQs</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream-50">Sell</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-coffee-300">
              <Link to="/register/seller" className="hover:text-cream-50">Sell on {brand.name}</Link>
              <Link to="/policies/seller-terms" className="hover:text-cream-50">Seller Terms</Link>
              <Link to="/login" className="hover:text-cream-50">Seller login</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream-50">Policies</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-coffee-300">
              {POLICY_LINKS.filter((p) => p.slug !== "seller-terms").map((p) => (
                <Link key={p.slug} to={`/policies/${p.slug}`} className="hover:text-cream-50">
                  {p.title}
                </Link>
              ))}
            </div>
          </div>
        </div>
        <div className="border-t border-coffee-800 py-4 text-center text-xs text-coffee-400">
          © {new Date().getFullYear()} {brand.name}. All rights reserved.
        </div>
      </footer>
    </div>
  );
}
