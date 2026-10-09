import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { api, apiErrorMessage, track } from "../api/client";
import { useAuth } from "./AuthContext";
import type { Cart } from "../types";

interface CartContextValue {
  cart: Cart | null;
  itemCount: number;
  refresh: () => Promise<void>;
  /** Throws an Error with a user-facing message when the product can't be added. */
  add: (productId: number, quantity: number) => Promise<void>;
  setQuantity: (itemId: number, quantity: number) => Promise<void>;
  remove: (itemId: number) => Promise<void>;
}

const CartContext = createContext<CartContextValue | undefined>(undefined);

/** The cart lives on the server and only exists for buyer (CUSTOMER) accounts. */
export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const isBuyer = user?.role === "CUSTOMER";

  const refresh = useCallback(async () => {
    if (!isBuyer) {
      setCart(null);
      return;
    }
    try {
      const res = await api.get<Cart>("/api/cart");
      setCart(res.data);
    } catch {
      setCart(null);
    }
  }, [isBuyer]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  async function run(request: Promise<{ data: Cart }>, fallback: string) {
    try {
      setCart((await request).data);
    } catch (error) {
      throw new Error(apiErrorMessage(error, fallback));
    }
  }

  async function add(productId: number, quantity: number) {
    await run(api.post<Cart>("/api/cart/items", { productId, quantity }), "Could not add to cart");
    track("add_to_cart", productId);
  }

  async function setQuantity(itemId: number, quantity: number) {
    await run(api.put<Cart>(`/api/cart/items/${itemId}`, { quantity }), "Could not update quantity");
  }

  async function remove(itemId: number) {
    await run(api.delete<Cart>(`/api/cart/items/${itemId}`), "Could not remove item");
  }

  return (
    <CartContext.Provider value={{ cart, itemCount: cart?.itemCount ?? 0, refresh, add, setQuantity, remove }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
