import { createContext } from "react";
import type { SupportedLocale } from "@site-de-jogos/shared";
import type { MessageCatalog, MessageKey } from "./messages";

type TranslationValues = Record<string, string | number>;

export type I18nContextValue = {
  locale: SupportedLocale;
  messages: MessageCatalog;
  setLocale: (locale: SupportedLocale) => void;
  t: (key: MessageKey, values?: TranslationValues) => string;
};

export const I18nContext = createContext<I18nContextValue | null>(null);
