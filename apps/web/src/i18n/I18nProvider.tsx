import { useEffect, useMemo, useState, type PropsWithChildren } from "react";
import { SUPPORTED_LOCALES, type SupportedLocale } from "@site-de-jogos/shared";
import { I18nContext, type I18nContextValue } from "./context";
import { messages, type MessageKey } from "./messages";

const LOCALE_STORAGE_KEY = "site-de-jogos.locale";

type TranslationValues = Record<string, string | number>;

function isSupportedLocale(value: string): value is SupportedLocale {
  return SUPPORTED_LOCALES.includes(value as SupportedLocale);
}

function resolveInitialLocale() {
  if (typeof window === "undefined") {
    return "pt-BR" as SupportedLocale;
  }

  const storedLocale = window.localStorage.getItem(LOCALE_STORAGE_KEY);
  if (storedLocale && isSupportedLocale(storedLocale)) {
    return storedLocale;
  }

  const browserLocale = window.navigator.language;
  if (isSupportedLocale(browserLocale)) {
    return browserLocale;
  }

  const baseLanguage = browserLocale.split("-")[0];
  if (baseLanguage === "pt") {
    return "pt-BR";
  }

  return "en";
}

function interpolate(template: string, values?: TranslationValues) {
  if (!values) {
    return template;
  }

  return Object.entries(values).reduce((current, [key, value]) => {
    return current.replaceAll(`{${key}}`, String(value));
  }, template);
}

function translate(
  locale: SupportedLocale,
  key: MessageKey,
  values?: TranslationValues
) {
  return interpolate(messages[locale][key], values);
}

export function I18nProvider({
  children,
  initialLocale
}: PropsWithChildren<{ initialLocale?: SupportedLocale }>) {
  const [locale, setLocale] = useState<SupportedLocale>(
    initialLocale ?? resolveInitialLocale()
  );

  useEffect(() => {
    document.documentElement.lang = locale;
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
  }, [locale]);

  const value = useMemo<I18nContextValue>(() => {
    return {
      locale,
      messages: messages[locale],
      setLocale,
      t: (key, values) => translate(locale, key, values)
    };
  }, [locale]);

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}
