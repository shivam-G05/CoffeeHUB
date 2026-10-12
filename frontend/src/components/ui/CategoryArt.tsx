import { Bean, Box, Coffee, CupSoda, Factory, Filter, Flame, Gauge, Package, Sprout, Store, Tag, Wrench, Zap, type LucideIcon } from "lucide-react";
import { Img } from "./Common";

/** Icon per category, matched on slug keywords so renamed or new categories still get a sensible one. */
const ICONS: [RegExp, LucideIcon][] = [
  [/green/, Sprout],
  [/roast/, Flame],
  [/instant/, Zap],
  [/espresso|machine/, Gauge],
  [/grinder/, Wrench],
  [/brewer|french|pour|brewing/, CupSoda],
  [/filter/, Filter],
  [/tamper|accessor/, Wrench],
  [/vending/, Store],
  [/packag/, Package],
  [/private|label/, Tag],
  [/contract|manufactur/, Factory],
  [/business|supplies/, Box],
  [/equipment/, Gauge],
  [/coffee|bean/, Bean],
];

const BACKGROUNDS = [
  "from-coffee-700 to-coffee-900",
  "from-coffee-500 to-coffee-700",
  "from-amber-accent to-coffee-600",
  "from-coffee-600 to-coffee-800",
];

/** Category photo when the admin has uploaded one; otherwise a branded icon tile instead of a "No image" box. */
export default function CategoryArt({ slug, imageUrl, className = "" }: { slug: string; imageUrl?: string | null; className?: string }) {
  if (imageUrl) {
    return <Img src={imageUrl} alt="" className={className} />;
  }
  const Icon = ICONS.find(([pattern]) => pattern.test(slug))?.[1] ?? Coffee;
  const background = BACKGROUNDS[[...slug].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % BACKGROUNDS.length];
  return (
    <div className={`flex items-center justify-center bg-gradient-to-br ${background} ${className}`} aria-hidden="true">
      <Icon size={40} strokeWidth={1.5} className="text-cream-100" />
    </div>
  );
}
