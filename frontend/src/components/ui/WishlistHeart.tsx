import { Heart } from "lucide-react";
import type { MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { useWishlist } from "../../context/WishlistContext";
import { useToast } from "../../context/ToastContext";

export default function WishlistHeart({
  type,
  id,
  className = "",
}: {
  type: "product" | "cafe";
  id: number;
  className?: string;
}) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { productIds, cafeIds, toggleProduct, toggleCafe } = useWishlist();

  const active = type === "product" ? productIds.has(id) : cafeIds.has(id);

  async function handleClick(e: MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!user) {
      navigate("/login");
      return;
    }
    if (user.role !== "CUSTOMER") {
      showToast("Only customer accounts have a wishlist", "info");
      return;
    }
    const wishlisted = type === "product" ? await toggleProduct(id) : await toggleCafe(id);
    showToast(wishlisted ? "Added to wishlist" : "Removed from wishlist", "info");
  }

  return (
    <button
      onClick={handleClick}
      aria-label={active ? "Remove from wishlist" : "Add to wishlist"}
      className={`flex h-9 w-9 items-center justify-center rounded-full bg-cream-50/90 shadow transition hover:scale-105 ${className}`}
    >
      <Heart size={18} className={active ? "fill-red-500 text-red-500" : "text-coffee-400"} />
    </button>
  );
}
