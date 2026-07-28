import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api } from "../api/client";
import { useAuth } from "./AuthContext";
import type { Wishlist } from "../types";

interface WishlistContextValue {
  productIds: Set<number>;
  cafeIds: Set<number>;
  toggleProduct: (id: number) => Promise<boolean>;
  toggleCafe: (id: number) => Promise<boolean>;
  refresh: () => void;
}

const WishlistContext = createContext<WishlistContextValue | undefined>(undefined);

export function WishlistProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [productIds, setProductIds] = useState<Set<number>>(new Set());
  const [cafeIds, setCafeIds] = useState<Set<number>>(new Set());

  const load = useCallback(() => {
    if (user?.role !== "CUSTOMER") {
      setProductIds(new Set());
      setCafeIds(new Set());
      return;
    }
    api.get<Wishlist>("/api/wishlist/mine").then((res) => {
      setProductIds(new Set(res.data.products.map((p) => p.id)));
      setCafeIds(new Set(res.data.cafes.map((c) => c.id)));
    });
  }, [user?.role]);

  useEffect(load, [load]);

  async function toggleProduct(id: number) {
    const res = await api.post<{ wishlisted: boolean }>(`/api/wishlist/products/${id}/toggle`);
    setProductIds((prev) => {
      const next = new Set(prev);
      if (res.data.wishlisted) next.add(id);
      else next.delete(id);
      return next;
    });
    return res.data.wishlisted;
  }

  async function toggleCafe(id: number) {
    const res = await api.post<{ wishlisted: boolean }>(`/api/wishlist/cafes/${id}/toggle`);
    setCafeIds((prev) => {
      const next = new Set(prev);
      if (res.data.wishlisted) next.add(id);
      else next.delete(id);
      return next;
    });
    return res.data.wishlisted;
  }

  return (
    <WishlistContext.Provider value={{ productIds, cafeIds, toggleProduct, toggleCafe, refresh: load }}>
      {children}
    </WishlistContext.Provider>
  );
}

export function useWishlist() {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error("useWishlist must be used within WishlistProvider");
  return ctx;
}
