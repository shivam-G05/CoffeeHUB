import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, apiErrorMessage } from "../api/client";
import type { Role, User } from "../types";

interface RegisterPayload {
  name: string;
  email: string;
  password: string;
  phone?: string;
  role: Role;
  referralCode?: string;
}

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<User>;
  register: (payload: RegisterPayload) => Promise<User>;
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

  async function login(email: string, password: string) {
    try {
      const res = await api.post("/api/auth/login", { email, password });
      persistSession(res.data.token, res.data.user);
      return res.data.user as User;
    } catch (error) {
      throw new Error(apiErrorMessage(error, "Login failed"));
    }
  }

  async function register(payload: RegisterPayload) {
    try {
      const res = await api.post("/api/auth/register", payload);
      persistSession(res.data.token, res.data.user);
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
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
