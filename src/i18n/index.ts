import { create } from "zustand";
import { persist } from "zustand/middleware";

import { type Locale, type Translations, translations } from "./translations";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

export const useI18n = create<I18nState>()(
  persist(
    (set) => ({
      locale: "ja",
      setLocale: (locale: Locale) => set({ locale }),
      toggleLocale: () =>
        set((state) => ({
          locale: state.locale === "ja" ? "en" : "ja",
        })),
    }),
    {
      name: "game-language-storage",
    },
  ),
);

/**
 * 現在のロケールに応じた翻訳オブジェクト（VOCAB）を取得
 */
export function getTranslations(locale?: Locale): Translations {
  const currentLocale = locale ?? useI18n.getState().locale;
  return translations[currentLocale] ?? translations.ja;
}

/**
 * 簡易アクセサー（ヘルパー関数）
 */
export function t(): Translations {
  return getTranslations();
}
