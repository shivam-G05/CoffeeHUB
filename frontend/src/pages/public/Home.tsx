import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ReactFiber from "../../components/layout/ReactFiber";
import {
  ArrowRight,
  BadgeCheck,
  Coffee,
  Cog,
  Gift,
  Globe,
  GraduationCap,
  Headphones,
  Leaf,
  Package,
  Recycle,
  ShieldCheck,
  Sprout,
  Star,
  Store,
  Tag,
  Truck,
  Wrench,
} from "lucide-react";

// Free-license photos from Unsplash (images.unsplash.com hotlinking is explicitly
// permitted by the Unsplash License for commercial use, no attribution required).
const PHOTOS = {
  hero: "photo-1426174840074-541ae41efdb9",
  beans: "photo-1753837787691-84a06d715d24",
  machine: "photo-1758593386033-cb1f842d550c",
  cafeInterior: "photo-1749922217403-412f69429dc5",
  pouring: "photo-1761271046396-97d231b59dd7",
  flatlay: "photo-1536227661368-deef57acf708",
  groupTable: "photo-1710880694444-970aaf7e7f97",
  iced: "photo-1531835207745-506a1bc035d8",
  counter: "photo-1765894711254-a970c9277456",
};

function img(id: string, w: number, h?: number) {
  const base = `https://images.unsplash.com/${id}?auto=format&fit=crop&q=75&w=${w}`;
  return h ? `${base}&h=${h}` : base;
}

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;

// ---- Category sidebar (links to the real catalog with a type pre-filter) ----
const categories = [
  { label: "All Categories", icon: Package, to: "/products" },
  { label: "Coffee Beans", icon: Coffee, to: "/products?type=BEAN" },
  { label: "Green Coffee", icon: Leaf, to: "/products?type=BEAN" },
  { label: "Used Equipment", icon: Recycle, to: "/products?type=MACHINE" },
  { label: "Brewing Equipment", icon: Cog, to: "/products?type=ACCESSORY" },
  { label: "Café & Commercial", icon: Store, to: "/cafes" },
  { label: "Accessories", icon: Wrench, to: "/products?type=ACCESSORY" },
  { label: "Education", icon: GraduationCap, to: "/products" },
  { label: "Deals & Offers", icon: Tag, to: "/products" },
];

// ---- Circular category chips ----
const chips = [
  { label: "Green Coffee", photo: PHOTOS.beans, to: "/products?type=BEAN" },
  { label: "Coffee Beans", photo: PHOTOS.flatlay, to: "/products?type=BEAN" },
  { label: "Used Equipment", photo: PHOTOS.machine, to: "/products?type=MACHINE" },
  { label: "Brewing Gear", photo: PHOTOS.pouring, to: "/products?type=ACCESSORY" },
  { label: "Café & Commercial", photo: PHOTOS.cafeInterior, to: "/cafes" },
  { label: "Accessories", photo: PHOTOS.counter, to: "/products?type=ACCESSORY" },
  { label: "Deals", photo: PHOTOS.iced, to: "/products" },
  { label: "All", photo: PHOTOS.groupTable, to: "/products" },
];

const stats = [
  { value: "50K+", label: "Products" },
  { value: "10K+", label: "Sellers" },
  { value: "100+", label: "Countries" },
];

const trustBadges = [
  { icon: BadgeCheck, title: "Verified Sellers", sub: "Trusted Quality" },
  { icon: ShieldCheck, title: "Secure Payments", sub: "Safe & Protected" },
  { icon: Truck, title: "Worldwide Shipping", sub: "Fast & Reliable" },
  { icon: Gift, title: "Buyer Protection", sub: "We've Got You" },
];

interface SampleProduct {
  name: string;
  sub: string;
  price: number;
  unit?: string;
  rating: number;
  reviews: number;
  photo: string;
}

const coffeeBeans: SampleProduct[] = [
  { name: "Kofe Geek House Blend", sub: "Ethiopia Sidamo · 250g", price: 599, rating: 4.8, reviews: 210, photo: PHOTOS.flatlay },
  { name: "Blue Tokai Vienna Roast", sub: "French Roast · 250g", price: 549, rating: 4.7, reviews: 173, photo: PHOTOS.beans },
  { name: "Third Wave Signature", sub: "Bibo's Blend · 250g", price: 640, rating: 4.6, reviews: 142, photo: PHOTOS.counter },
  { name: "Kofe Geek Espresso Blend", sub: "Dark Roast · 250g", price: 599, rating: 4.8, reviews: 230, photo: PHOTOS.iced },
];

