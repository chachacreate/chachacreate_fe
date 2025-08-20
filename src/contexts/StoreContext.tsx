import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { Store } from "../types";

type StoreContextType = {
  store: Store | null;
  setStore: (s: Store | null) => void;
};

const StoreContext = createContext<StoreContextType | null>(null);

export const StoreProvider = ({ children }: { children: ReactNode }) => {
  const [store, setStore] = useState<Store | null>(null);
  return (
    <StoreContext.Provider value={{ store, setStore }}>
      {children}
    </StoreContext.Provider>
  );
};

export const useStoreCtx = () => {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error("useStoreCtx must be used within StoreProvider");
  return ctx;
};
