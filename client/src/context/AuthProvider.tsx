import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { OpenAPI } from "../api/core/OpenAPI";

type AuthContextValue = {
  token: string | null;
  isAdmin: boolean;
  email: string | null;
  setToken: (token: string | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue>({
  token: null,
  isAdmin: false,
  email: null,
  setToken: () => {},
  logout: () => {},
});

function decodeJwt(token: string): { [key: string]: any } | null {
  try {
    const [, payload] = token.split(".");
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [token, setTokenState] = useState<string | null>(() => localStorage.getItem("jwtToken"));

  const setToken = useCallback((t: string | null) => {
    setTokenState(t);
    if (t) {
      localStorage.setItem("jwtToken", t);
      OpenAPI.HEADERS = { Authorization: `Bearer ${t}` };
    } else {
      localStorage.removeItem("jwtToken");
      OpenAPI.HEADERS = undefined as any;
    }
  }, []);

  useEffect(() => {
    if (token) {
      OpenAPI.HEADERS = { Authorization: `Bearer ${token}` };
    }
  }, [token]);

  const claims = useMemo(() => (token ? decodeJwt(token) : null), [token]);
  const roles: string[] = useMemo(() => {
    if (!claims) return [];
    const collected: string[] = [];
    const pushVals = (val: any) => {
      if (!val) return;
      if (Array.isArray(val)) collected.push(...val.map(String));
      else collected.push(String(val));
    };
    pushVals(claims["role"]);
    pushVals(claims["roles"]);
    pushVals(claims["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"]);
    // Keycloak-like structure support
    try { pushVals((claims["realm_access"]?.roles)); } catch {}
    return collected.map(r => r.trim());
  }, [claims]);
  const isAdmin = roles.some(r => r.toLowerCase() === "admin");
  const email = (claims?.email as string) || null;

  const logout = useCallback(() => {
    setToken(null);
  }, [setToken]);

  const value = useMemo<AuthContextValue>(() => ({ token, isAdmin, email, setToken, logout }), [token, isAdmin, email, setToken, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => useContext(AuthContext);