const greenCoffee: SampleProduct[] = [
  { name: "Ethiopia Yirgacheffe G1", sub: "Washed · Floral", price: 850, unit: "/kg", rating: 4.9, reviews: 88, photo: PHOTOS.beans },
  { name: "Colombia Supremo", sub: "Farm Direct · Caramel", price: 690, unit: "/kg", rating: 4.8, reviews: 76, photo: PHOTOS.flatlay },
  { name: "Brazil Fazenda Rio", sub: "Natural · Chocolate", price: 550, unit: "/kg", rating: 4.7, reviews: 64, photo: PHOTOS.counter },
  { name: "Guatemala Huehuetenango", sub: "Washed · Cocoa", price: 780, unit: "/kg", rating: 4.7, reviews: 52, photo: PHOTOS.iced },
];

const brewingEquipment: SampleProduct[] = [
  { name: "Timemore C2 Grinder", sub: "Manual · 38mm burr", price: 6999, rating: 4.9, reviews: 320, photo: PHOTOS.machine },
  { name: "Hario V60 Dripper", sub: "Ceramic · Size 02", price: 1490, rating: 4.8, reviews: 254, photo: PHOTOS.pouring },
  { name: "Breville Barista Pro", sub: "Espresso · Home", price: 54990, rating: 4.5, reviews: 118, photo: PHOTOS.machine },
  { name: "Fellow Stagg Kettle", sub: "Pour Over · 0.9L", price: 8999, rating: 4.8, reviews: 176, photo: PHOTOS.pouring },
];

const promos = [
  { title: "Used Equipment", sub: "Quality pre-loved. Great value.", icon: Recycle, photo: PHOTOS.machine, to: "/products?type=MACHINE" },
  { title: "Green Coffee Trading", sub: "Direct from farms to roasters.", icon: Sprout, photo: PHOTOS.beans, to: "/products?type=BEAN" },
  { title: "Coffee Education", sub: "Learn. Brew. Improve.", icon: GraduationCap, photo: PHOTOS.pouring, to: "/products" },
];

const trustBar = [
  { icon: ShieldCheck, label: "100% Secure Payments" },
  { icon: BadgeCheck, label: "Verified Sellers" },
  { icon: Truck, label: "Worldwide Shipping" },
  { icon: Gift, label: "Buyer Protection" },
  { icon: Headphones, label: "24/7 Customer Support" },
];

function Stars({ rating, reviews }: { rating: number; reviews: number }) {
  return (
    <div className="flex items-center gap-1 text-xs text-coffee-500">
      <Star size={12} className="fill-amber-accent text-amber-accent" />
      <span className="font-semibold text-coffee-700">{rating.toFixed(1)}</span>
      <span className="text-coffee-400">({reviews})</span>
    </div>
  );
}

function ProductCard({ p }: { p: SampleProduct }) {
  return (
    <Link
      to="/products"
      className="group flex flex-col overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50 transition hover:-translate-y-0.5 hover:shadow-md"
    >
      <div className="aspect-square overflow-hidden bg-coffee-100">
        <img
          src={img(p.photo, 320, 320)}
          alt={p.name}
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
      </div>
      <div className="flex flex-1 flex-col p-3">
        <h4 className="line-clamp-1 text-sm font-semibold text-coffee-900">{p.name}</h4>
        <p className="mt-0.5 line-clamp-1 text-xs text-coffee-400">{p.sub}</p>
        <div className="mt-1.5">
          <Stars rating={p.rating} reviews={p.reviews} />
        </div>
        <div className="mt-2 flex items-end justify-between gap-2">
          <span className="min-w-0 truncate text-base font-bold text-coffee-900">
            {inr(p.price)}
            {p.unit && <span className="text-xs font-normal text-coffee-400"> {p.unit}</span>}
          </span>
          <span className="shrink-0 whitespace-nowrap rounded-full bg-amber-accent/15 px-2.5 py-1 text-[11px] font-semibold text-coffee-700 transition group-hover:bg-amber-accent group-hover:text-coffee-900">
            View
          </span>
        </div>
      </div>
    </Link>
  );
}

function CarouselSection({
  title,
  items,
  viewAll,
}: {
  title: string;
  items: SampleProduct[];
  viewAll: string;
}) {
  return (
    <section className="rounded-2xl border border-coffee-100 bg-cream-100/50 p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <h3 className="font-serif text-lg font-bold text-coffee-900">{title}</h3>
        <Link to={viewAll} className="flex items-center gap-1 text-xs font-semibold text-coffee-500 hover:text-coffee-800">
          View All <ArrowRight size={13} />
        </Link>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-3">
        {items.map((p) => (
          <ProductCard key={p.name} p={p} />
        ))}
      </div>
    </section>
  );
}

