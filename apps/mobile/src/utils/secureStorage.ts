import * as SecureStore from "expo-secure-store";

// Thin typed wrapper — every credential (JWTs, biometric opt-in flag) goes
// through here so there's one place that talks to the OS keychain/keystore.
export const secureStorage = {
  async getItem(key: string): Promise<string | null> {
    return SecureStore.getItemAsync(key);
  },
  async setItem(key: string, value: string): Promise<void> {
    await SecureStore.setItemAsync(key, value);
  },
  async removeItem(key: string): Promise<void> {
    await SecureStore.deleteItemAsync(key);
  },
};

export const STORAGE_KEYS = {
  accessToken: "encore.accessToken",
  refreshToken: "encore.refreshToken",
  biometricEnabled: "encore.biometricEnabled",
  language: "encore.language",
} as const;
