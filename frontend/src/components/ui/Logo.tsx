import { useBrand } from "../../context/BrandContext";

/** Official CoffeeHub Global wordmark. "light" is the cream/copper version for dark backgrounds. */
export default function Logo({ variant = "dark", className = "h-10" }: { variant?: "dark" | "light"; className?: string }) {
  const brand = useBrand();
  return (
    <img
      src={variant === "light" ? "/brand/logo-light.webp" : "/brand/logo.webp"}
      alt={brand.name}
      width={670}
      height={160}
      decoding="async"
      className={`w-auto ${className}`}
    />
  );
}
