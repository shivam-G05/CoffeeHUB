import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import ReactFiber from "../../components/layout/ReactFiber"
import {
  BadgeCheck,
  CalendarClock,
  Coffee,
  Cog,
  Gift,
  MapPin,
  Recycle,
  ScanSearch,
  ShieldCheck,
  Sparkles,
  Star,
  Truck,
  UserPlus,
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

const liveFeatures = [
  { icon: MapPin, title: "Discover cafés", desc: "Explore cafés near you and reserve a table.", photo: PHOTOS.cafeInterior },
  { icon: Coffee, title: "Buy coffee beans", desc: "Order beans from roasters across India.", photo: PHOTOS.beans },
  { icon: Cog, title: "Buy coffee machines", desc: "Browse and buy espresso machines & accessories.", photo: PHOTOS.machine },
  { icon: ScanSearch, title: "Compare & review", desc: "Side-by-side comparisons and real buyer reviews.", photo: PHOTOS.pouring },
];

const soonFeatures = [
  { icon: Recycle, title: "Sell used machines", desc: "List a second-hand machine and find a buyer." },
  { icon: Truck, title: "Distributors & roasters", desc: "Connect with wholesale suppliers and importers." },
];

const trustPoints = [
  { icon: ShieldCheck, label: "Admin-verified sellers & cafés" },
  { icon: Star, label: "Real reviews & ratings" },
  { icon: Gift, label: "Loyalty points on every order" },
  { icon: BadgeCheck, label: "Built on a secure, modern stack" },
];

const steps = [
  { icon: UserPlus, title: "Create your free account", desc: "Sign up in under a minute as a coffee lover, seller, or café owner." },
  { icon: Coffee, title: "Discover or list", desc: "Order beans & machines, reserve a café table, or list your own products." },
  { icon: Sparkles, title: "Earn as you go", desc: "Collect loyalty points, leave reviews, and invite friends for bonus rewards." },
];

const roleCards = [
  {
    role: "CUSTOMER" as const,
    title: "I'm a Coffee Lover",
    desc: "Browse cafés, order beans & machines, and track your orders.",
    cta: "Join as Customer",
  },
  {
    role: "SELLER" as const,
    title: "I sell Machines or Beans",
    desc: "List products, manage stock and pricing, fulfill orders.",
    cta: "Join as Seller",
  },
  {
    role: "CAFE_OWNER" as const,
    title: "I run a Café",
    desc: "List your café, take table reservations, and grow your business.",
    cta: "Join as Café Owner",
  },
];

const galleryPhotos = [
  { photo: PHOTOS.flatlay, alt: "Coffee cup surrounded by roasted beans" },
  { photo: PHOTOS.iced, alt: "Iced coffee on a stone counter" },
  { photo: PHOTOS.counter, alt: "Café counter with bags of coffee beans" },
  { photo: PHOTOS.cafeInterior, alt: "Cozy café interior" },
];

export default function Home() {
  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden text-cream-50">
        <div className="absolute inset-0">
          <img
            src={img(PHOTOS.hero, 1920)}
            alt="Latte art coffee cup on a dark background"
            className="h-full w-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-coffee-900/90 via-coffee-900/75 to-coffee-900/95" />
        </div>

        <div className="relative mx-auto max-w-6xl px-6 py-28 text-center sm:py-32">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-semibold uppercase tracking-[0.3em] text-amber-accent"
          >
            India&rsquo;s Coffee Ecosystem Platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 font-serif text-4xl font-bold leading-tight sm:text-5xl md:text-6xl"
          >
            Savor the perfect brew,
            <br className="hidden sm:block" /> every single order.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-cream-100/90"
          >
            Discover cafés, buy beans &amp; machines, connect with roasters, and grow your coffee
            business — all in one elegant platform.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="rounded-full bg-amber-accent px-6 py-3 text-sm font-semibold text-coffee-900 hover:bg-amber-accent/90"
            >
              Get Started Free
            </Link>
            <Link
              to="/products"
              className="rounded-full border border-cream-100/40 px-6 py-3 text-sm font-semibold text-cream-50 hover:bg-white/10"
            >
              Browse Beans &amp; Machines
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Live features — elegant photo badges */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-serif text-3xl font-bold text-coffee-900">Everything coffee, in one place</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-coffee-500">
          CoffeeHub India works like a mix of a food discovery app, a B2B marketplace, and an
          online store — built specifically for coffee.
        </p>

        <div className="mt-14 grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-4">
          {liveFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.06 }}
              className="flex flex-col items-center text-center"
            >
              <div className="relative h-28 w-28">
                <img
                  src={img(f.photo, 240, 240)}
                  alt=""
                  className="h-28 w-28 rounded-full border-4 border-cream-50 object-cover shadow-md"
                />
                <div className="absolute -bottom-1 -right-1 flex h-9 w-9 items-center justify-center rounded-full bg-coffee-800 text-cream-50 shadow">
                  <f.icon size={16} />
                </div>
              </div>
              <h3 className="mt-5 font-semibold text-coffee-900">{f.title}</h3>
              <p className="mt-1 text-sm text-coffee-500">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-4">
          {soonFeatures.map((f) => (
            <div
              key={f.title}
              className="flex items-center gap-3 rounded-full border border-dashed border-coffee-200 bg-cream-50 px-5 py-2.5"
            >
              <f.icon size={16} className="text-coffee-400" />
              <span className="text-sm text-coffee-500">{f.title}</span>
              <span className="rounded-full bg-coffee-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-coffee-500">
                Soon
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* Why choose us — split photo panel */}
      <section className="bg-coffee-900">
        <div className="mx-auto grid max-w-6xl items-stretch gap-0 sm:grid-cols-2">
          <div className="relative min-h-[22rem]">
            <img
              src={img(PHOTOS.pouring, 900, 900)}
              alt="Barista pouring latte art into a coffee cup"
              className="absolute inset-0 h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col justify-center px-8 py-16 text-cream-50 sm:px-14">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-amber-accent">Why CoffeeHub</p>
            <h2 className="mt-3 font-serif text-3xl font-bold">Crafted for coffee people, not just marketplaces</h2>
            <p className="mt-4 text-coffee-200">
              Every seller and café on CoffeeHub is admin-verified before going live. Every order
              earns loyalty points. Every review comes from a real buyer.
            </p>
            <ul className="mt-6 space-y-3">
              {trustPoints.map((t) => (
                <li key={t.label} className="flex items-center gap-3 text-sm text-cream-100">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-accent/15">
                    <t.icon size={15} className="text-amber-accent" />
                  </span>
                  {t.label}
                </li>
              ))}
            </ul>
            <Link
              to="/register"
              className="mt-8 inline-block w-fit rounded-full bg-amber-accent px-6 py-3 text-sm font-semibold text-coffee-900 hover:bg-amber-accent/90"
            >
              Join CoffeeHub
            </Link>
          </div>
        </div>
      </section>

      {/* Gallery */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-serif text-3xl font-bold text-coffee-900">The coffee ritual</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-coffee-500">
          From the first roast to the last sip — a platform built around the moments coffee
          creates.
        </p>
        <div className="mt-12 flex justify-center">
            {/* {galleryPhotos.map((g, i) => (
              <motion.div
                key={g.photo}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.06 }}
                className="aspect-[3/4] overflow-hidden rounded-2xl"
              >
                <img
                  src={img(g.photo, 500, 650)}
                  alt={g.alt}
                  className="h-full w-full object-cover transition duration-500 hover:scale-105"
                />
              </motion.div>
            ))} */}
            <div className="aspect-square w-full max-w-md overflow-hidden rounded-2xl">
              <ReactFiber />
            </div>
        </div>
      </section>

      {/* How it works */}
      <section className="bg-coffee-100/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center font-serif text-3xl font-bold text-coffee-900">How it works</h2>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {steps.map((s, i) => (
              <motion.div
                key={s.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
                className="relative rounded-2xl bg-cream-50 p-6 text-center shadow-sm"
              >
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-coffee-800 text-cream-50">
                  <s.icon size={22} />
                </div>
                <p className="mt-4 text-xs font-bold uppercase tracking-wide text-coffee-400">Step {i + 1}</p>
                <h3 className="mt-1 font-semibold text-coffee-900">{s.title}</h3>
                <p className="mt-2 text-sm text-coffee-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Built for every role */}
      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center font-serif text-3xl font-bold text-coffee-900">Built for every role</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-coffee-500">
          Whether you drink coffee, sell it, or serve it — CoffeeHub has a dashboard for you.
        </p>
        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {roleCards.map((r) => (
            <div key={r.role} className="rounded-2xl border border-coffee-100 bg-cream-50 p-6 shadow-sm transition hover:shadow-md">
              <h3 className="text-lg font-semibold text-coffee-900">{r.title}</h3>
              <p className="mt-2 text-sm text-coffee-500">{r.desc}</p>
              <Link
                to={`/register?role=${r.role}`}
                className="mt-5 inline-block rounded-full bg-coffee-800 px-4 py-2 text-sm font-semibold text-cream-50 hover:bg-coffee-700"
              >
                {r.cta}
              </Link>
            </div>
          ))}
        </div>
      </section>

      {/* Pro membership teaser — photo banner */}
      <section className="relative mx-auto max-w-6xl overflow-hidden rounded-3xl px-0 py-0 sm:mx-6 sm:my-16 lg:mx-auto">
        <div className="relative">
          <img
            src={img(PHOTOS.groupTable, 1600, 700)}
            alt="Friends sharing coffee at a table"
            className="h-72 w-full object-cover sm:h-80"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-coffee-900/95 via-coffee-900/80 to-coffee-900/40" />
          <div className="absolute inset-0 flex items-center">
            <div className="max-w-lg px-8 text-cream-50 sm:px-14">
              <p className="inline-block rounded-full bg-amber-accent/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-accent">
                Coming soon
              </p>
              <h3 className="mt-3 flex items-center gap-2 font-serif text-2xl font-bold sm:text-3xl">
                <CalendarClock size={26} className="text-amber-accent" />
                CoffeeHub Pro Membership
              </h3>
              <p className="mt-2 text-sm text-coffee-200 sm:text-base">
                Priority deals, faster delivery, exclusive offers and premium machine demos — for
                members who live and breathe coffee.
              </p>
              <Link
                to="/register"
                className="mt-6 inline-block rounded-full bg-cream-50 px-5 py-2.5 text-sm font-semibold text-coffee-900 hover:bg-cream-200"
              >
                Get early access
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="font-serif text-3xl font-bold text-coffee-900">Ready to join the coffee ecosystem?</h2>
        <p className="mx-auto mt-3 max-w-xl text-coffee-500">
          It&rsquo;s free to join. Set up your account in under a minute.
        </p>
        <Link
          to="/register"
          className="mt-8 inline-block rounded-full bg-coffee-800 px-8 py-3 text-sm font-semibold text-cream-50 hover:bg-coffee-700"
        >
          Get Started Free
        </Link>
      </section>
    </div>
  );
}
