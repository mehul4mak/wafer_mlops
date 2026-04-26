import { create } from "zustand";
import { persist } from "zustand/middleware";
import { Profile, TokenResponse } from "@/types";
import { authApi } from "@/lib/api";

interface AuthState {
  user: Profile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => void;
  fetchProfile: () => Promise<void>;
  setTokens: (tokens: TokenResponse) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,

      setTokens: (tokens: TokenResponse) => {
        localStorage.setItem("access_token", tokens.access_token);
        localStorage.setItem("refresh_token", tokens.refresh_token);
        set({ accessToken: tokens.access_token, refreshToken: tokens.refresh_token });
      },

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const tokens: TokenResponse = await authApi.login({ email, password });
          get().setTokens(tokens);
          await get().fetchProfile();
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (email, password, fullName) => {
        set({ isLoading: true });
        try {
          const tokens: TokenResponse = await authApi.register({ email, password, full_name: fullName });
          get().setTokens(tokens);
          await get().fetchProfile();
        } finally {
          set({ isLoading: false });
        }
      },

      logout: () => {
        localStorage.removeItem("access_token");
        localStorage.removeItem("refresh_token");
        set({ user: null, accessToken: null, refreshToken: null });
      },

      fetchProfile: async () => {
        try {
          const profile = await authApi.getMe();
          set({ user: profile });
        } catch {
          get().logout();
        }
      },
    }),
    { name: "splitmate-auth", partialize: (s) => ({ accessToken: s.accessToken, refreshToken: s.refreshToken, user: s.user }) }
  )
);
