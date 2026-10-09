import { label } from "../../lib/format";

const amber = "bg-amber-100 text-amber-800";
const blue = "bg-blue-100 text-blue-800";
const indigo = "bg-indigo-100 text-indigo-800";
const green = "bg-green-100 text-green-800";
const red = "bg-red-100 text-red-800";
const grey = "bg-coffee-100 text-coffee-700";

// One map for every status enum in the app; unknown values fall back to neutral.
const styles: Record<string, string> = {
  // orders
  PLACED: amber,
  PENDING: amber,
  PAYMENT_CONFIRMED: blue,
  CONFIRMED: blue,
  ACCEPTED: blue,
  PROCESSING: indigo,
  READY_TO_SHIP: indigo,
  SHIPPED: indigo,
  DELIVERED: green,
  COMPLETED: green,
  CANCELLED: red,
  REFUND_REQUESTED: amber,
  REFUNDED: grey,
  DISPUTED: red,
  // payments & settlements
  PAID: green,
  FAILED: red,
  PARTIALLY_REFUNDED: amber,
  ELIGIBLE: blue,
  ON_HOLD: amber,
  SETTLED: green,
  // vendors, products, documents
  DRAFT: grey,
  PENDING_VERIFICATION: amber,
  UNDER_REVIEW: blue,
  APPROVED: green,
  VERIFIED: green,
  REJECTED: red,
  SUSPENDED: red,
  OUT_OF_STOCK: amber,
  // rfq & quotes
  SUBMITTED: amber,
  OPEN: blue,
  AWARDED: green,
  WITHDRAWN: grey,
  INVITED: amber,
  QUOTED: green,
  DECLINED: grey,
  // disputes
  VENDOR_RESPONDED: blue,
  RESOLVED_REFUND: green,
  RESOLVED_NO_REFUND: grey,
  // legacy lowercase tones
  approved: green,
  pending: amber,
};

/** Pass a status enum as children (it is humanised) or a `tone` to colour arbitrary text. */
export default function Badge({ children, tone }: { children: string; tone?: string }) {
  const cls = styles[tone ?? children] ?? grey;
  const text = /^[A-Z_]+$/.test(children) ? label(children) : children;
  return (
    <span className={`inline-flex items-center whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${cls}`}>
      {text}
    </span>
  );
}
