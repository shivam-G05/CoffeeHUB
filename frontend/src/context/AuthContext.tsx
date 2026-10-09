import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, apiErrorMessage, track } from "../api/client";
import type { User, VendorType } from "../types";

export interface BuyerRegistration {
  name: string;
  email: string;
  phone: string;
  password: string;
  companyName?: string;
  gstNumber?: string;
  businessType?: string;
  referralCode?: string;
}

export interface SellerRegistration {
  businessName: string;
  contactPerson: string;
  email: string;
  phone: string;
  password: string;
  vendorType: VendorType;
  website?: string;
  addressLine: string;
  city: string;
  state: string;
  pin: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  /** identifier is an email address or a mobile number. */
  login: (identifier: string, password: string) => Promise<User>;
  registerBuyer: (payload: BuyerRegistration) => Promise<User>;
  registerSeller: (payload: SellerRegistration) => Promise<User>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const TOKEN_KEY = "coffeehub_token";
const USER_KEY = "coffeehub_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
      setLoading(false);
      return;
    }
    api
      .get<User>("/api/users/me")
      .then((res) => {
        setUser(res.data);
        localStorage.setItem(USER_KEY, JSON.stringify(res.data));
      })
      .catch(() => {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(USER_KEY);
        setUser(null);
      })
      .finally(() => setLoading(false));
  }, []);

  function persistSession(token: string, nextUser: User) {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(nextUser));
    setUser(nextUser);
  }

  async function login(identifier: string, password: string) {
    try {
      const res = await api.post("/api/auth/login", { identifier, password });
      persistSession(res.data.token, res.data.user);
      return res.data.user as User;
    } catch (error) {
      throw new Error(apiErrorMessage(error, "Login failed"));
    }
  }

  async function registerBuyer(payload: BuyerRegistration) {
    try {
      const res = await api.post("/api/auth/register", payload);
      persistSession(res.data.token, res.data.user);
      track("signup_completed", "buyer");
      return res.data.user as User;
    } catch (error) {
      throw new Error(apiErrorMessage(error, "Registration failed"));
    }
  }

  async function registerSeller(payload: SellerRegistration) {
    try {
      const res = await api.post("/api/auth/register-seller", payload);
      persistSession(res.data.token, res.data.user);
      track("vendor_registration");
      return res.data.user as User;
    } catch (error) {
      throw new Error(apiErrorMessage(error, "Registration failed"));
    }
  }

  function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setUser(null);
  }

  async function refreshUser() {
    const res = await api.get<User>("/api/users/me");
    setUser(res.data);
    localStorage.setItem(USER_KEY, JSON.stringify(res.data));
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, registerBuyer, registerSeller, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
