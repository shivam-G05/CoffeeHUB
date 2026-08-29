import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Coffee, Heart, Menu, ShoppingCart, User, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { dashboardHome } from "../../routes/roleHome";
import SearchBar from "./SearchBar";

const navLinks = [
  { to: "/products", label: "Shop" },
  { to: "/products?type=BEAN", label: "Green Coffee" },
  { to: "/products?type=MACHINE", label: "Used Equipment" },
  { to: "/products?type=ACCESSORY", label: "Brewing Gear" },
];

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  const accountLink = user ? dashboardHome(user.role) : "/login";

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-coffee-100 bg-cream-50/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3 sm:px-6">
          {/* Logo */}
          <Link to="/" className="flex shrink-0 items-center gap-2" onClick={closeMenu}>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-coffee-800 text-cream-50">
              <Coffee size={18} />
            </span>
            <span className="leading-none">
              <span className="block font-serif text-lg font-bold tracking-tight text-coffee-900">
                COFFEE HUB
              </span>
              <span className="block text-[10px] font-semibold uppercase tracking-[0.25em] text-amber-accent">
                Global
              </span>
            </span>
          </Link>

          {/* Search (desktop) */}
          <SearchBar className="mx-auto hidden max-w-xl flex-1 md:block" />

          {/* Actions */}
          <div className="ml-auto flex items-center gap-1 sm:gap-2">
            <Link
              to={accountLink}
              className="flex flex-col items-center rounded-lg px-2 py-1 text-coffee-700 hover:bg-coffee-100/70"
              title={user ? "My Dashboard" : "Sign in"}
            >
              <User size={20} />
              <span className="hidden text-[10px] font-medium lg:block">
                {user ? "Account" : "Sign in"}
              </span>
            </Link>
            <Link
              to={user?.role === "CUSTOMER" ? "/customer/wishlist" : "/login"}
              className="flex flex-col items-center rounded-lg px-2 py-1 text-coffee-700 hover:bg-coffee-100/70"
              title="Wishlist"
            >
              <Heart size={20} />
              <span className="hidden text-[10px] font-medium lg:block">Wishlist</span>
            </Link>
            <Link
              to={user?.role === "CUSTOMER" ? "/customer/orders" : "/login"}
              className="flex flex-col items-center rounded-lg px-2 py-1 text-coffee-700 hover:bg-coffee-100/70"
              title="Orders"
            >
              <ShoppingCart size={20} />
              <span className="hidden text-[10px] font-medium lg:block">Cart</span>
            </Link>

            {user ? (
              <button
                onClick={logout}
                className="ml-1 hidden rounded-full border border-coffee-200 px-4 py-2 text-sm font-medium text-coffee-700 hover:bg-coffee-100 lg:block"
              >
                Log out
              </button>
            ) : (
              <Link
                to="/register"
                className="ml-1 hidden rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700 lg:block"
              >
                Get Started
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

        {/* Category nav bar (desktop) */}
        <nav className="hidden border-t border-coffee-100 md:block">
          <div className="mx-auto flex max-w-7xl items-center gap-6 px-6 py-2 text-sm font-medium text-coffee-700">
            {navLinks.map((link) => (
              <NavLink
                key={link.label}
                to={link.to}
                className={({ isActive }) =>
                  `hover:text-coffee-900 ${isActive ? "text-coffee-900" : ""}`
                }
              >
                {link.label}
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Mobile menu */}
        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-coffee-100 md:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
                <SearchBar className="mb-2" onNavigate={closeMenu} />
                {navLinks.map((link) => (
                  <Link
                    key={link.label}
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
                      <Link
                        to="/login"
                        onClick={closeMenu}
                        className="rounded-full border border-coffee-200 px-4 py-2 text-center text-sm font-semibold text-coffee-800"
                      >
                        Log in
                      </Link>
                      <Link
                        to="/register"
                        onClick={closeMenu}
                        className="rounded-full bg-coffee-800 px-4 py-2 text-center text-sm font-semibold text-cream-50"
                      >
                        Get Started
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
        <div className="mx-auto grid max-w-7xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <div className="flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-accent text-coffee-900">
                <Coffee size={18} />
              </span>
              <p className="font-serif text-lg font-semibold text-cream-50">
                COFFEE HUB <span className="text-amber-accent">Global</span>
              </p>
            </div>
            <p className="mt-3 max-w-sm text-sm text-coffee-200">
              The global coffee marketplace — discover cafés, buy beans &amp; machines, connect with
              roasters, and grow your coffee business, all in one place.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream-50">Explore</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-coffee-300">
              <Link to="/products" className="hover:text-cream-50">Beans &amp; Machines</Link>
              <Link to="/products?type=BEAN" className="hover:text-cream-50">Green Coffee</Link>
              <Link to="/cafes" className="hover:text-cream-50">Discover Cafés</Link>
              <Link to="/products/compare" className="hover:text-cream-50">Compare Machines</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream-50">Get started</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-coffee-300">
              <Link to="/register?role=CUSTOMER" className="hover:text-cream-50">Join as Customer</Link>
              <Link to="/register?role=SELLER" className="hover:text-cream-50">Join as Seller</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-coffee-800 py-4 text-center text-xs text-coffee-400">
          © {new Date().getFullYear()} Coffee Hub Global. Built for demo purposes.
        </div>
      </footer>
    </div>
  );
}
