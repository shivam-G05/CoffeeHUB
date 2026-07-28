import { motion } from "framer-motion";
import { Link } from "react-router-dom";
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

const discoverFeatures = [
  { icon: MapPin, title: "Discover cafés nearby", desc: "Find and explore cafés around you, view details, and reserve a table.", live: true },
  { icon: Coffee, title: "Buy coffee beans", desc: "Order beans directly from roasters and sellers across India.", live: true },
  { icon: Cog, title: "Buy coffee machines", desc: "Browse, compare, and buy espresso machines and accessories.", live: true },
  { icon: ScanSearch, title: "Compare & review machines", desc: "Side-by-side comparisons plus real buyer reviews and ratings.", live: true },
  { icon: Recycle, title: "Sell used machines", desc: "List a second-hand machine and find a verified buyer.", live: false },
  { icon: Truck, title: "Distributors & roasters", desc: "Connect with wholesale suppliers, importers, and roasters.", live: false },
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

export default function Home() {
  return (
    <div>
      <section className="relative overflow-hidden bg-gradient-to-b from-coffee-900 via-coffee-800 to-coffee-700 text-cream-50">
        <div className="mx-auto max-w-6xl px-6 py-24 text-center">
          <motion.p
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-semibold uppercase tracking-[0.3em] text-coffee-200"
          >
            India&rsquo;s Coffee Ecosystem Platform
          </motion.p>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-4 text-4xl font-extrabold leading-tight sm:text-5xl md:text-6xl"
          >
            Not just a marketplace.
            <br className="hidden sm:block" /> A complete coffee ecosystem.
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mx-auto mt-6 max-w-2xl text-lg text-coffee-100"
          >
            Discover cafés, buy beans &amp; machines, connect with roasters, and grow your coffee
            business — all in one platform.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="mt-10 flex flex-wrap items-center justify-center gap-4"
          >
            <Link
              to="/register"
              className="rounded-full bg-cream-50 px-6 py-3 text-sm font-semibold text-coffee-900 hover:bg-cream-200"
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

        <div className="border-t border-cream-50/10 bg-black/10">
          <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-center gap-x-10 gap-y-4 px-6 py-6">
            {trustPoints.map((t) => (
              <div key={t.label} className="flex items-center gap-2 text-sm font-medium text-coffee-100">
                <t.icon size={16} className="text-amber-accent" />
                {t.label}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-coffee-900">Everything coffee, in one place</h2>
        <p className="mx-auto mt-3 max-w-xl text-center text-coffee-500">
          CoffeeHub India works like a mix of a food discovery app, a B2B marketplace, and an
          online store — built specifically for coffee.
        </p>
        <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {discoverFeatures.map((f, i) => (
            <motion.div
              key={f.title}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.05 }}
              className="relative rounded-2xl border border-coffee-100 bg-cream-50 p-6 shadow-sm"
            >
              {!f.live && (
                <span className="absolute right-4 top-4 rounded-full bg-coffee-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-coffee-500">
                  Coming soon
                </span>
              )}
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-coffee-100">
                <f.icon size={22} className="text-coffee-600" />
              </div>
              <h3 className="mt-4 font-semibold text-coffee-900">{f.title}</h3>
              <p className="mt-1 text-sm text-coffee-500">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </section>

      <section className="bg-coffee-100/60 py-20">
        <div className="mx-auto max-w-6xl px-6">
          <h2 className="text-center text-3xl font-bold text-coffee-900">How it works</h2>
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

      <section className="mx-auto max-w-6xl px-6 py-20">
        <h2 className="text-center text-3xl font-bold text-coffee-900">Built for every role</h2>
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

      <section className="bg-coffee-100/60 py-16">
        <div className="mx-auto max-w-4xl px-6">
          <div className="flex flex-col items-center gap-4 rounded-3xl bg-gradient-to-br from-coffee-800 to-coffee-900 p-10 text-center text-cream-50 sm:flex-row sm:text-left">
            <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-amber-accent/20">
              <CalendarClock size={28} className="text-amber-accent" />
            </div>
            <div className="flex-1">
              <p className="inline-block rounded-full bg-amber-accent/20 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-amber-accent">
                Coming soon
              </p>
              <h3 className="mt-2 text-xl font-bold">CoffeeHub Pro Membership</h3>
              <p className="mt-1 text-sm text-coffee-200">
                Priority deals, faster delivery, exclusive offers and premium machine demos — for
                members who live and breathe coffee.
              </p>
            </div>
            <Link
              to="/register"
              className="shrink-0 rounded-full bg-cream-50 px-5 py-2.5 text-sm font-semibold text-coffee-900 hover:bg-cream-200"
            >
              Get early access
            </Link>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl font-bold text-coffee-900">Ready to join the coffee ecosystem?</h2>
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
