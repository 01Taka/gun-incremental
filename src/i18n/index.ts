import { create } from "zustand";
import { createJSONStorage, persist, type StateStorage } from "zustand/middleware";

import { type Locale, type Translations, translations } from "./translations";

interface I18nState {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  toggleLocale: () => void;
}

const memoryStorageMap = new Map<string, string>();
const safeStateStorage: StateStorage = {
  getItem: (name: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      return window.localStorage.getItem(name);
    }
    return memoryStorageMap.get(name) ?? null;
  },
  setItem: (name: string, value: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.setItem(name, value);
      return;
    }
    memoryStorageMap.set(name, value);
  },
  removeItem: (name: string) => {
    if (typeof window !== "undefined" && window.localStorage) {
      window.localStorage.removeItem(name);
      return;
    }
    memoryStorageMap.delete(name);
  },
};

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
      storage: createJSONStorage(() => safeStateStorage),
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
