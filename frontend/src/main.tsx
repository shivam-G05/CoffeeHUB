import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.css";
import App from "./App.tsx";
import { AuthProvider } from "./context/AuthContext.tsx";
import { BrandProvider } from "./context/BrandContext.tsx";
import { CartProvider } from "./context/CartContext.tsx";
import { ToastProvider } from "./context/ToastContext.tsx";
import { WishlistProvider } from "./context/WishlistContext.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ToastProvider>
        <BrandProvider>
          <AuthProvider>
            <WishlistProvider>
              <CartProvider>
                <App />
              </CartProvider>
            </WishlistProvider>
          </AuthProvider>
        </BrandProvider>
      </ToastProvider>
    </BrowserRouter>
  </StrictMode>
);
