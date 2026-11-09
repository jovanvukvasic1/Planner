import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { ApiError, api, getToken, setToken, setUnauthorizedHandler } from "./api";
import type { User } from "./types";

interface AuthState {
  user: User | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<void>;
  register: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const logout = useCallback(() => {
    setToken(null);
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(logout);
    if (!getToken()) {
      setLoading(false);
      return;
    }
    api.auth
      .me()
      .then(setUser)
      .catch((err) => {
        // Token brisemo samo ako ga server odbije (ne kad nema mreze).
        if (err instanceof ApiError && err.status === 401) setToken(null);
      })
      .finally(() => setLoading(false));
  }, [logout]);

  const login = async (username: string, password: string) => {
    const res = await api.auth.login(username, password);
    setToken(res.token);
    setUser(res.user);
  };

  const register = async (username: string, password: string) => {
    const res = await api.auth.register(username, password);
    setToken(res.token);
    setUser(res.user);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>{children}</AuthContext.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth mora biti unutar AuthProvider");
  return ctx;
}
