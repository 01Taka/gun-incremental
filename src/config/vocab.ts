import { getTranslations } from "../i18n";
import type { Translations } from "../i18n/translations";

/**
 * VOCAB オブジェクト
 * 既存の VOCAB.currency.xxx 参照との完全な後方互換性を保ちつつ、
 * 現在選択されている言語（ja / en）を動的に返します。
 */
export const VOCAB: Translations = new Proxy({} as Translations, {
  get(_target, prop: keyof Translations) {
    const current = getTranslations();
    return current[prop];
  },
});
