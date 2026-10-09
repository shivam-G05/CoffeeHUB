export function money(value: number | null | undefined): string {
  return `₹${(value ?? 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export function formatDateTime(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** PENDING_VERIFICATION -> "Pending verification". */
export function label(value?: string | null): string {
  if (!value) return "";
  const text = value.replace(/_/g, " ").toLowerCase();
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** "City, State" from whichever parts exist. */
export function place(city?: string | null, state?: string | null): string {
  return [city, state].filter(Boolean).join(", ");
}
