import { Link, NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useBrand } from "../../context/BrandContext";
import NotificationBell from "./NotificationBell";

export interface DashboardNavItem {
  to: string;
  label: string;
  end?: boolean;
}

export default function DashboardLayout({
  title,
  navItems,
}: {
  title: string;
  navItems: DashboardNavItem[];
}) {
  const { user, logout } = useAuth();
  const brand = useBrand();

  return (
    <div className="flex min-h-screen bg-cream-100">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-coffee-100 bg-cream-50 md:flex">
        <div className="border-b border-coffee-100 px-6 py-5">
          <Link to="/" className="text-lg font-bold text-coffee-800">
            ☕ {brand.name}
          </Link>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-coffee-400">{title}</p>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `block rounded-lg px-3 py-2 text-sm font-medium transition ${
                  isActive ? "bg-coffee-800 text-cream-50" : "text-coffee-700 hover:bg-coffee-100"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <div className="border-t border-coffee-100 px-6 py-4">
          <p className="truncate text-sm font-semibold text-coffee-800">{user?.name}</p>
          <p className="truncate text-xs text-coffee-400">{user?.email}</p>
          <button onClick={logout} className="mt-3 text-sm font-medium text-red-600 hover:text-red-700">
            Log out
          </button>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="flex items-center justify-between gap-3 border-b border-coffee-100 bg-cream-50 px-4 py-2.5 sm:px-6">
          <Link to="/" className="text-lg font-bold text-coffee-800 md:hidden">
            ☕ {brand.name}
          </Link>
          <Link to="/" className="hidden text-sm font-medium text-coffee-500 hover:text-coffee-800 md:block">
            ← Back to marketplace
          </Link>
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button onClick={logout} className="text-sm font-medium text-red-600 md:hidden">
              Log out
            </button>
          </div>
        </header>
        <nav className="flex gap-2 overflow-x-auto border-b border-coffee-100 bg-cream-50 px-3 py-2 md:hidden">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium ${
                  isActive ? "bg-coffee-800 text-cream-50" : "bg-coffee-100 text-coffee-700"
                }`
              }
            >
              {item.label}
            </NavLink>
          ))}
        </nav>
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
