import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import * as authApi from "../api/auth";
import type { Admin } from "../api/auth";
import { clearStoredToken, getStoredToken, storeToken } from "../api/client";

type Status = "loading" | "signedOut" | "signedIn";

interface AdminAuthState {
  status: Status;
  admin: Admin | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
}

const AdminAuthContext = createContext<AdminAuthState | null>(null);

export function AdminAuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<Status>("loading");
  const [admin, setAdmin] = useState<Admin | null>(null);

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setStatus("signedOut");
      return;
    }
    authApi
      .getMe()
      .then((me) => {
        setAdmin(me);
        setStatus("signedIn");
      })
      .catch(() => {
        clearStoredToken();
        setStatus("signedOut");
      });
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const { accessToken, admin: loggedInAdmin } = await authApi.login(email, password);
    storeToken(accessToken);
    setAdmin(loggedInAdmin);
    setStatus("signedIn");
  }, []);

  const logout = useCallback(() => {
    clearStoredToken();
    setAdmin(null);
    setStatus("signedOut");
  }, []);

  return <AdminAuthContext.Provider value={{ status, admin, login, logout }}>{children}</AdminAuthContext.Provider>;
}

export function useAdminAuth(): AdminAuthState {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error("useAdminAuth must be used within AdminAuthProvider");
  return ctx;
}
