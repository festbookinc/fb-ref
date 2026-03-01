"use client";

import { createContext, useContext, useState, useCallback } from "react";

type RefreshFn = () => void;

const RefreshContext = createContext<{ refresh: RefreshFn; registerRefresh: (fn: RefreshFn) => void } | null>(null);

export function RefreshProvider({ children }: { children: React.ReactNode }) {
  const [refreshFn, setRefreshFn] = useState<RefreshFn | null>(null);

  const registerRefresh = useCallback((fn: RefreshFn) => {
    setRefreshFn(() => fn);
  }, []);

  const refresh = useCallback(() => {
    refreshFn?.();
  }, [refreshFn]);

  return (
    <RefreshContext.Provider value={{ refresh, registerRefresh }}>
      {children}
    </RefreshContext.Provider>
  );
}

export function useRefresh() {
  const ctx = useContext(RefreshContext);
  return ctx;
}
