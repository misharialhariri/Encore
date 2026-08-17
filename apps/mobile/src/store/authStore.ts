import { create } from "zustand";
import { secureStorage, STORAGE_KEYS } from "../utils/secureStorage";

export interface AuthUser {
  id: string;
  phoneNumber: string | null;
  email: string | null;
  displayName: string | null;
  profilePhotoUrl: string | null;
  city: { id: string; nameEn: string; nameAr: string } | null;
  userType: "BUYER" | "RESELLER" | "BOTH" | null;
  isVerified: boolean;
  languagePref: string;
  biometricEnabled: boolean;
  needsProfileSetup: boolean;
}

export type AuthStatus =
  | "hydrating" // reading SecureStore, nothing rendered yet
  | "signedOut" // no session — show phone entry
  | "locked" // session exists, gated behind Face/Touch ID
  | "validating" // session exists, confirming the access token still works
  | "signedIn"; // ready — user is populated

interface AuthState {
  status: AuthStatus;
  accessToken: string | null;
  refreshToken: string | null;
  biometricEnabled: boolean;
  user: AuthUser | null;

  hydrate: () => Promise<void>;
  validateSession: (fetchMe: () => Promise<AuthUser>) => Promise<void>;
  setSession: (tokens: { accessToken: string; refreshToken: string }, user: AuthUser) => Promise<void>;
  updateUser: (user: AuthUser) => void;
  setBiometricEnabled: (enabled: boolean) => Promise<void>;
  signOut: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  status: "hydrating",
  accessToken: null,
  refreshToken: null,
  biometricEnabled: false,
  user: null,

  hydrate: async () => {
    const [accessToken, refreshToken, biometricFlag] = await Promise.all([
      secureStorage.getItem(STORAGE_KEYS.accessToken),
      secureStorage.getItem(STORAGE_KEYS.refreshToken),
      secureStorage.getItem(STORAGE_KEYS.biometricEnabled),
    ]);
    const biometricEnabled = biometricFlag === "true";

    if (!accessToken || !refreshToken) {
      set({ status: "signedOut", biometricEnabled });
      return;
    }

    set({
      accessToken,
      refreshToken,
      biometricEnabled,
      status: biometricEnabled ? "locked" : "validating",
    });
  },

  validateSession: async (fetchMe) => {
    try {
      const user = await fetchMe();
      set({ user, status: "signedIn" });
    } catch {
      await get().signOut();
    }
  },

  setSession: async (tokens, user) => {
    await Promise.all([
      secureStorage.setItem(STORAGE_KEYS.accessToken, tokens.accessToken),
      secureStorage.setItem(STORAGE_KEYS.refreshToken, tokens.refreshToken),
    ]);
    set({ accessToken: tokens.accessToken, refreshToken: tokens.refreshToken, user, status: "signedIn" });
  },

  updateUser: (user) => set({ user }),

  setBiometricEnabled: async (enabled) => {
    await secureStorage.setItem(STORAGE_KEYS.biometricEnabled, enabled ? "true" : "false");
    set({ biometricEnabled: enabled });
  },

  signOut: async () => {
    await Promise.all([
      secureStorage.removeItem(STORAGE_KEYS.accessToken),
      secureStorage.removeItem(STORAGE_KEYS.refreshToken),
    ]);
    set({ accessToken: null, refreshToken: null, user: null, status: "signedOut" });
  },
}));
