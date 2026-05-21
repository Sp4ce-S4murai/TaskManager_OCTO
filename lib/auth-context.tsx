"use client";

import { createContext, useContext } from "react";
import type { User } from "firebase/auth";

interface AuthContextType {
  user: User | null;
  logout: () => Promise<void>;
}

export const AuthContext = createContext<AuthContextType>({
  user: null,
  logout: async () => {}
});

export function useAuth() {
  return useContext(AuthContext);
}
