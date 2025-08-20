import { createContext, useContext, useState } from "react";
import type { ReactNode } from "react";
import type { User } from "../types";

type AuthContextType = {
  user: User | null;
  login: (u: Pick<User, "name" | "email">) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);

  const login = (u: Pick<User, "name" | "email">) => {
    setUser({ id: 1, name: u.name, email: u.email });
    // 토큰 저장 등은 실제 로직에서 처리
  };

  const logout = () => {
    setUser(null);
    // 토큰 삭제 등은 실제 로직에서 처리
  };

  return (
    <AuthContext.Provider value={{ user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
