import { create } from "zustand";
import * as SecureStore from "expo-secure-store";
import { authApi } from "@/lib/api";

interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  phone: string | null;
  currency: string;
}

interface AuthState {
  user: Profile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, fullName: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchProfile: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  isLoading: false,
  isAuthenticated: false,

  checkAuth: async () => {
    const token = await SecureStore.getItemAsync("access_token");
    if (token) {
      try {
        const profile = await authApi.getMe();
        set({ user: profile, isAuthenticated: true });
      } catch {
        set({ isAuthenticated: false });
      }
    }
  },

  login: async (email, password) => {
    set({ isLoading: true });
    try {
      const tokens = await authApi.login({ email, password });
      await SecureStore.setItemAsync("access_token", tokens.access_token);
      await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
      await get().fetchProfile();
      set({ isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  register: async (email, password, fullName) => {
    set({ isLoading: true });
    try {
      const tokens = await authApi.register({ email, password, full_name: fullName });
      await SecureStore.setItemAsync("access_token", tokens.access_token);
      await SecureStore.setItemAsync("refresh_token", tokens.refresh_token);
      await get().fetchProfile();
      set({ isAuthenticated: true });
    } finally {
      set({ isLoading: false });
    }
  },

  logout: async () => {
    await SecureStore.deleteItemAsync("access_token");
    await SecureStore.deleteItemAsync("refresh_token");
    set({ user: null, isAuthenticated: false });
  },

  fetchProfile: async () => {
    const profile = await authApi.getMe();
    set({ user: profile });
  },
}));
