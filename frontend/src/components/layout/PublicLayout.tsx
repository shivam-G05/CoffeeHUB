import { useState } from "react";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Menu, X } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { dashboardHome } from "../../routes/roleHome";

const navLinks = [
  { to: "/products", label: "Beans & Machines" },
  { to: "/cafes", label: "Discover Cafés" },
];

export default function PublicLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-coffee-100 bg-cream-50/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="font-serif text-xl font-bold tracking-tight text-coffee-800" onClick={closeMenu}>
            ☕ CoffeeHub <span className="text-coffee-400">India</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-coffee-700 md:flex">
            {navLinks.map((link) => (
              <NavLink key={link.to} to={link.to} className="hover:text-coffee-900">
                {link.label}
              </NavLink>
            ))}
          </nav>
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <>
                <Link
                  to={dashboardHome(user.role)}
                  className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700"
                >
                  My Dashboard
                </Link>
                <button onClick={logout} className="text-sm font-medium text-coffee-400 hover:text-coffee-700">
                  Log out
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="text-sm font-medium text-coffee-700 hover:text-coffee-900">
                  Log in
                </Link>
                <Link
                  to="/register"
                  className="rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700"
                >
                  Get Started
                </Link>
              </>
            )}
          </div>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-coffee-700 md:hidden"
            aria-label="Toggle menu"
          >
            {menuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>

        <AnimatePresence>
          {menuOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden border-t border-coffee-100 md:hidden"
            >
              <div className="flex flex-col gap-1 px-6 py-4">
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
        <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 sm:grid-cols-2 lg:grid-cols-4">
          <div className="sm:col-span-2 lg:col-span-2">
            <p className="font-serif text-lg font-semibold text-cream-50">☕ CoffeeHub India</p>
            <p className="mt-2 max-w-sm text-sm text-coffee-200">
              The coffee ecosystem platform — discover cafés, buy beans &amp; machines, connect with
              roasters, and grow your coffee business, all in one place.
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream-50">Explore</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-coffee-300">
              <Link to="/products" className="hover:text-cream-50">Beans &amp; Machines</Link>
              <Link to="/cafes" className="hover:text-cream-50">Discover Cafés</Link>
              <Link to="/products/compare" className="hover:text-cream-50">Compare Machines</Link>
            </div>
          </div>
          <div>
            <p className="text-sm font-semibold text-cream-50">Get started</p>
            <div className="mt-3 flex flex-col gap-2 text-sm text-coffee-300">
              <Link to="/register?role=CUSTOMER" className="hover:text-cream-50">Join as Customer</Link>
              <Link to="/register?role=SELLER" className="hover:text-cream-50">Join as Seller</Link>
              <Link to="/register?role=CAFE_OWNER" className="hover:text-cream-50">Join as Café Owner</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-coffee-800 py-4 text-center text-xs text-coffee-400">
          © {new Date().getFullYear()} CoffeeHub India. Built for demo purposes.
        </div>
      </footer>
    </div>
  );
}
