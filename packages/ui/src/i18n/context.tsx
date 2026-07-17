/* ═══════════════════════════════════════════════════════════════
   I18n Context, Provider & Hook
   ═══════════════════════════════════════════════════════════════ */

"use client";

import * as React from "react";
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import type { TranslationDict, SupportedLocale } from "./types";

/* ── Context value ── */
interface I18nContextValue {
  locale: SupportedLocale;
  setLocale: (locale: SupportedLocale) => void;
  t: TFunction;
}

type TFunction = (key: string) => string;

const I18nContext = createContext<I18nContextValue | null>(null);

/* ── Storage key ── */
const STORAGE_KEY = "glassos-locale";
const DEFAULT_LOCALE: SupportedLocale = "tr";

/* ── Props ── */
interface I18nProviderProps {
  dictionaries: Record<SupportedLocale, TranslationDict>;
  defaultLocale?: SupportedLocale;
  children: React.ReactNode;
}

/* ── Provider ── */
function I18nProvider({
  dictionaries,
  defaultLocale = DEFAULT_LOCALE,
  children,
}: I18nProviderProps) {
  const [locale, setLocaleState] = useState<SupportedLocale>(defaultLocale);
  const [hydrated, setHydrated] = useState(false);

  /* Hydrate from localStorage on mount */
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "tr" || stored === "en") {
        setLocaleState(stored);
      }
    } catch {
      /* localStorage may be unavailable */
    }
    setHydrated(true);
  }, []);

  const setLocale = useCallback((newLocale: SupportedLocale) => {
    setLocaleState(newLocale);
    try {
      localStorage.setItem(STORAGE_KEY, newLocale);
    } catch {
      /* ignore */
    }
  }, []);

  /* The t() function – walks the dictionary using dot-separated keys */
  const t: TFunction = useCallback(
    (key: string): string => {
      const dict = dictionaries[locale];
      if (!dict) return key;

      const parts = key.split(".");
      let value: any = dict;
      for (const part of parts) {
        if (value && typeof value === "object" && part in value) {
          value = value[part];
        } else {
          return key; // fallback to key if not found
        }
      }
      return typeof value === "string" ? value : key;
    },
    [dictionaries, locale],
  );

  const contextValue = useMemo(
    () => ({ locale, setLocale, t }),
    [locale, setLocale, t],
  );

  return (
    <I18nContext.Provider value={contextValue}>
      {hydrated && <HtmlLangSetter locale={locale} />}
      {children}
    </I18nContext.Provider>
  );
}

/* ── HTML lang setter (avoids hydration mismatch) ── */
function HtmlLangSetter({ locale }: { locale: SupportedLocale }) {
  useEffect(() => {
    document.documentElement.lang = locale === "tr" ? "tr" : "en";
  }, [locale]);
  return null;
}

/* ── Hook ── */
function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within an I18nProvider");
  }
  return ctx;
}

export { I18nProvider, useI18n };
export type { I18nContextValue };
