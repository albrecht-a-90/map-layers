import { useCallback, useEffect } from 'react';
import { createVedro } from 'vedro';
import { dictionaries, type MessageKey } from './dictionaries';
import { isLocale, type Locale } from './locale';

const STORAGE_KEY = 'locale';

function detectLocale(): Locale {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (isLocale(saved)) return saved;
  } catch {
    // storage unavailable (private mode) — fall through
  }
  const language = navigator.language.toLowerCase().slice(0, 2);
  return isLocale(language) ? language : 'en';
}

export function saveLocale(locale: Locale): void {
  try {
    localStorage.setItem(STORAGE_KEY, locale);
  } catch {
    // not critical
  }
}

/** Separate store: switching language doesn't touch the layers store. */
export const {
  Provider: LocaleProvider,
  useSelector: useLocaleSelector,
  useDispatch: useLocaleDispatch,
} = createVedro<{ locale: Locale }>({ locale: detectLocale() });

export type TranslateParams = Readonly<Record<string, string | number>>;
export type Translate = (key: MessageKey, params?: TranslateParams) => string;

export function translate(locale: Locale, key: MessageKey, params?: TranslateParams): string {
  const template = dictionaries[locale][key];
  return params
    ? template.replace(/\{(\w+)\}/g, (match, name: string) => String(params[name] ?? match))
    : template;
}

export function useLocale(): Locale {
  return useLocaleSelector((s) => s.locale);
}

export function useT(): Translate {
  const locale = useLocale();
  return useCallback<Translate>((key, params) => translate(locale, key, params), [locale]);
}

/** Keeps `<html lang>` in sync with the UI language — screen readers pick the voice from it. */
export function useDocumentLang(): void {
  const locale = useLocale();
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
}
