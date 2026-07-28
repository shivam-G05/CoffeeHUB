import type { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

const variants: Record<Variant, string> = {
  primary: "bg-coffee-800 text-cream-50 hover:bg-coffee-700",
  secondary: "bg-coffee-100 text-coffee-800 hover:bg-coffee-200",
  danger: "bg-red-600 text-white hover:bg-red-700",
  ghost: "bg-transparent text-coffee-700 hover:bg-coffee-100",
};

export default function Button({
  variant = "primary",
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${className}`}
      {...props}
    />
  );
}