export default function Home() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
      {/* ===== Top row: sidebar · hero · rail ===== */}
      <div className="grid gap-5 lg:grid-cols-[220px_1fr] xl:grid-cols-[220px_1fr_300px]">
        {/* Category sidebar */}
        <aside className="hidden lg:block">
          <nav className="overflow-hidden rounded-2xl border border-coffee-100 bg-cream-50">
            {categories.map((c, i) => (
              <Link
                key={c.label}
                to={c.to}
                className={`flex items-center gap-3 px-4 py-2.5 text-sm text-coffee-700 transition hover:bg-coffee-100/70 hover:text-coffee-900 ${
                  i === 0 ? "bg-coffee-100/60 font-semibold" : ""
                }`}
              >
                <c.icon size={16} className="text-coffee-400" />
                {c.label}
              </Link>
            ))}
          </nav>

          <div className="mt-4 rounded-2xl border border-coffee-100 bg-cream-50 p-4">
            <p className="font-semibold text-coffee-900">Sell on Coffee Hub</p>
            <p className="mt-1 text-xs text-coffee-500">
              Reach thousands of coffee enthusiasts and businesses worldwide.
            </p>
            <Link
              to="/register?role=SELLER"
              className="mt-3 block rounded-full bg-coffee-800 px-4 py-2 text-center text-sm font-semibold text-cream-50 hover:bg-coffee-700"
            >
              Start Selling
            </Link>
          </div>

          <Link
            to="/products?type=BEAN"
            className="relative mt-4 block h-40 overflow-hidden rounded-2xl"
          >
            <img src={img(PHOTOS.beans, 400, 320)} alt="" className="h-full w-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-coffee-900/90 to-coffee-900/20" />
            <div className="absolute inset-x-0 bottom-0 p-4 text-cream-50">
              <p className="font-serif text-lg font-bold leading-tight">For Every Coffee Journey</p>
              <span className="mt-2 inline-block rounded-full bg-amber-accent px-3 py-1 text-xs font-semibold text-coffee-900">
                Explore Now
              </span>
            </div>
          </Link>
        </aside>

        {/* Hero — dark banner with the spinning 3D coffee drum */}
        <section className="relative flex min-h-[22rem] flex-col overflow-hidden rounded-2xl bg-coffee-900 text-cream-50">
          <div className="absolute inset-0">
            <img
              src={img(PHOTOS.beans, 1400)}
              alt=""
              className="h-full w-full object-cover opacity-45"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-coffee-900 via-coffee-900/70 to-coffee-900/25" />
            <div className="absolute inset-0 bg-gradient-to-t from-coffee-900/80 via-transparent to-transparent" />
          </div>

          <div className="relative flex flex-1 flex-col justify-center gap-6 p-8 sm:p-12 md:flex-row md:items-center">
            <div className="max-w-md">
              <motion.h1
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="font-serif text-4xl font-bold leading-tight sm:text-5xl"
              >
                Everything Coffee.
                <br />
                <span className="text-amber-accent">Everywhere.</span>
              </motion.h1>
              <p className="mt-4 max-w-sm text-sm text-cream-100/85 sm:text-base">
                The world&rsquo;s marketplace for coffee lovers, roasters, and businesses — from farm
                to cup.
              </p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  to="/products"
                  className="rounded-full bg-amber-accent px-6 py-3 text-sm font-semibold text-coffee-900 hover:bg-amber-accent/90"
                >
                  Shop Now
                </Link>
                <Link
                  to="/products?type=BEAN"
                  className="rounded-full border border-cream-100/40 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-white/10"
                >
                  Explore Green Coffee
                </Link>
              </div>
            </div>

            {/* 3D spinning coffee drum */}
            <div className="hidden aspect-square w-full max-w-[18rem] shrink-0 md:block">
              <ReactFiber />
            </div>
          </div>
        </section>

        {/* Right rail — stats · trust · newsletter */}
        <aside className="hidden xl:block">
          <div className="relative overflow-hidden rounded-2xl bg-coffee-800 p-5 text-cream-50">
            <img
              src={img(PHOTOS.cafeInterior, 400, 300)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="relative">
              <p className="text-sm font-semibold">Connecting Every Part of the Coffee World</p>
              <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                {stats.map((s) => (
                  <div key={s.label}>
                    <p className="font-serif text-xl font-bold text-amber-accent">{s.value}</p>
                    <p className="text-[11px] text-cream-100/80">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-2xl border border-coffee-100 bg-cream-50 p-4">
            {trustBadges.map((b, i) => (
              <div
                key={b.title}
                className={`flex items-center gap-3 py-2.5 ${i > 0 ? "border-t border-coffee-100" : ""}`}
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-accent/15">
                  <b.icon size={16} className="text-amber-accent" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-coffee-900">{b.title}</p>
                  <p className="text-xs text-coffee-400">{b.sub}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-2xl bg-coffee-900 p-5 text-cream-50">
            <p className="font-semibold">Stay in the Loop</p>
            <p className="mt-1 text-xs text-cream-100/80">
              Get the latest on coffee, deals and industry insights.
            </p>
            <form
              onSubmit={(e) => e.preventDefault()}
              className="mt-3 flex overflow-hidden rounded-full bg-cream-50"
            >
              <input
                type="email"
                required
                placeholder="Enter your email"
                className="min-w-0 flex-1 bg-transparent px-4 py-2 text-sm text-coffee-900 outline-none placeholder:text-coffee-400"
              />
              <button className="bg-amber-accent px-4 text-coffee-900" aria-label="Subscribe">
                <ArrowRight size={16} />
              </button>
            </form>
          </div>
        </aside>
      </div>

      {/* ===== Category chips ===== */}
      <div className="mt-6 grid grid-cols-4 gap-3 rounded-2xl border border-coffee-100 bg-cream-50 p-4 sm:grid-cols-8">
        {chips.map((c) => (
          <Link key={c.label} to={c.to} className="group flex flex-col items-center gap-2 text-center">
            <span className="h-14 w-14 overflow-hidden rounded-full border border-coffee-100 bg-coffee-100">
              <img
                src={img(c.photo, 120, 120)}
                alt=""
                className="h-full w-full object-cover transition duration-300 group-hover:scale-110"
              />
            </span>
            <span className="text-[11px] font-medium text-coffee-600 group-hover:text-coffee-900">
              {c.label}
            </span>
          </Link>
        ))}
      </div>

      {/* ===== Product carousels ===== */}
      <div className="mt-6 grid gap-5 lg:grid-cols-3">
        <CarouselSection title="Coffee Beans" items={coffeeBeans} viewAll="/products?type=BEAN" />
        <CarouselSection title="Green Coffee" items={greenCoffee} viewAll="/products?type=BEAN" />
        <CarouselSection title="Brewing Equipment" items={brewingEquipment} viewAll="/products?type=ACCESSORY" />
      </div>

      {/* ===== Promo banner cards ===== */}
      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {promos.map((p) => (
          <Link
            key={p.title}
            to={p.to}
            className="group relative flex h-44 flex-col justify-end overflow-hidden rounded-2xl p-5 text-cream-50"
          >
            <img
              src={img(p.photo, 500, 400)}
              alt=""
              className="absolute inset-0 h-full w-full object-cover transition duration-500 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-coffee-900/95 via-coffee-900/60 to-coffee-900/20" />
            <div className="relative">
              <p.icon size={22} className="text-amber-accent" />
              <h3 className="mt-2 font-serif text-lg font-bold">{p.title}</h3>
              <p className="text-xs text-cream-100/80">{p.sub}</p>
              <span className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-amber-accent">
                Explore Now <ArrowRight size={13} />
              </span>
            </div>
          </Link>
        ))}
      </div>

      {/* ===== Trust bar ===== */}
      <div className="mt-6 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 rounded-2xl border border-coffee-100 bg-cream-100/60 px-6 py-5">
        {trustBar.map((t) => (
          <div key={t.label} className="flex items-center gap-2 text-sm font-medium text-coffee-600">
            <t.icon size={18} className="text-amber-accent" />
            {t.label}
          </div>
        ))}
      </div>

      {/* ===== Global network CTA ===== */}
      <section className="mt-6 flex flex-col items-center gap-4 rounded-2xl bg-coffee-900 px-6 py-12 text-center text-cream-50 sm:flex-row sm:justify-between sm:text-left">
        <div className="flex items-center gap-4">
          <Globe size={40} className="shrink-0 text-amber-accent" />
          <div>
            <h2 className="font-serif text-2xl font-bold">Join the global coffee community</h2>
            <p className="mt-1 text-sm text-cream-100/80">
              It&rsquo;s free to join — buy, sell and discover coffee in under a minute.
            </p>
          </div>
        </div>
        <Link
          to="/register"
          className="shrink-0 rounded-full bg-amber-accent px-8 py-3 text-sm font-semibold text-coffee-900 hover:bg-amber-accent/90"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
