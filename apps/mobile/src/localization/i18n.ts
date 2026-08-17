import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import * as Localization from "expo-localization";
import { I18nManager } from "react-native";
import en from "./locales/en.json";
import ar from "./locales/ar.json";

export const SUPPORTED_LANGUAGES = ["ar", "en"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

function detectDeviceLanguage(): SupportedLanguage {
  const tag = Localization.getLocales()[0]?.languageCode;
  return tag === "en" ? "en" : "ar"; // Saudi market defaults to Arabic.
}

export function isRTL(language: SupportedLanguage): boolean {
  return language === "ar";
}

/**
 * Applies I18nManager RTL state for the given language. React Native only
 * fully repaints layout direction after a reload, so callers that switch
 * languages post-launch (Settings → Language) must follow this with an app
 * reload — see LanguageToggle in the profile screen for Phase 1's approach.
 */
export function applyLayoutDirection(language: SupportedLanguage) {
  const shouldBeRTL = isRTL(language);
  if (I18nManager.isRTL !== shouldBeRTL) {
    I18nManager.allowRTL(shouldBeRTL);
    I18nManager.forceRTL(shouldBeRTL);
  }
}

export function initI18n(initialLanguage?: SupportedLanguage) {
  const language = initialLanguage ?? detectDeviceLanguage();

  if (!i18n.isInitialized) {
    i18n.use(initReactI18next).init({
      resources: { en: { translation: en }, ar: { translation: ar } },
      lng: language,
      fallbackLng: "ar",
      interpolation: { escapeValue: false },
      compatibilityJSON: "v4",
    });
  }

  applyLayoutDirection(language);
  return i18n;
}

export default i18n;
